import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trash2, Plus, Check, RotateCcw, FileText, Upload, Info, RefreshCw, HelpCircle, Lightbulb, X } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Textarea } from '@/components/common/Textarea';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { DatePicker } from '@/components/common/DatePicker';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeletons';
import { Mascot } from '@/components/mascot/Mascot';
import { Modal } from '@/components/common/Modal';
import { AiHowToModal } from '@/components/ai/AiHowToModal';
import { useCelebration } from '@/contexts/CelebrationContext';
import { aiService, AiStatus, DraftMode } from '@/services/aiService';
import { teamsService } from '@/services/teamsService';
import { TeamSummary, TeamMember } from '@/types/team';
import { useProjects } from '@/contexts/ProjectsContext';
import { useTasks } from '@/contexts/TasksContext';

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
}

interface ProjectDraft {
  name: string;
  description: string;
  color: string;
  cards: DraftCard[];
  generatedBy: 'ai' | 'demo';
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
        setImportError('Não consegui ler este arquivo. Tente colar o conteúdo manualmente.');
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
    if (file) processFile(file);
  };

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
        dueDate: '',
        assigneeId: '',
      }));
      const improve = mode === 'improve';
      setDraft({
        name: result.name,
        description: result.description,
        color: result.color,
        generatedBy: result.generatedBy,
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
              { id: uid(), title: '', description: '', priority: 'medium', dueDate: '', assigneeId: '' },
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
      subtitle="Cole um documento, descreva o que quer, e a IA monta o projeto e os cards para você revisar."
    >
      {/* HERO */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-primary-vibrant/30 bg-gradient-to-r from-primary-light via-primary-light/60 to-white shadow-sm">
        <div className="flex items-center gap-4 p-5 sm:p-6">
          <motion.img
            src="/bobapontando.png"
            alt=""
            className="hidden sm:block w-24 h-24 object-contain drop-shadow-md shrink-0"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-primary-vibrant" />
              <h2 className="text-lg font-bold text-text-primary">
                Transforme documentos em projetos
              </h2>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              Envie um texto ou arquivo e deixe a IA montar os cards. Você revisa e aprova.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<HelpCircle size={16} />}
            onClick={() => setShowHowTo(true)}
            className="shrink-0"
          >
            <span className="hidden sm:inline">Como usar</span>
            <span className="hidden sm:inline font-normal text-text-soft">· ~1 min</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* ENTRADA (em cima, largura total) */}
        <Card
          className={`flex flex-col gap-4 transition-all ${
            dragging ? 'ring-2 ring-primary-vibrant ring-offset-2 bg-primary-light/30' : ''
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          {aiEnabled === false && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>
                <strong>Modo demonstração:</strong> a IA real está desativada.
              </span>
            </div>
          )}

          {/* Entrada em 2 colunas (em telas largas): documento | comando */}
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-4">
          {/* Modo: estruturar projeto x analisar melhorias */}
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'structure', label: 'Estruturar projeto' },
              { id: 'improve', label: 'Analisar melhorias' },
            ] as { id: DraftMode; label: string }[]).map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  mode === m.id
                    ? 'border-primary-vibrant bg-primary-light text-primary-dark'
                    : 'border-border bg-white text-text-secondary hover:bg-bg-secondary'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="-mt-1 text-xs text-text-soft">
            {mode === 'structure'
              ? 'A IA monta um projeto com os passos do documento.'
              : 'A IA analisa o documento e sugere tarefas de melhoria.'}
          </p>

          <div className="flex items-center justify-between gap-2 text-text-primary">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-primary-vibrant" />
              <h2 className="font-semibold">Documento de referência</h2>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Upload size={16} />}
              onClick={handlePickFile}
              isLoading={extracting}
              disabled={extracting}
            >
              {extracting ? 'Lendo arquivo...' : 'Importar arquivo'}
            </Button>
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
            label="Documento (PDF, Word .docx, .txt ou .md)"
            placeholder="Cole, importe ou arraste seu documento aqui."
            rows={10}
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            error={importError ?? undefined}
          />
          <div className="-mt-2 flex justify-end">
            <span className={`text-xs ${overLimit ? 'text-danger font-medium' : 'text-text-soft'}`}>
              {documentText.length.toLocaleString('pt-BR')} / {MAX_DOC_CHARS.toLocaleString('pt-BR')}
              {overLimit && ' — documento muito grande'}
            </span>
          </div>
          </div>

          {/* Célula direita: comando + ação */}
          <div className="flex flex-col gap-4">
          <Textarea
            label="O que você quer? (comando)"
            placeholder='Ex.: "Crie um projeto para este cliente com os cards de cada etapa."'
            rows={3}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
          />

          <Button
            onClick={handleGenerate}
            disabled={!canGenerate}
            isLoading={generating}
            icon={<Sparkles size={18} />}
          >
            {generating ? 'Gerando rascunho...' : 'Gerar rascunho'}
          </Button>

          {generateError && <p className="text-xs text-danger">{generateError}</p>}

          {aiEnabled && status && (
            <p className="text-xs text-text-soft">
              Usos da IA nesta semana:{' '}
              <strong className={status.remaining === 0 ? 'text-danger' : 'text-text-primary'}>
                {status.remaining} de {status.limit} restantes
              </strong>
              .
            </p>
          )}

          <p className="text-xs text-text-soft">
            Nada é salvo até você revisar e aprovar o rascunho.
          </p>

          {aiEnabled && (
            <p className="flex items-start gap-1.5 text-xs text-text-soft">
              <Info size={13} className="mt-0.5 shrink-0" />
              <span>Seu documento é enviado à IA (Anthropic) para análise.</span>
            </p>
          )}
          </div>
          </div>
        </Card>

        {/* RASCUNHO (embaixo, largura total) */}
        <div>
          <AnimatePresence mode="wait">
            {generating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="h-full flex flex-col items-center gap-5 py-8">
                  <Mascot state="strong" size="md" />
                  <p className="font-medium text-text-primary">
                    A IA está montando os cards...
                  </p>
                  <div className="w-full space-y-3">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                    <div className="pt-2 space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ) : !draft ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="h-full">
                  <EmptyState
                    mascotState="happy"
                    title="Nenhum rascunho ainda"
                    description="Preencha o documento à esquerda e clique em Gerar rascunho para ver a proposta da IA aqui."
                  />
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="draft"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                {/* Cabeçalho do projeto proposto */}
                <Card className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    {draft.generatedBy === 'ai' ? (
                      <Badge variant="purple">✨ Feito com IA</Badge>
                    ) : (
                      <Badge variant="warning">Demonstração (genérico)</Badge>
                    )}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleGenerate}
                        disabled={!canGenerate}
                        className="flex items-center gap-1 text-xs text-text-soft hover:text-primary-vibrant transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Gera um novo rascunho com o mesmo documento (consome 1 uso)."
                      >
                        <RefreshCw size={14} /> Gerar de novo
                      </button>
                      <button
                        onClick={reset}
                        className="flex items-center gap-1 text-xs text-text-soft hover:text-text-primary transition-colors"
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
                      { value: '', label: '➕ Criar um projeto novo' },
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

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">Cor:</span>
                        {PALETTE.map((c) => (
                          <button
                            key={c}
                            onClick={() => setDraft({ ...draft, color: c })}
                            className={`w-6 h-6 rounded-full border-2 transition-transform ${
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
                </Card>

                {/* Sugestões + cards lado a lado (em telas largas) quando há sugestões */}
                <div className={`grid items-start gap-4 ${suggestions.length > 0 ? '2xl:grid-cols-5' : 'grid-cols-1'}`}>
                {/* Sugestões de melhoria (balões) — modo "Analisar melhorias" */}
                {suggestions.length > 0 && (
                  <Card className="flex flex-col gap-3 border-purple-200 bg-purple-50/40 2xl:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lightbulb size={18} className="text-purple-500" />
                        <h3 className="font-semibold text-text-primary">Sugestões de melhoria</h3>
                      </div>
                      <button
                        onClick={addAllSuggestions}
                        className="text-xs font-medium text-primary-vibrant hover:underline"
                      >
                        Adicionar todas
                      </button>
                    </div>
                    <p className="-mt-1 text-xs text-text-soft">
                      💭 Ideias da IA. Toque em <Plus size={11} className="inline" /> para virar um card.
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
                                added ? 'border-green-200 bg-green-50/60' : 'border-purple-200 bg-white'
                              }`}
                            >
                              <span
                                className={`absolute -bottom-1 left-4 h-3 w-3 rotate-45 border-b border-r ${
                                  added ? 'border-green-200 bg-green-50' : 'border-purple-200 bg-white'
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
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                                      <Check size={12} /> Adicionado
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 shrink-0">
                                {added ? (
                                  <span
                                    title="Já adicionado"
                                    className="rounded-md bg-green-100 p-1 text-green-600"
                                  >
                                    <Check size={14} />
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => addSuggestion(s.id)}
                                    title="Adicionar aos cards"
                                    className="rounded-md bg-primary-vibrant p-1 text-white transition-colors hover:bg-primary-hover"
                                  >
                                    <Plus size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={() => dismissSuggestion(s.id)}
                                  title="Descartar sugestão"
                                  className="rounded-md p-1 text-text-soft transition-colors hover:text-danger"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </Card>
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

                <div className="flex flex-col gap-3">
                  {draft.cards.length === 0 && (
                    <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-text-soft">
                      Nenhum card ainda. Adicione as sugestões acima 💭 ou crie um card manualmente.
                    </p>
                  )}
                  {draft.cards.map((card) => (
                    <Card key={card.id} padding="sm" className="flex flex-col gap-2">
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
                  ))}
                </div>
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
