import React, { useEffect, useState } from 'react';
import { Rocket, FolderOpen, Sparkles, Wand2, Trash2, Info, ArrowLeft } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { Button } from '@/components/common/Button';
import { OptionSelector } from '@/components/common/OptionSelector';
import { Select } from '@/components/common/Select';
import { useToast } from '@/contexts/ToastContext';
import { teamsService } from '@/services/teamsService';
import { aiService, ApplyCardPayload, DraftPriority } from '@/services/aiService';
import { TeamSummary } from '@/types/team';
import { Idea, ConvertIdeaInput } from '@/types/idea';
import { tint, chipText } from '@/utils/color';

interface ConvertIdeaModalProps {
  isOpen: boolean;
  idea?: Idea;
  onClose: () => void;
  onConvert: (id: string, input: ConvertIdeaInput) => Promise<string>;
  /** Chamado depois de tudo pronto (leva para Projetos). */
  onConverted: (projectId: string) => void;
}

/** Card do rascunho enquanto está sendo revisado (id local só para a lista). */
interface RascunhoCard extends ApplyCardPayload {
  id: string;
}

const PRIORIDADE_COR: Record<DraftPriority, string> = {
  low: '#64748B',
  medium: '#FBBF24',
  high: '#F43F5E',
};
const PRIORIDADE_LABEL: Record<DraftPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

/**
 * Conversão de ideia em projeto, com dois caminhos.
 *
 * O caminho simples cria o projeto e pronto. O caminho com IA reaproveita
 * /ai/draft e /ai/apply — os mesmos que a tela do Assistente usa — para já
 * nascer com as tarefas. Usar a IA é escolha explícita: ela custa dinheiro por
 * chamada e consome a cota semanal da pessoa, então nunca dispara sozinha.
 */
