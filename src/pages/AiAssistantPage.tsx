import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trash2, Plus, Check, RotateCcw, FileText, Upload, Info } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Textarea } from '@/components/common/Textarea';
import { Input } from '@/components/common/Input';
import { EmptyState } from '@/components/common/EmptyState';
import { aiService } from '@/services/aiService';
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
}

interface ProjectDraft {
  name: string;
  description: string;
  color: string;
  cards: DraftCard[];
  generatedBy: 'ai' | 'demo';
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

const PALETTE = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

const uid = () => Math.random().toString(36).slice(2, 9);

const AiAssistantPage: React.FC = () => {
  const navigate = useNavigate();
  const { refresh: refreshProjects } = useProjects();
  const { refresh: refreshTasks } = useTasks();
  const [documentText, setDocumentText] = useState('');
  const [command, setCommand] = useState('');
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Descobre, ao abrir a tela, se a IA real está ativa ou em modo demonstração.
  useEffect(() => {
    aiService
      .status()
      .then((s) => setAiEnabled(s.aiEnabled))
      .catch(() => setAiEnabled(null));
  }, []);

  const canGenerate = documentText.trim().length > 0 && !generating && !extracting;

  const handlePickFile = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Permite reimportar o mesmo arquivo depois (reseta o input).
    e.target.value = '';
    if (!file) return;

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

  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    setApplyError(null);
    try {
      const result = await aiService.draft(documentText, command || undefined);
      // O back-end devolve cards sem id; adicionamos um id local para edição.
      setDraft({
        name: result.name,
        description: result.description,
        color: result.color,
        generatedBy: result.generatedBy,
        cards: result.cards.map((c) => ({
          id: uid(),
          title: c.title,
          description: c.description ?? '',
          priority: c.priority,
        })),
      });
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

  const addCard = () => {
    setDraft((d) =>
      d
        ? {
            ...d,
            cards: [
              ...d.cards,
              { id: uid(), title: '', description: '', priority: 'medium' },
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
      const result = await aiService.apply({
        name: draft.name,
        color: draft.color,
        description: draft.description || undefined,
        cards: draft.cards.map((c) => ({
          title: c.title,
          description: c.description || undefined,
          priority: c.priority,
        })),
      });
      // Atualiza as listas para o projeto/cards recém-criados aparecerem.
      await Promise.all([refreshProjects(), refreshTasks()]);
      setDraft(null);
      setDocumentText('');
      setCommand('');
      setFileName(null);
      window.alert(
        `Projeto "${result.project.name}" criado com ${result.createdCount} card(s)!`,
      );
      navigate('/projects');
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
    setApplyError(null);
  };

  return (
    <AppLayout
      title="Assistente de IA"
      subtitle="Cole um documento, descreva o que quer, e a IA monta o projeto e os cards para você revisar."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COLUNA ESQUERDA — entrada */}
        <Card className="flex flex-col gap-4">
          {aiEnabled === false && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>
                <strong>Modo demonstração:</strong> a IA real está desativada.
              </span>
            </div>
          )}

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
              accept=".pdf,.docx,.txt,.md,.csv,.json,.html,.rtf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
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
            label="Cole o conteúdo, ou importe um arquivo (PDF, Word .docx ou texto)"
            placeholder="Cole aqui o texto do documento que a IA deve usar como base — ou use o botão Importar arquivo."
            rows={10}
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            error={importError ?? undefined}
          />

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

          <p className="text-xs text-text-soft">
            Nada é salvo até você revisar e aprovar o rascunho.
          </p>
        </Card>

        {/* COLUNA DIREITA — rascunho */}
        <div>
          <AnimatePresence mode="wait">
            {!draft ? (
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
                    <button
                      onClick={reset}
                      className="flex items-center gap-1 text-xs text-text-soft hover:text-text-primary transition-colors"
                    >
                      <RotateCcw size={14} /> Descartar
                    </button>
                  </div>

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
                </Card>

                {/* Cards propostos */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-text-primary">
                    Cards ({draft.cards.length})
                  </h3>
                  <Button variant="ghost" size="sm" icon={<Plus size={16} />} onClick={addCard}>
                    Adicionar
                  </Button>
                </div>

                <div className="flex flex-col gap-3">
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
                    </Card>
                  ))}
                </div>

                {applyError && <p className="text-xs text-danger">{applyError}</p>}

                <Button
                  onClick={handleApprove}
                  disabled={draft.cards.length === 0 || !draft.name.trim() || applying}
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
    </AppLayout>
  );
};

export default AiAssistantPage;
