import React, { useCallback, useEffect, useState } from 'react';
import { Users, Plus, Crown, Trash2, UserPlus, Link2, Copy, Check, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import { initialsOf } from '@/contexts/UserContext';
import { teamsService } from '@/services/teamsService';
import { invitesService } from '@/services/invitesService';
import { TeamSummary, TeamMember, PendingRequest } from '@/types/team';

const AVATAR_COLORS = ['#2477FF', '#8B5CF6', '#22C55E', '#FB7185', '#FBBF24', '#2DD4BF'];

const TeamPage: React.FC = () => {
  const { account } = useAuth();
  const userId = account?.id;

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [removing, setRemoving] = useState<TeamMember | null>(null);

  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedTeam = teams.find(t => t.id === selectedId) ?? null;
  const isOwner = selectedTeam?.ownerId === userId;
  const inviteLink = inviteToken ? `${window.location.origin}/join/${inviteToken}` : '';

  const loadTeams = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const list = await teamsService.listTeams();
      setTeams(list);
      setSelectedId(prev => (prev && list.some(t => t.id === prev) ? prev : list[0]?.id ?? null));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    if (!selectedId) {
      setMembers([]);
      return;
    }
    teamsService.getMembers(selectedId).then(setMembers).catch(() => setMembers([]));
  }, [selectedId]);

  const loadRequests = useCallback(async () => {
    if (!selectedId || !isOwner || !userId) {
      setRequests([]);
      return;
    }
    try {
      setRequests(await invitesService.listRequests(selectedId));
    } catch {
      setRequests([]);
    }
  }, [selectedId, isOwner, userId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const openInvite = async () => {
    if (!selectedId || !userId) return;
    setShowInvite(true);
    setCopied(false);
    setInviteToken('');
    setInviteLoading(true);
    try {
      const { token } = await invitesService.createInvite(selectedId);
      setInviteToken(token);
    } finally {
      setInviteLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard indisponível */
    }
  };

  const decide = async (id: string, action: 'approve' | 'reject') => {
    if (!userId) return;
    await invitesService.decide(id, action);
    await loadRequests();
    if (selectedId) setMembers(await teamsService.getMembers(selectedId));
    loadTeams();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setCreateError('Dê um nome à equipe.');
      return;
    }
    if (!userId) return;
    try {
      setCreating(true);
      const team = await teamsService.createTeam(newName.trim());
      setNewName('');
      setShowCreate(false);
      await loadTeams();
      setSelectedId(team.id);
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const confirmRemove = async () => {
    if (!removing || !selectedId || !userId) return;
    await teamsService.removeMember(selectedId, removing.userId);
    setRemoving(null);
    const updated = await teamsService.getMembers(selectedId);
    setMembers(updated);
    loadTeams();
  };

  return (
    <AppLayout
      onNewTask={() => setShowCreate(true)}
      actionLabel="Criar equipe"
      title="Equipe"
      subtitle="As pessoas que tocam os projetos com você."
    >
      {/* Create team modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Criar equipe" size="md">
        <form onSubmit={handleCreate} className="space-y-5">
          <Input
            label="Nome da equipe"
            placeholder="Ex.: Time de Produto"
            value={newName}
            onChange={e => {
              setNewName(e.target.value);
              if (createError) setCreateError('');
            }}
            error={createError && !newName.trim() ? createError : undefined}
            autoFocus
          />
          {createError && newName.trim() && <p className="text-sm text-danger">{createError}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" isLoading={creating} className="flex-1 rounded-xl">
              Criar equipe
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!removing}
        title="Remover membro?"
        message={`${removing?.name ?? ''} deixará de fazer parte de "${selectedTeam?.name ?? ''}".`}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        tone="danger"
        icon={<Trash2 size={22} />}
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      />

      {/* Invite link modal */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Convidar para a equipe" size="md">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Compartilhe este link. A pessoa abre, pede acesso, e você aprova aqui mesmo — nada
            automático.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-bg-secondary min-w-0">
              <Link2 size={16} className="text-text-secondary shrink-0" />
              <span className="text-sm text-text-primary truncate">
                {inviteLoading ? 'Gerando link...' : inviteLink}
              </span>
            </div>
            <Button
              onClick={copyLink}
              disabled={!inviteLink}
              icon={copied ? <Check size={16} /> : <Copy size={16} />}
              className="rounded-xl shrink-0"
            >
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <p className="text-xs text-text-soft">
            O mesmo link serve para várias pessoas. Cada pedido aparece em "Pedidos pendentes".
          </p>
        </div>
      </Modal>

      {loading ? (
        <LoadingScreen />
      ) : teams.length === 0 ? (
        <EmptyState
          mascotState="confused"
          title="Você ainda não tem uma equipe"
          description="Crie uma equipe para colaborar e distribuir tarefas entre as pessoas."
          action={{ label: 'Criar equipe', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-6">
          {/* Team tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {teams.map(team => {
              const active = team.id === selectedId;
              return (
                <button
                  key={team.id}
                  onClick={() => setSelectedId(team.id)}
                  className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all active:scale-[0.97] ${
                    active
                      ? 'bg-primary-vibrant border-transparent text-white shadow-sm'
                      : 'bg-white border-border text-text-secondary hover:bg-bg-secondary'
                  }`}
                >
                  <Users size={16} />
                  {team.name}
                  <span
                    className={`min-w-[20px] text-center text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-white/25 text-white' : 'bg-bg-secondary text-text-secondary'
                    }`}
                  >
                    {team.memberCount}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => setShowCreate(true)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-border text-sm font-medium text-text-secondary hover:text-primary-vibrant hover:border-primary-vibrant/50 transition-colors"
            >
              <Plus size={16} /> Nova
            </button>
          </div>

          {/* Selected team */}
          {selectedTeam && (
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">{selectedTeam.name}</h2>
                  <p className="text-sm text-text-secondary">
                    {selectedTeam.memberCount} {selectedTeam.memberCount === 1 ? 'membro' : 'membros'}
                    {isOwner && ' · você é o dono'}
                  </p>
                </div>
                {isOwner && (
                  <Button
                    onClick={openInvite}
                    variant="secondary"
                    size="sm"
                    icon={<UserPlus size={16} />}
                    className="rounded-xl"
                  >
                    Convidar
                  </Button>
                )}
              </div>

              {isOwner && requests.length > 0 && (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                  <p className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" /> Pedidos pendentes ({requests.length})
                  </p>
                  <div className="space-y-2">
                    {requests.map(r => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 bg-white rounded-lg border border-border p-2.5"
                      >
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-text-secondary font-bold text-sm shrink-0">
                          {initialsOf(r.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-text-primary truncate">{r.name}</p>
                          <p className="text-xs text-text-secondary truncate">{r.email}</p>
                        </div>
                        <button
                          onClick={() => decide(r.id, 'approve')}
                          className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-success text-white hover:bg-emerald-600 active:scale-95 transition-all"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => decide(r.id, 'reject')}
                          className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-border text-danger hover:bg-rose-50 active:scale-95 transition-all"
                        >
                          Recusar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((m, i) => (
                  <div
                    key={m.userId}
                    className="group flex items-center gap-3 p-3 rounded-xl border border-border"
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                      style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      {initialsOf(m.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-text-primary truncate flex items-center gap-1.5">
                        {m.name}
                        {m.role === 'owner' && <Crown size={14} className="text-amber-500 shrink-0" />}
                      </p>
                      <p className="text-xs text-text-secondary truncate">{m.email}</p>
                    </div>
                    {isOwner && m.role !== 'owner' && (
                      <button
                        onClick={() => setRemoving(m)}
                        aria-label="Remover membro"
                        className="p-2 rounded-lg text-danger opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-rose-50 transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default TeamPage;
