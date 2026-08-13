import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ProjectsSkeleton } from '@/components/common/Skeletons';
import { IdeaCard } from '@/components/ideas/IdeaCard';
import { QuickIdeaModal } from '@/components/ideas/QuickIdeaModal';
import { EditIdeaModal } from '@/components/ideas/EditIdeaModal';
import { ConvertIdeaModal } from '@/components/ideas/ConvertIdeaModal';
import { useIdeas } from '@/contexts/IdeasContext';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { useToast } from '@/contexts/ToastContext';
import { Idea, IdeaStatus } from '@/types/idea';
import { IDEA_STATUS_META, countIdeas, needsAttention } from '@/utils/ideaStatus';

const IdeasPage: React.FC = () => {
  const { ideas, loading, createIdea, updateIdea, deleteIdea, convertIdea } = useIdeas();
  const showSkeleton = useDeferredLoading(loading);
  const navigate = useNavigate();
  const toast = useToast();

  const [showQuick, setShowQuick] = useState(false);
  const [editing, setEditing] = useState<Idea | undefined>();
  const [converting, setConverting] = useState<Idea | undefined>();
  const [deleting, setDeleting] = useState<Idea | undefined>();
  const [isDeleting, setIsDeleting] = useState(false);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<IdeaStatus | 'all'>('all');

  const counts = useMemo(() => countIdeas(ideas), [ideas]);

  const visiveis = useMemo(() => {
    const termo = search.trim().toLowerCase();
    return ideas
      .filter(i => {
        // Sem filtro de status, arquivadas ficam fora: são o que a pessoa
        // decidiu não olhar agora. Elas só aparecem quando pedidas.
        if (filterStatus === 'all') return i.status !== 'arquivada';
        return i.status === filterStatus;
      })
      .filter(i => {
        if (!termo) return true;
        return (
          i.title.toLowerCase().includes(termo) ||
          (i.description ?? '').toLowerCase().includes(termo) ||
          (i.category ?? '').toLowerCase().includes(termo)
        );
      })
      .sort((a, b) => {
        // Quem pede decisão vem primeiro: revisão vencida ou dependência
        // concluída. Do contrário, a ideia madura afunda entre as recentes.
        const pa = needsAttention(a) ? 0 : 1;
        const pb = needsAttention(b) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }, [ideas, search, filterStatus]);

  const alternarArquivo = async (idea: Idea) => {
    const arquivando = idea.status !== 'arquivada';
    try {
      await updateIdea(idea.id, { status: arquivando ? 'arquivada' : 'rascunho' });
      toast.success(arquivando ? 'Ideia arquivada.' : 'Ideia trazida de volta.');
    } catch {
      toast.error('Não foi possível atualizar a ideia.');
    }
  };

  const confirmarExclusao = async () => {
    if (!deleting) return;
    try {
      setIsDeleting(true);
      await deleteIdea(deleting.id);
      toast.success('Ideia excluída.');
      setDeleting(undefined);
    } catch {
      toast.error('Não foi possível excluir a ideia.');
    } finally {
      setIsDeleting(false);
    }
  };

  const statusTabs: { value: IdeaStatus | 'all'; label: string; count: number; color: string }[] = [
    { value: 'all', label: 'Todas', count: counts.total, color: '#2477FF' },
    ...IDEA_STATUS_META.map(m => ({
      value: m.value,
      label: m.label,
      count: ideas.filter(i => i.status === m.value).length,
      color: m.color,
    })),
  ];

  return (
    <>
      <QuickIdeaModal
        isOpen={showQuick}
        onClose={() => setShowQuick(false)}
        onCreate={createIdea}
        onDetail={setEditing}
      />

      <EditIdeaModal
        isOpen={!!editing}
        idea={editing}
        onClose={() => setEditing(undefined)}
        onSave={updateIdea}
      />

      <ConvertIdeaModal
        isOpen={!!converting}
        idea={converting}
        onClose={() => setConverting(undefined)}
        onConvert={convertIdea}
        // Vai para Projetos, não para as tarefas: o que acabou de nascer é um
        // projeto, e é lá que a pessoa confere se ele ficou como queria.
        onConverted={() => navigate('/projects')}
      />

      <ConfirmDialog
        isOpen={!!deleting}
        mascotState="confused"
        tone="danger"
        title="Excluir esta ideia?"
        message={deleting ? `"${deleting.title}"` : ''}
        hint={
          <>
            <strong className="text-text-primary">Atenção:</strong> a ideia será removida
            permanentemente. Se quiser apenas tirá-la da frente, use{' '}
            <strong className="text-text-primary">arquivar</strong>.
          </>
        }
        confirmLabel="Excluir ideia"
        cancelLabel="Cancelar"
        onConfirm={confirmarExclusao}
        onClose={() => !isDeleting && setDeleting(undefined)}
      />

      <AppLayout
        onNewTask={() => setShowQuick(true)}
        actionLabel="Nova ideia"
        title="Ideias"
        subtitle="Registre possibilidades agora e decida quando transformá-las em projetos."
      >
        {loading ? (
          showSkeleton ? <ProjectsSkeleton /> : null
        ) : ideas.length === 0 ? (
          <EmptyState
            mascotState="happy"
            title="Nenhuma ideia guardada ainda"
            description="Aqui ficam as possibilidades que ainda não viraram projeto — anote agora e decida depois."
            action={{ label: 'Guardar uma ideia', onClick: () => setShowQuick(true) }}
          />
        ) : (
          <>
            {/* Resumo */}
            <Card className="flex flex-wrap gap-6 sm:gap-8 mb-6">
              <div>
                <p className="text-2xl font-extrabold text-text-primary leading-none">
                  {counts.total}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {counts.total === 1 ? 'Ideia' : 'Ideias'}
                </p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-[#8B5CF6] leading-none">
                  {counts.planejadas}
                </p>
                <p className="text-xs text-text-secondary mt-1">Planejadas</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-success leading-none">
                  {counts.prontas}
                </p>
                <p className="text-xs text-text-secondary mt-1">Prontas para começar</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold text-text-soft leading-none">
                  {counts.arquivadas}
                </p>
                <p className="text-xs text-text-secondary mt-1">Arquivadas</p>
              </div>
            </Card>

            {/* Busca */}
            <div className="mb-4">
              <Input
                placeholder="Buscar por título, descrição ou categoria..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                icon={<Search size={18} />}
              />
            </div>

            {/* Filtro por estágio */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
              {statusTabs.map(tab => {
                const active = filterStatus === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setFilterStatus(tab.value)}
                    className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-semibold transition-all active:scale-[0.97] ${
                      active
                        ? 'border-transparent text-white shadow-sm'
                        : 'bg-surface border-border text-text-secondary hover:bg-bg-secondary'
                    }`}
                    style={active ? { backgroundColor: tab.color } : undefined}
                  >
                    {tab.label}
                    <span
                      className={`min-w-[20px] text-center text-xs font-bold px-1.5 py-0.5 rounded-full ${
                        active ? 'bg-white/25 text-white' : 'bg-bg-secondary text-text-secondary'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {visiveis.length === 0 ? (
              <EmptyState
                mascotState="investigate"
                title="Nada por aqui"
                description="Nenhuma ideia corresponde à busca ou ao estágio selecionado."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visiveis.map(idea => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    onOpen={i => (i.status === 'convertida' ? undefined : setEditing(i))}
                    onEdit={setEditing}
                    onArchive={alternarArquivo}
                    onDelete={setDeleting}
                    onConvert={setConverting}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </AppLayout>
    </>
  );
};

export default IdeasPage;