export const ConvertIdeaModal: React.FC<ConvertIdeaModalProps> = ({
  isOpen,
  idea,
  onClose,
  onConvert,
  onConverted,
}) => {
  const toast = useToast();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'solo' | 'team'>('solo');
  const [teamId, setTeamId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // 'escolha' → 'simples' | 'ia'. A escolha vem primeiro porque muda o tamanho
  // e o conteúdo da tela inteira.
  const [etapa, setEtapa] = useState<'escolha' | 'simples' | 'ia'>('escolha');

  // --- Estado do caminho com IA ---
  const [documento, setDocumento] = useState('');
  const [comando, setComando] = useState('');
  const [gerando, setGerando] = useState(false);
  const [cards, setCards] = useState<RascunhoCard[] | null>(null);
  const [demo, setDemo] = useState(false);
  const [cota, setCota] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    if (!isOpen || !idea) return;
    setName(idea.title);
    setType('solo');
    setTeamId('');
    setError('');
    setEtapa('escolha');
    // O documento começa com o que a ideia já tem: é exatamente o material que
    // a pessoa escreveu quando teve a ideia, e reescrevê-lo do zero seria
    // trabalho repetido.
    setDocumento([idea.title, idea.description].filter(Boolean).join('\n\n'));
    setComando('');
    setCards(null);
    setDemo(false);
    teamsService.listTeams().then(setTeams).catch(() => setTeams([]));
    aiService
      .status()
      .then(s => setCota({ used: s.used, limit: s.limit }))
      .catch(() => setCota(null));
  }, [isOpen, idea]);

  if (!idea) return null;

  const restantes = cota ? Math.max(0, cota.limit - cota.used) : null;

  const gerarRascunho = async () => {
    if (!documento.trim()) {
      setError('Escreva do que se trata a ideia para a IA trabalhar em cima.');
      return;
    }
    setError('');
    setGerando(true);
    try {
      const res = await aiService.draft(documento.trim(), comando.trim() || undefined, 'structure');
      setCards(
        res.cards.map((c, i) => ({
          id: `c${i}`,
          title: c.title,
          description: c.description,
          priority: c.priority,
          dueDate: c.dueDate,
          tagIds: c.tags?.map(t => t.id),
        })),
      );
      setDemo(res.generatedBy === 'demo');
      if (res.generatedBy === 'demo' && res.demoReason === 'ai-error') {
        toast.error('A IA falhou; este é um rascunho de demonstração. O uso não foi cobrado.');
      }
    } catch (err) {
      setError((err as Error).message || 'Não foi possível gerar o rascunho.');
    } finally {
      setGerando(false);
    }
  };

  /**
   * Converte e, no caminho com IA, adiciona as tarefas ao projeto criado.
   *
   * A ordem importa: converter primeiro. Se a criação das tarefas falhar, resta
   * um projeto vazio e a ideia corretamente marcada como convertida — estado
   * consistente, e as tarefas podem ser geradas depois pelo Assistente. Na
   * ordem inversa, uma falha deixaria um projeto órfão com a ideia ainda
   * pendente, e ninguém saberia qual dos dois é a verdade.
   */
  const criar = async (comCards: boolean) => {
    if (!name.trim()) {
      setError('O projeto precisa de um nome.');
      return;
    }
    if (type === 'team' && !teamId) {
      setError('Selecione a equipe do projeto.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const projectId = await onConvert(idea.id, {
        name: name.trim(),
        type,
        teamId: type === 'team' ? teamId : null,
      });

      if (comCards && cards && cards.length > 0) {
        try {
          await aiService.apply({
            projectId,
            cards: cards.map(({ id: _id, ...card }) => card),
          });
          toast.success(`Projeto criado com ${cards.length} tarefas! 🚀`);
        } catch {
          // O projeto existe; só as tarefas falharam. Dizer isso é melhor do
          // que um erro genérico que faria a pessoa tentar converter de novo
          // (e receber 409, porque a ideia já foi convertida).
          toast.error('Projeto criado, mas as tarefas não puderam ser adicionadas.');
        }
      } else {
        toast.success('Ideia virou projeto! 🚀');
      }
      onClose();
      onConverted(projectId);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível converter a ideia.');
    } finally {
      setSaving(false);
    }
  };

  /** Nome, tipo e equipe — iguais nos dois caminhos. */
  const camposDoProjeto = (
    <>
      <Input
        label="Nome do projeto"
        value={name}
        onChange={e => {
          setName(e.target.value);
          if (error) setError('');
        }}
        maxLength={120}
        disabled={saving}
      />
      <OptionSelector
        label="Tipo de projeto"
        options={[
          { value: 'solo', label: 'Solo' },
          { value: 'team', label: 'Equipe' },
        ]}
        value={type}
        onChange={v => setType(v as 'solo' | 'team')}
        layout="grid"
        columns={2}
        disabled={saving}
      />
      {type === 'team' && (
        <Select
          label="Equipe"
          options={[
            { value: '', label: 'Selecione a equipe' },
            ...teams.map(t => ({ value: t.id, label: t.name })),
          ]}
          value={teamId}
          onChange={v => {
            setTeamId(v);
            if (error) setError('');
          }}
        />
      )}
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transformar em projeto"
      size={etapa === 'ia' ? 'xl' : 'md'}
    >
      {/* ------------------------------------------------ ETAPA 1: escolha */}
      {etapa === 'escolha' && (
        <div className="space-y-4">
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ backgroundColor: tint(idea.color) }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: tint(idea.color, 'medium'), color: chipText(idea.color) }}
            >
              <FolderOpen size={20} />
            </div>
            <p className="font-bold text-text-primary truncate">{idea.title}</p>
          </div>

          <p className="text-sm text-text-secondary">
            A ideia continua guardada, marcada como <strong>virou projeto</strong> — é o registro
            de onde ele veio.
          </p>

          <button
            type="button"
            onClick={() => setEtapa('simples')}
            className="w-full flex items-start gap-3 p-4 rounded-xl border border-border hover:bg-bg-secondary hover:border-primary-vibrant/40 transition-colors text-left"
          >
            <span className="w-10 h-10 shrink-0 rounded-xl bg-bg-secondary text-text-secondary flex items-center justify-center">
              <Rocket size={18} />
            </span>
            <span>
              <span className="block font-semibold text-text-primary">Só criar o projeto</span>
              <span className="block text-sm text-text-secondary">
                Você adiciona as tarefas depois, do seu jeito.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEtapa('ia')}
            className="w-full flex items-start gap-3 p-4 rounded-xl border border-primary-vibrant/40 bg-primary-light/40 hover:bg-primary-light transition-colors text-left"
          >
            <span className="w-10 h-10 shrink-0 rounded-xl bg-surface text-primary-vibrant flex items-center justify-center">
              <Sparkles size={18} />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-text-primary">
                Deixar a IA montar as tarefas
              </span>
              <span className="block text-sm text-text-secondary">
                Ela lê a ideia e propõe um plano — você revisa antes de criar.
              </span>
              {restantes !== null && (
                <span className="block text-xs text-text-soft mt-1">
                  {restantes} {restantes === 1 ? 'uso restante' : 'usos restantes'} nesta semana
                </span>
              )}
            </span>
          </button>
        </div>
      )}

      {/* --------------------------------------- ETAPA 2A: sem IA (simples) */}
      {etapa === 'simples' && (
        <form
          onSubmit={e => {
            e.preventDefault();
            criar(false);
          }}
          className="space-y-5"
        >
          {camposDoProjeto}
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEtapa('escolha')}
              disabled={saving}
              icon={<ArrowLeft size={16} />}
            >
              Voltar
            </Button>
            <Button type="submit" isLoading={saving} icon={<Rocket size={16} />}>
              Criar projeto
            </Button>
          </div>
        </form>
      )}

      {/* ------------------------------------------------- ETAPA 2B: com IA */}
      {etapa === 'ia' && (
        <div className="space-y-4">
          {/* min-w-0 nas colunas: item de grid não encolhe abaixo do conteúdo,
              e sem isso um título longo empurra a coluna para fora da tela. */}
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            {/* Coluna 1 — o que a IA vai ler e o comando */}
            <div className="flex min-w-0 flex-col gap-4">
              <Textarea
                label="Sobre a ideia"
                rows={6}
                maxLength={50000}
                value={documento}
                onChange={e => setDocumento(e.target.value)}
                disabled={gerando || saving}
                helperText="Já preenchido com o que você escreveu na ideia. Ajuste se quiser."
              />
              <Textarea
                label="O que você quer deste projeto? (opcional)"
                rows={3}
                maxLength={1000}
                value={comando}
                onChange={e => setComando(e.target.value)}
                placeholder="Ex.: dividir em etapas de pesquisa, protótipo e validação; prazos ao longo de 3 meses."
                disabled={gerando || saving}
              />
              <Button
                type="button"
                onClick={gerarRascunho}
                isLoading={gerando}
                disabled={saving}
                icon={<Wand2 size={16} />}
              >
                {cards ? 'Gerar de novo' : 'Gerar rascunho'}
              </Button>
              {error && <p className="text-xs text-danger">{error}</p>}
            </div>

            {/* Coluna 2 — o rascunho */}
            <div className="flex min-w-0 flex-col gap-3">
              {!cards ? (
                <div className="flex flex-col items-center justify-center text-center gap-2 p-6 rounded-xl border border-dashed border-border min-h-[200px]">
                  <Sparkles size={24} className="text-text-soft" />
                  <p className="text-sm text-text-secondary">
                    O rascunho aparece aqui. Nada é criado até você confirmar.
                  </p>
                </div>
              ) : (
                <>
                  {demo && (
                    <div className="flex items-start gap-2 rounded-lg border border-yellow-200 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/10 px-3 py-2 text-xs text-yellow-800 dark:text-yellow-300">
                      <Info size={14} className="mt-0.5 shrink-0" />
                      <span>
                        <strong>Modo demonstração:</strong> a IA real está desativada, estas
                        tarefas são de exemplo.
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-text-primary">
                      {cards.length} {cards.length === 1 ? 'tarefa sugerida' : 'tarefas sugeridas'}
                    </p>
                    <span className="text-xs text-text-soft">Remova o que não quiser</span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
                    {cards.map(card => (
                      <div
                        key={card.id}
                        className="flex items-start gap-2 p-3 rounded-xl border border-border bg-surface"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-text-primary">{card.title}</p>
                          {card.description && (
                            <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">
                              {card.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span
                              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${PRIORIDADE_COR[card.priority]}22`,
                                color: PRIORIDADE_COR[card.priority],
                              }}
                            >
                              {PRIORIDADE_LABEL[card.priority]}
                            </span>
                            {card.dueDate && (
                              <span className="text-[11px] text-text-secondary">
                                {card.dueDate.split('-').reverse().join('/')}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCards(cs => (cs ?? []).filter(c => c.id !== card.id))}
                          aria-label={`Remover "${card.title}"`}
                          className="p-1.5 rounded-lg text-danger hover:bg-rose-50 transition-colors shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Dados do projeto — sempre visíveis: mesmo com IA, quem decide nome,
              tipo e equipe é a pessoa. */}
          <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-border">
            {camposDoProjeto}
          </div>

          <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-1 bg-surface border-t border-border flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEtapa('escolha')}
              disabled={saving || gerando}
              icon={<ArrowLeft size={16} />}
            >
              Voltar
            </Button>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => criar(false)}
                disabled={saving || gerando}
              >
                Criar sem as tarefas
              </Button>
              <Button
                type="button"
                onClick={() => criar(true)}
                isLoading={saving}
                disabled={!cards || cards.length === 0 || gerando}
                icon={<Rocket size={16} />}
              >
                Criar com {cards?.length ?? 0}{' '}
                {cards?.length === 1 ? 'tarefa' : 'tarefas'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
