import React, { useRef, useState } from 'react';
import {
  Camera,
  Trash2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { StatStrip } from '@/components/common/StatStrip';
import { StreakCard } from '@/components/dashboard/StreakCard';
import { XpView } from '@/components/reports/XpView';
import { useUser, initialsOf } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTasks } from '@/hooks/useTasks';
import { computeXp } from '@/utils/xp';

// Redimensiona a imagem no navegador (256x256, JPEG) para um data URL leve.
function resizeImage(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas'));
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ProfilePage: React.FC = () => {
  const { user } = useUser();
  const { account, updateAvatar } = useAuth();
  const { tasks } = useTasks();
  const toast = useToast();
  const xp = computeXp(tasks);
  const fileRef = useRef<HTMLInputElement>(null);

  // Avatar
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setAvatarMsg(null);
    setAvatarLoading(true);
    try {
      const dataUrl = await resizeImage(file);
      const result = await updateAvatar(dataUrl);
      if (result.ok) toast.success('Foto atualizada!');
      else setAvatarMsg(result.error ?? 'Não foi possível enviar a foto.');
    } catch {
      setAvatarMsg('Não foi possível processar a imagem.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const onRemoveAvatar = async () => {
    setAvatarMsg(null);
    setAvatarLoading(true);
    const result = await updateAvatar(null);
    setAvatarLoading(false);
    if (result.ok) toast.success('Foto removida.');
  };

  const stats = [
    { label: 'Total de tarefas', value: tasks.length },
    { label: 'Concluídas', value: tasks.filter(t => t.status === 'completed').length },
    { label: 'Em andamento', value: tasks.filter(t => t.status === 'in_progress').length },
  ];

  const avatarSrc = account?.avatar ?? user.avatar;

  return (
    <AppLayout title="Perfil" subtitle="Suas informações pessoais.">
      {/* Coluna centralizada: alinhada à esquerda, a página ficava colada na
          borda em telas largas, com muito vazio à direita. */}
      <div className="mx-auto w-full max-w-2xl space-y-6">
        {/* Header card */}
        <Card padding="none" className="overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary-vibrant to-brand-deep" />
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
              <div className="relative shrink-0">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={user.name}
                    className="w-24 h-24 rounded-2xl object-cover border-4 border-surface shadow-sm"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-vibrant to-brand-deep flex items-center justify-center text-white text-3xl font-bold border-4 border-surface shadow-sm">
                    {initialsOf(user.name)}
                  </div>
                )}
                {avatarLoading && (
                  <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                    <Loader2 size={22} className="text-white animate-spin" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarLoading}
                  aria-label="Enviar foto"
                  className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-primary-vibrant text-white flex items-center justify-center border-2 border-surface hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-60"
                >
                  <Camera size={16} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
              </div>
              <div className="sm:pb-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-text-primary truncate">{user.name || 'Seu nome'}</h2>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-light text-primary-vibrant text-xs font-bold shrink-0"
                    title={`${xp.intoLevel}/100 XP para o próximo nível`}
                  >
                    <Sparkles size={12} /> Nível {xp.level} · {xp.xp} XP
                  </span>
                </div>
                <p className="text-sm text-text-secondary">{account?.email}</p>
              </div>
              {avatarSrc && (
                <button
                  type="button"
                  onClick={onRemoveAvatar}
                  disabled={avatarLoading}
                  className="sm:ml-auto sm:pb-1 inline-flex items-center gap-1.5 text-sm font-medium text-danger hover:text-rose-600 disabled:opacity-60"
                >
                  <Trash2 size={15} /> Remover foto
                </button>
              )}
            </div>
            {avatarMsg && <p className="text-sm text-danger mt-3">{avatarMsg}</p>}
          </div>
        </Card>

        {/* Três cartões com ícone colorido viraram a mesma faixa usada no
            Dashboard e na Equipe — menos moldura repetida, e os números do
            app passam a ter uma forma só em toda parte. */}
        <StatStrip stats={stats} />

        {/* Sequência produtiva (foguinhos) */}
        <StreakCard />

        {/* Experiência (XP), níveis e conquistas */}
        <section>
          <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-primary-vibrant" /> Experiência e conquistas
          </h3>
          <XpView tasks={tasks} />
        </section>

      </div>
    </AppLayout>
  );
};

export default ProfilePage;
