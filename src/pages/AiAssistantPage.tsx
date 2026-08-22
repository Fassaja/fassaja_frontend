import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Check, RotateCcw, FileText, Upload, Info, RefreshCw, HelpCircle, Lightbulb, Loader2, Send, X } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Tooltip } from '@/components/common/Tooltip';
import { Textarea } from '@/components/common/Textarea';
import { Dropdown } from '@/components/common/Dropdown';
import { Mascot } from '@/components/mascot/Mascot';
import { DicasDePrompt } from '@/components/ai/DicasDePrompt';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { DatePicker } from '@/components/common/DatePicker';
import { Modal } from '@/components/common/Modal';
import { AiHowToModal } from '@/components/ai/AiHowToModal';
import { useCelebration } from '@/contexts/CelebrationContext';
import { aiService, AiStatus, DraftMode, DraftTag } from '@/services/aiService';
import { teamsService } from '@/services/teamsService';
import { TeamSummary, TeamMember } from '@/types/team';
import { useProjects } from '@/contexts/ProjectsContext';
import { useTasks } from '@/contexts/TasksContext';
import { tint, chipText } from '@/utils/color';

/**
 * O que a IA está fazendo, em português.
 *
 * Serve para a espera não ser um vazio: quem lê "montando os cards" entende o
 * que vem a seguir e por que demora. Também ensina o modelo mental da
 * ferramenta — ela LÊ, depois RECORTA, depois PROPÕE, e nada é criado antes de
 * você aprovar.
 */
const PASSOS_DA_GERACAO = [
  'Lendo o documento',
  'Encontrando as etapas do trabalho',
  'Montando os cards e os prazos',
];

/**
 * Quanto cada passo fica em destaque.
 *
 * A API responde de uma vez só, sem avisar em que ponto está — então isto é
 * ILUSTRATIVO, e é assim de propósito: o último passo NUNCA se marca como
 * concluído sozinho. Ele fica girando até a resposta chegar de verdade, para a
 * tela não afirmar um progresso que ninguém mediu.
 */
const MS_POR_PASSO = 2500;

/**
 * Tela do Assistente de IA.
 *
 * Fluxo:
 *   1. Usuário cola/importa um documento + escreve um comando.
 *   2. "Gerar rascunho" → POST /ai/draft (rascunho; nada é salvo).
 *   3. Usuário revisa/edita os cards propostos.
 *   4. "Aprovar e criar" → POST /ai/apply, que cria o projeto e os cards
 *      de verdade (reusando ProjectsService + TasksService no back-end).
 *
 * Obs.: nesta fase, /ai/draft ainda devolve um rascunho fake (sem custo). A
 * troca pela IA real (Claude) acontece só no back-end, sem mexer nesta tela.
 */

type DraftPriority = 'low' | 'medium' | 'high';

interface DraftCard {
  id: string;
  title: string;
  description: string;
  priority: DraftPriority;
  dueDate: string; // 'YYYY-MM-DD' ou ''
  assigneeId: string; // id do membro responsável, ou ''
  // Tags existentes do usuário que a IA marcou como pertinentes. Editáveis
  // (dá para remover uma no card) — só entram no apply as que sobrarem.
  tags: DraftTag[];
}

interface ProjectDraft {
  name: string;
  description: string;
  color: string;
  cards: DraftCard[];
  generatedBy: 'ai' | 'demo';
  demoReason?: 'no-key' | 'ai-error';
  teamId: string; // '' = projeto individual (sem equipe) — só p/ projeto novo
  targetProjectId: string; // '' = criar novo; senão, adicionar a este projeto
}

const priorityLabel: Record<DraftPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

const priorityVariant: Record<DraftPriority, 'default' | 'warning' | 'danger'> = {
  low: 'default',
  medium: 'warning',
  high: 'danger',
};

const priorityOrder: Record<DraftPriority, number> = { high: 0, medium: 1, low: 2 };

const PALETTE = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

// Mesmo limite validado no back-end (DraftRequestDto).
const MAX_DOC_CHARS = 50000;

const uid = () => Math.random().toString(36).slice(2, 9);

const AiAssistantPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, refresh: refreshProjects } = useProjects();
  const { refresh: refreshTasks } = useTasks();
  const { celebrate } = useCelebration();
  const [documentText, setDocumentText] = useState('');
  const [command, setCommand] = useState('');
  const [mode, setMode] = useState<DraftMode>('structure');
  // Gaveta do documento: recolhida por padrão para o balão ser a primeira
  // coisa que se vê. Abre sozinha ao arrastar um arquivo.
  const [docAberto, setDocAberto] = useState(false);
  // Qual passo está em destaque durante a geração.
  const [passo, setPasso] = useState(0);
  // Ponteiro sobre o balão (ou sobre a própria dica logo acima dele).
  const [pertoDoBalao, setPertoDoBalao] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  // Sugestões de melhoria (modo "improve"): a pessoa escolhe quais viram cards.
  const [suggestions, setSuggestions] = useState<DraftCard[]>([]);
  // Ids de sugestões já adicionadas (ficam marcadas, não somem).
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);
  const [success, setSuccess] = useState<{ name: string; count: number } | null>(null);

  // Mostra o tutorial automaticamente na primeira visita.
  useEffect(() => {
    try {
      if (!localStorage.getItem('fassaja_ai_tour_seen')) {
        setShowHowTo(true);
        localStorage.setItem('fassaja_ai_tour_seen', '1');
      }
    } catch {
      /* localStorage indisponível: ignora */
    }
  }, []);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aiEnabled = status?.aiEnabled ?? null;

  // Status da IA (ativa? usos restantes) ao abrir a tela.
  useEffect(() => {
    aiService
      .status()
      .then(setStatus)
      .catch(() => setStatus(null));
    teamsService
      .listTeams()
      .then(setTeams)
      .catch(() => setTeams([]));
  }, []);

  // Troca o time do projeto: busca os membros e limpa responsáveis antigos.
  const handleSelectTeam = async (teamId: string) => {
    setDraft((d) => (d ? { ...d, teamId, cards: d.cards.map((c) => ({ ...c, assigneeId: '' })) } : d));
    if (!teamId) {
      setMembers([]);
      return;
    }
    try {
      setMembers(await teamsService.getMembers(teamId));
    } catch {
      setMembers([]);
    }
  };

  // Escolhe o destino: '' = novo projeto; senão, um projeto existente.
  const handleSelectProject = async (projectId: string) => {
    setDraft((d) =>
      d ? { ...d, targetProjectId: projectId, cards: d.cards.map((c) => ({ ...c, assigneeId: '' })) } : d,
    );
    const proj = projects.find((p) => p.id === projectId);
    if (projectId && proj?.type === 'team' && proj.teamId) {
      try {
        setMembers(await teamsService.getMembers(proj.teamId));
      } catch {
        setMembers([]);
      }
    } else {
      setMembers([]);
    }
  };

  // Sem usos restantes (só no modo IA real) bloqueia a geração.
  const outOfUses = !!status?.aiEnabled && status.remaining <= 0;
  const overLimit = documentText.length > MAX_DOC_CHARS;
  const canGenerate =
    documentText.trim().length > 0 && !generating && !extracting && !outOfUses && !overLimit;

  // Há equipe ativa? (projeto novo com time, ou projeto existente do tipo equipe)
  const selectedProject = draft?.targetProjectId
    ? projects.find((p) => p.id === draft.targetProjectId)
    : undefined;
  const teamActive = draft
    ? draft.targetProjectId
      ? selectedProject?.type === 'team'
      : !!draft.teamId
    : false;

  const handlePickFile = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  // Lê um arquivo (PDF/DOCX/TXT/MD) e joga o texto no campo do documento.
  const processFile = async (file: File) => {
    setExtracting(true);
    setImportError(null);
    try {
      // Carrega o extrator (e o pesado pdfjs) só na hora de importar.
      const { extractFileText } = await import('@/utils/extractFileText');
      const text = await extractFileText(file);
      if (!text.trim()) {
        setFileName(null);
        setImportError(
          'O arquivo foi lido, mas não encontrei texto. ' +
            'Se for um PDF digitalizado (imagem), o conteúdo não pode ser extraído automaticamente.',
        );
        return;
      }
      setDocumentText(text);
      setFileName(file.name);
    } catch (err) {
      setFileName(null);
      if (err instanceof Error && err.name === 'UnsupportedFileError') {
        setImportError(err.message);
      } else {
        // O erro real ia para o lixo, deixando "não consegui ler" como única
        // pista — insuficiente para distinguir PDF corrompido de falha ao
        // carregar o worker do PDF.js. Registrar no console é o que permite
        // diagnosticar sem adivinhação.
        console.error('[Fassaja] Falha ao importar arquivo:', file.name, err);
        const detail = err instanceof Error ? err.message : String(err);
        setImportError(
          `Não consegui ler este arquivo. Tente colar o conteúdo manualmente. (${detail})`,
        );
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Permite reimportar o mesmo arquivo depois (reseta o input).
    e.target.value = '';
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Abre a gaveta junto: soltar um arquivo e não ver nada acontecer
      // parece que o arraste falhou.
      setDocAberto(true);
      processFile(file);
    }
  };

  useEffect(() => {
    if (!generating) {
      setPasso(0);
      return;
    }
    const id = setInterval(() => {
      // Trava no último: daí em diante quem manda é a resposta, não o relógio.
      setPasso(pp => Math.min(pp + 1, PASSOS_DA_GERACAO.length - 1));
    }, MS_POR_PASSO);
    return () => clearInterval(id);
  }, [generating]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    setApplyError(null);
    try {
      const result = await aiService.draft(documentText, command || undefined, mode);
      // O back-end devolve cards sem id; adicionamos um id local para edição.
      const mapped: DraftCard[] = result.cards.map((c) => ({
        id: uid(),
        title: c.title,
        description: c.description ?? '',
        priority: c.priority,
        // Prazo sugerido pela IA ('YYYY-MM-DD'); vazio quando ela não sugeriu.
        dueDate: c.dueDate ?? '',
        assigneeId: '',
        tags: c.tags ?? [],
      }));
      const improve = mode === 'improve';
      setDraft({
        name: result.name,
        description: result.description,
        color: result.color,
        generatedBy: result.generatedBy,
        demoReason: result.demoReason,
        teamId: '',
        targetProjectId: '',
        // No modo melhoria, os cards começam vazios — a pessoa adiciona as sugestões.
        cards: improve ? [] : mapped,
      });
      setSuggestions(improve ? mapped : []);
      setAddedIds([]);
      setMembers([]);
      // Atualiza os usos restantes (o uso da IA foi consumido).
      aiService.status().then(setStatus).catch(() => {});
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : 'Não foi possível gerar o rascunho.',
      );
    } finally {
      setGenerating(false);
    }
  };

  const updateCard = (id: string, patch: Partial<DraftCard>) => {
    setDraft((d) =>
      d ? { ...d, cards: d.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) } : d,
    );
  };

  const removeCard = (id: string) => {
    setDraft((d) => (d ? { ...d, cards: d.cards.filter((c) => c.id !== id) } : d));
  };

  // Adiciona a sugestão aos cards e a marca como "adicionada" (continua visível).
  const addSuggestion = (id: string) => {
    if (addedIds.includes(id)) return;
    const s = suggestions.find((x) => x.id === id);
    if (!s) return;
    setDraft((d) => (d ? { ...d, cards: [...d.cards, s] } : d));
    setAddedIds((prev) => [...prev, id]);
  };

  const addAllSuggestions = () => {
    const toAdd = suggestions.filter((s) => !addedIds.includes(s.id));
    if (toAdd.length === 0) return;
    setDraft((d) => (d ? { ...d, cards: [...d.cards, ...toAdd] } : d));
    setAddedIds((prev) => [...prev, ...toAdd.map((s) => s.id)]);
  };

  // Descartar tira o balão da lista (com animação de saída).
  const dismissSuggestion = (id: string) => {
    setSuggestions((prev) => prev.filter((x) => x.id !== id));
    setAddedIds((prev) => prev.filter((x) => x !== id));
  };

  const addCard = () => {
    setDraft((d) =>
      d
        ? {
            ...d,
            cards: [
              ...d.cards,
              { id: uid(), title: '', description: '', priority: 'medium', dueDate: '', assigneeId: '', tags: [] },
            ],
          }
        : d,
    );
  };

  const handleApprove = async () => {
    if (!draft) return;
    setApplying(true);
    setApplyError(null);
    try {
      const cards = draft.cards.map((c) => ({
        title: c.title,
        description: c.description || undefined,
        priority: c.priority,
        dueDate: c.dueDate || undefined,
        assigneeId: c.assigneeId || undefined,
        tagIds: c.tags.length ? c.tags.map((t) => t.id) : undefined,
      }));
      const result = await aiService.apply(
        draft.targetProjectId
          ? { projectId: draft.targetProjectId, cards }
          : {
              name: draft.name,
              color: draft.color,
              description: draft.description || undefined,
              teamId: draft.teamId || undefined,
              cards,
            },
      );
      // Atualiza as listas para o projeto/cards recém-criados aparecerem.
      await Promise.all([refreshProjects(), refreshTasks()]);
      setDraft(null);
      setDocumentText('');
      setCommand('');
      setFileName(null);
      setMembers([]);
      // Popup de sucesso + confete. A navegação acontece quando o usuário decide.
      setSuccess({ name: result.project.name, count: result.createdCount });
      celebrate('Projeto criado com sucesso!', 'goal');
    } catch (err) {
      setApplyError(
        err instanceof Error ? err.message : 'Não foi possível criar o projeto.',
      );
    } finally {
      setApplying(false);
    }
  };

  const reset = () => {
    setDraft(null);
    setSuggestions([]);
    setAddedIds([]);
    setApplyError(null);
  };

  return (
    <AppLayout
      title="Assistente de IA"
      subtitle="Rascunhos de projeto a partir de um documento"
    >
      {/*
        Aqui havia um banner de degradê com o mascote flutuando e a manchete
        "Transforme documentos em projetos". Três problemas, e o terceiro é o
        que decidiu a remoção:

        1. Vendia o que a pessoa já comprou — ela clicou em "Assistente de IA"
           no menu para chegar aqui.
        2. Repetia o subtítulo da página e o próprio corpo do banner: a mesma
           frase dita três vezes, empilhada.
        3. Empurrava a ferramenta para baixo da dobra num notebook. Cento e
           poucos pixels do espaço mais valioso da tela ocupados por adjetivo.

        No lugar entra a barra abaixo: mesma altura, carregando o número que
        realmente muda uma decisão — quantos usos sobraram — que antes vivia
        como texto cinza no rodapé da coluna da esquerda, onde só era visto
        depois de gastar um.
      */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2 text-sm">
          {aiEnabled === false ? (
            <span className="inline-flex items-center gap-1.5 text-text-secondary">
              <Info size={15} className="shrink-0" />
              Modo demonstração — a IA real está desativada.
            </span>
          ) : status ? (
            <span className="text-text-secondary">
              <strong
                className={`font-semibold tabular-nums ${
                  status.remaining === 0 ? 'text-danger' : 'text-text-primary'
                }`}
              >
                {status.remaining} de {status.limit}
              </strong>{' '}
              usos disponíveis esta semana
            </span>
          ) : (
            <span className="text-text-soft">Carregando usos disponíveis…</span>
          )}
        </div>

        <Tooltip content="Como usar o Assistente" description="Tour rápido, cerca de 1 minuto.">
          <Button
            variant="ghost"
            size="sm"
            icon={<HelpCircle size={16} />}
            onClick={() => setShowHowTo(true)}
            aria-label="Como usar o Assistente de IA"
            className="shrink-0"
          >
            <span className="hidden sm:inline">Como usar</span>
          </Button>
        </Tooltip>
      </div>

      {/*
        A tela é uma conversa, não uma página: o composer fica ancorado embaixo
        e o resultado ocupa o espaço de cima.

        A altura é travada e quem rola é a FAIXA DE CIMA, por dentro. Antes o
        rascunho nascia abaixo do formulário e a pessoa tinha de rolar a página
        inteira para ver o que acabou de pedir — o resultado do trabalho ficava
        fora da tela justo no momento em que mais importa.

        Só em lg+: em tela pequena, altura fixa briga com o teclado virtual, que
        come metade da janela e espremeria tudo. Ali o fluxo natural é melhor.
      */}
      <div className="flex flex-col gap-4 lg:h-[calc(100dvh-14rem)] lg:min-h-0">
        {/* FAIXA DE CIMA — o que a IA tem a dizer. Rola por dentro. */}
        <div className="flex-1 lg:min-h-0 lg:overflow-y-auto">
          <AnimatePresence mode="wait">
            {generating ? (
              <motion.div
                key="gerando"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex h-full flex-col items-center justify-center gap-5 py-6 text-center"
              >
                <Mascot state="investigate" size="lg" animate />
                <div className="w-full max-w-sm space-y-2 text-left">
                  {PASSOS_DA_GERACAO.map((texto, i) => (
                    <div
                      key={texto}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                        i === passo
                          ? 'bg-primary-light/50 text-primary-vibrant font-semibold'
                          : i < passo
                          ? 'text-text-secondary'
                          : 'text-text-soft'
                      }`}
                    >
                      {i < passo && <Check size={15} className="shrink-0 text-emerald-500" />}
                      {i === passo && <Loader2 size={15} className="shrink-0 animate-spin" />}
                      {i > passo && <span className="w-[15px] shrink-0 text-center">·</span>}
                      <span>{texto}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-text-soft">
                  Leva alguns segundos. Nada é criado ainda.
                </p>
              </motion.div>
            ) : !draft ? (
              <motion.div
                key="parado"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex h-full flex-col items-center justify-center gap-4"
              >
              <div className="flex flex-col items-center text-center gap-2 pt-2">
                <Mascot state="confused" size="lg" animate />
                <div>
                  <h2 className="text-lg font-bold text-text-primary">O que vamos montar?</h2>
                  <p className="text-sm text-text-secondary">
                    Me dê um documento e diga o que fazer com ele.
                  </p>
                </div>
              </div>

              </motion.div>
            ) : (
              <motion.div
                key="draft"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                {/* Cabeçalho do rascunho: seção, não Card.
                    Emoldurar isto dava ao painel de controle o mesmo peso
                    visual dos cards propostos — e são eles o conteúdo. Com a
                    moldura fora, a hierarquia passa a vir do tamanho do texto
                    e do espaço, que é de onde ela deveria vir. */}
                <div className="flex flex-col gap-3">
                  {/* A IA falhou: o rascunho é genérico, MAS o uso não foi
                      cobrado — deixamos isso explícito para a pessoa não achar
                      que gastou uma das 5 gerações da semana à toa. */}
                  {draft.generatedBy === 'demo' && draft.demoReason === 'ai-error' && (
                    <div className="flex items-start gap-2 rounded-lg border border-yellow-200 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/10 px-3 py-2 text-sm text-yellow-800 dark:text-yellow-300">
                      <Info size={16} className="mt-0.5 shrink-0" />
                      <span>
                        <strong>A IA não respondeu desta vez.</strong> Montamos um rascunho
                        genérico para você não perder o trabalho. Este uso <strong>não</strong> foi
                        descontado — pode clicar em "Gerar de novo".
                      </span>
                    </div>
                  )}
                  {/* flex-wrap: em tela estreita "Demonstração (genérico)" +
                      "Gerar de novo" + "Descartar" não cabem numa linha só. */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {draft.generatedBy === 'ai' ? (
                      <Badge variant="info">Rascunho · gerado por IA</Badge>
                    ) : (
                      <Badge variant="warning">Rascunho · exemplo genérico</Badge>
                    )}
                    <div className="flex items-center gap-3">
                      {/* Quando `canGenerate` é falso o botão desabilita e
                          antes não dizia por quê — a dica agora responde. */}
                      <Tooltip
                        content={canGenerate ? 'Gerar de novo' : 'Sem usos disponíveis'}
                        description={
                          canGenerate
                            ? 'Refaz o rascunho com o mesmo documento. Consome 1 uso.'
                            : 'Você já usou todas as gerações do período.'
                        }
                      >
                        <button
                          onClick={handleGenerate}
                          disabled={!canGenerate}
                          className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary-vibrant transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <RefreshCw size={14} /> Gerar de novo
                        </button>
                      </Tooltip>
                      <button
                        onClick={reset}
                        className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <RotateCcw size={14} /> Descartar
                      </button>
                    </div>
                  </div>

                  <Select
                    label="Destino"
                    value={draft.targetProjectId}
                    onChange={handleSelectProject}
                    options={[
                      { value: '', label: 'Criar um projeto novo' },
                      ...projects.map((p) => ({ value: p.id, label: p.name })),
                    ]}
                  />

                  {!draft.targetProjectId && (
                    <>
                      <Input
                        label="Nome do projeto"
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      />

                      <Textarea
                        label="Descrição"
                        rows={2}
                        value={draft.description}
                        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      />

                      {/* flex-wrap + shrink-0: sem isso, em tela estreita o flex
                          achata os círculos e eles viram elipses. */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">Cor:</span>
                        {PALETTE.map((c) => (
                          <button
                            key={c}
                            onClick={() => setDraft({ ...draft, color: c })}
                            className={`w-6 h-6 shrink-0 rounded-full border-2 transition-transform ${
                              draft.color === c ? 'border-text-primary scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: c }}
                            aria-label={`Cor ${c}`}
                          />
                        ))}
                      </div>

                      <Select
                        label="Equipe (opcional)"
                        value={draft.teamId}
                        onChange={handleSelectTeam}
                        placeholder="Sem equipe (projeto individual)"
                        options={[
                          { value: '', label: 'Sem equipe (projeto individual)' },
                          ...teams.map((t) => ({ value: t.id, label: t.name })),
                        ]}
                        helperText={
                          draft.teamId
                            ? 'Você poderá definir um responsável em cada card.'
                            : 'Escolha uma equipe para poder atribuir responsáveis aos cards.'
                        }
                      />
                    </>
                  )}

                  {draft.targetProjectId && (
                    <p className="text-xs text-text-secondary">
                      Os cards serão adicionados ao projeto selecionado.
                      {selectedProject?.type === 'team'
                        ? ' Você pode definir um responsável em cada card.'
                        : ''}
                    </p>
                  )}
                </div>

                {/* Sugestões + cards lado a lado (em telas largas) quando há sugestões */}
                <div className={`grid items-start gap-4 ${suggestions.length > 0 ? '2xl:grid-cols-5' : 'grid-cols-1'}`}>
                {/* Sugestões de melhoria (balões) — modo "Analisar melhorias" */}
                {suggestions.length > 0 && (
                  <section className="flex flex-col gap-3 2xl:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lightbulb size={18} className="text-text-secondary" />
                        <h3 className="font-semibold text-text-primary">Sugestões de melhoria</h3>
                      </div>
                      <button
                        onClick={addAllSuggestions}
                        className="text-xs font-medium text-primary-vibrant hover:underline"
                      >
                        Adicionar todas
                      </button>
                    </div>
                    <p className="-mt-1 text-xs text-text-secondary">
                      Toque em <Plus size={11} className="inline" /> para transformar em card.
                    </p>
                    <div className="flex flex-col gap-3">
                      <AnimatePresence>
                      {[...suggestions]
                        .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
                        .map((s) => {
                          const added = addedIds.includes(s.id);
                          return (
                            <motion.div
                              key={s.id}
                              layout
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: 60, scale: 0.85 }}
                              transition={{ duration: 0.2 }}
                              className={`relative flex items-start gap-2 rounded-2xl rounded-bl-sm border px-3 py-2 shadow-sm transition-colors ${
                                added ? 'border-green-200 dark:border-green-500/30 bg-green-50/60 dark:bg-green-500/10' : 'border-border bg-surface'
                              }`}
                            >
                              <span
                                className={`absolute -bottom-1 left-4 h-3 w-3 rotate-45 border-b border-r ${
                                  added ? 'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10' : 'border-border bg-surface'
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary">{s.title}</p>
                                {s.description && (
                                  <p className="mt-0.5 text-xs text-text-secondary">{s.description}</p>
                                )}
                                <div className="mt-1.5 flex items-center gap-1.5">
                                  <Badge variant={priorityVariant[s.priority]}>
                                    {priorityLabel[s.priority]}
                                  </Badge>
                                  {added && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-300">
                                      <Check size={12} /> Adicionado
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 shrink-0">
                                {added ? (
                                  <Tooltip
                                    content="Já adicionado"
                                    description="Esta sugestão já virou um card abaixo."
                                  >
                                    <span
                                      aria-label="Já adicionado"
                                      className="rounded-md bg-green-100 dark:bg-green-500/15 p-1 text-green-600 dark:text-green-300"
                                    >
                                      <Check size={14} />
                                    </span>
                                  </Tooltip>
                                ) : (
                                  <Tooltip
                                    content="Adicionar aos cards"
                                    description="Move esta sugestão para a lista de cards do projeto."
                                  >
                                    <button
                                      onClick={() => addSuggestion(s.id)}
                                      aria-label="Adicionar aos cards"
                                      className="rounded-md bg-primary-vibrant p-1 text-white transition-colors hover:bg-primary-hover"
                                    >
                                      <Plus size={14} />
                                    </button>
                                  </Tooltip>
                                )}
                                <Tooltip
                                  content="Descartar sugestão"
                                  description="Remove da lista. Não consome uso da IA."
                                >
                                  <button
                                    onClick={() => dismissSuggestion(s.id)}
                                    aria-label="Descartar sugestão"
                                    className="rounded-md p-1 text-text-soft transition-colors hover:text-danger"
                                  >
                                    <X size={14} />
                                  </button>
                                </Tooltip>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </section>
                )}

                {/* Cards (estrutura base, sempre à direita) */}
                <div className="flex flex-col gap-3 min-w-0 2xl:col-span-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-text-primary">
                    Cards ({draft.cards.length})
                  </h3>
                  <Button variant="ghost" size="sm" icon={<Plus size={16} />} onClick={addCard}>
                    Adicionar
                  </Button>
                </div>

                <motion.div
                  className="flex flex-col gap-3"
                  initial="hidden"
                  animate="shown"
                  variants={{ shown: { transition: { staggerChildren: 0.04 } } }}
                >
                  {draft.cards.length === 0 && (
                    <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-text-secondary">
                      Nenhum card ainda. Adicione as sugestões acima ou crie um card manualmente.
                    </p>
                  )}
                  {/* Não dá para usar o AnimatedList aqui: ele nasce com
                      `initial={false}` — de propósito, para uma lista de
                      tarefas não animar inteira a cada carga de página —, e é
                      exatamente a entrada que interessa neste caso. Mas as
                      duas lições dele valem e estão aplicadas abaixo. */}
                  <AnimatePresence mode="popLayout" initial={false}>
                  {draft.cards.map((card) => (
                    <motion.div
                      key={card.id}
                      /* `layout="position"`, não `layout`: o layout completo
                         interpola também a ALTURA, e o texto do card aparece
                         esticado por alguns quadros. Mesma razão registrada em
                         common/AnimatedList. */
                      layout="position"
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        shown: { opacity: 1, y: 0 },
                      }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    >
                    <Card padding="sm" className="flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <input
                          className="flex-1 font-medium text-text-primary bg-transparent border-b border-transparent focus:border-border focus:outline-none py-1"
                          value={card.title}
                          placeholder="Título do card"
                          onChange={(e) => updateCard(card.id, { title: e.target.value })}
                        />
                        <button
                          onClick={() => removeCard(card.id)}
                          className="text-text-soft hover:text-danger transition-colors p-1"
                          aria-label="Remover card"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <textarea
                        className="text-sm text-text-secondary bg-transparent resize-none focus:outline-none w-full"
                        rows={2}
                        value={card.description}
                        placeholder="Descrição..."
                        onChange={(e) => updateCard(card.id, { description: e.target.value })}
                      />

                      {/* Tags que a IA reconheceu entre as SUAS tags (ela não
                          cria rótulo novo). Clicar remove a tag do card. */}
                      {card.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {card.tags.map((tag) => (
                            // Só `content`: a ação é uma linha, sem regra a explicar.
                            <Tooltip key={tag.id} content="Remover esta tag do card">
                              <button
                                onClick={() =>
                                  updateCard(card.id, {
                                    tags: card.tags.filter((t) => t.id !== tag.id),
                                  })
                                }
                                aria-label={`Remover a tag ${tag.name} do card`}
                                className="group flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition-opacity hover:opacity-70"
                                style={{ backgroundColor: tint(tag.color, 'medium'), color: chipText(tag.color) }}
                              >
                                {tag.name}
                                <X size={10} className="opacity-0 group-hover:opacity-100" />
                              </button>
                            </Tooltip>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {(['low', 'medium', 'high'] as DraftPriority[]).map((p) => (
                          <button key={p} onClick={() => updateCard(card.id, { priority: p })}>
                            <Badge
                              variant={card.priority === p ? priorityVariant[p] : 'default'}
                              className={card.priority === p ? '' : 'opacity-50'}
                            >
                              {priorityLabel[p]}
                            </Badge>
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <DatePicker
                          label="Data"
                          value={card.dueDate}
                          onChange={(v) => updateCard(card.id, { dueDate: v })}
                        />
                        {teamActive && (
                          <Select
                            label="Responsável"
                            value={card.assigneeId}
                            onChange={(v) => updateCard(card.id, { assigneeId: v })}
                            placeholder="Sem responsável"
                            options={[
                              { value: '', label: 'Sem responsável' },
                              ...members.map((m) => ({ value: m.userId, label: m.name })),
                            ]}
                          />
                        )}
                      </div>
                    </Card>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                </motion.div>
                </div>
                </div>

                {applyError && <p className="text-xs text-danger">{applyError}</p>}

                <Button
                  onClick={handleApprove}
                  disabled={
                    draft.cards.length === 0 ||
                    (!draft.targetProjectId && !draft.name.trim()) ||
                    applying
                  }
                  isLoading={applying}
                  icon={<Check size={18} />}
                  className="w-full"
                >
                  {applying
                    ? 'Criando...'
                    : `Aprovar e criar ${draft.cards.length} card(s)`}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* COMPOSER — ancorado embaixo, sempre à mão.
            `shrink-0` para a gaveta do documento crescer PARA CIMA, comendo a
            faixa de cima, em vez de ser espremida contra a borda da janela. */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
            setDocAberto(true); // arrastar já abre a gaveta: o alvo tem de existir
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`shrink-0 flex flex-col items-center gap-3 rounded-2xl transition-all ${
            dragging ? 'ring-2 ring-primary-vibrant bg-primary-light/20' : ''
          }`}
        >
          {/*
            A área que revela a dica envolve a DICA e o BALÃO juntos.

            Se ouvisse só o balão, mover o ponteiro para cima — para clicar na
            dica — já seria "saiu", e ela sumiria no caminho: o alvo foge do
            cursor que vai atrás dele. Envolvendo os dois, o trajeto entre um e
            outro continua dentro da área.

            A gaveta do documento fica de fora de propósito: abri-la não tem
            nada a ver com querer uma dica de texto.
          */}
          <div
            onMouseEnter={() => setPertoDoBalao(true)}
            onMouseLeave={() => setPertoDoBalao(false)}
            className="w-full max-w-3xl flex flex-col gap-1"
          >
            <DicasDePrompt visivel={pertoDoBalao} onEscolher={setCommand} />

            {/* O balão */}
            <div className="w-full rounded-2xl border border-border bg-surface/70 backdrop-blur-md shadow-sm focus-within:border-primary-vibrant/50 transition-colors">
              <textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                rows={2}
                // O balão não tem rótulo visível: sem isto o leitor de tela
                // anuncia só "caixa de texto".
                aria-label="O que você quer que a IA faça com o documento"
                placeholder="Diga o que você quer que eu faça…"
                className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-sm text-text-primary placeholder-text-soft focus:outline-none"
              />

              <div className="flex items-center gap-2 px-2 pb-2">
                {/* O "+" é o documento: anexar, colar ou arrastar. Fica como
                    gaveta porque na maior parte do tempo o documento já está lá
                    e só atrapalharia ocupando meia tela. */}
                <button
                  type="button"
                  onClick={() => setDocAberto((v) => !v)}
                  aria-expanded={docAberto}
                  className={`flex items-center gap-1.5 rounded-xl border px-2.5 h-9 text-xs font-semibold transition-colors ${
                    documentText.trim()
                      ? 'border-primary-vibrant/40 bg-primary-light/40 text-primary-vibrant'
                      : 'border-border text-text-secondary hover:text-primary-vibrant hover:border-primary-vibrant/40'
                  }`}
                >
                  <Plus size={15} className="shrink-0" />
                  <span className="hidden sm:inline">
                    {documentText.trim() ? 'Documento anexado' : 'Documento'}
                  </span>
                </button>

                <Dropdown
                  options={[
                    { value: 'structure', label: 'Estruturar projeto' },
                    { value: 'improve', label: 'Analisar melhorias' },
                  ]}
                  value={mode}
                  onChange={(v) => setMode(v as DraftMode)}
                  size="sm"
                />

                <span className="flex-1" />

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  aria-label="Gerar rascunho"
                  // Só aparece quando o botão está apagado — é ali que a pessoa
                  // se pergunta o porquê, e era o que a linha solta abaixo dizia.
                  title={
                    documentText.trim() ? 'Gerar rascunho' : 'Anexe um documento no + para começar'
                  }
                  className="grid place-items-center w-9 h-9 shrink-0 rounded-xl bg-primary-vibrant text-white transition-colors hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* A gaveta do documento. Abre sozinha quando não há documento e a
              pessoa clica em "+", e continua aceitando arrastar de qualquer
              lugar do bloco. */}
          {docAberto && (
            <div className="w-full max-w-3xl flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <FileText size={16} className="text-primary-vibrant" />
                  Documento de referência
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Upload size={15} />}
                    onClick={handlePickFile}
                    isLoading={extracting}
                    disabled={extracting}
                    className="shrink-0 whitespace-nowrap"
                  >
                    {extracting ? 'Lendo…' : 'Importar'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDocAberto(false)}
                    aria-label="Recolher documento"
                    className="p-1.5 rounded-lg text-text-soft hover:text-text-primary hover:bg-bg-secondary"
                  >
                    <X size={15} />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                  className="hidden"
                  onChange={handleFileSelected}
                />
              </div>

              {fileName && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-bg-secondary px-3 py-2 text-sm text-text-secondary">
                  <span className="flex items-center gap-2 truncate">
                    <FileText size={14} className="text-primary-vibrant shrink-0" />
                    <span className="truncate">{fileName}</span>
                  </span>
                  <button
                    onClick={() => {
                      setFileName(null);
                      setDocumentText('');
                    }}
                    className="text-text-soft hover:text-danger transition-colors shrink-0"
                    aria-label="Remover arquivo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              <Textarea
                placeholder="Cole, importe ou arraste seu documento aqui."
                rows={8}
                className="h-[calc(6*1.5rem_+_22px)] sm:h-auto"
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                error={importError ?? undefined}
              />
              <div className="-mt-1 flex justify-end">
                <span
                  className={`text-xs ${overLimit ? 'text-danger font-medium' : 'text-text-secondary'}`}
                >
                  {documentText.length.toLocaleString('pt-BR')} /{' '}
                  {MAX_DOC_CHARS.toLocaleString('pt-BR')}
                  {overLimit && ' — documento muito grande'}
                </span>
              </div>
            </div>
          )}


          {generateError && <p className="text-xs text-danger">{generateError}</p>}

          {/* As duas ressalvas numa linha só. Nenhuma sai: são o que a pessoa
              NÃO tem como deduzir — que nada é gravado antes de aprovar, e que
              o documento sai daqui. Empilhadas viravam parede de texto embaixo
              do campo; juntas, leem-se de uma vez. A de privacidade some junto
              com a IA real no modo demonstração. */}
          <p className="pb-1 text-center text-xs text-text-soft">
            Nada é salvo até você revisar e aprovar.
            {aiEnabled && ' O documento é enviado à Anthropic para análise.'}
          </p>
        </div>
      </div>

      {/* Tutorial passo a passo */}
      <AiHowToModal isOpen={showHowTo} onClose={() => setShowHowTo(false)} />

      {/* Popup de sucesso */}
      <Modal
        isOpen={!!success}
        onClose={() => setSuccess(null)}
        title="Tudo certo!"
        size="sm"
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <motion.img
            src="/bobheroi.png"
            alt="Bob herói comemorando"
            className="w-32 h-32 object-contain drop-shadow-lg"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          />
          <div>
            <p className="font-semibold text-text-primary">
              Projeto "{success?.name}" criado!
            </p>
            <p className="text-sm text-text-secondary mt-1">
              {success?.count} card(s) adicionado(s) com sucesso.
            </p>
          </div>
          <div className="flex w-full gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setSuccess(null)}>
              Continuar aqui
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setSuccess(null);
                navigate('/projects');
              }}
            >
              Ver projetos
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
};

export default AiAssistantPage;
