import React, { useRef, useState } from 'react';
import {
  Camera,
  Trash2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tooltip } from '@/components/common/Tooltip';
import { StatStrip } from '@/components/common/StatStrip';
import { StreakCard } from '@/components/dashboard/StreakCard';
import { XpView } from '@/components/reports/XpView';
import { useUser, initialsOf } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTasks } from '@/hooks/useTasks';
import { useXp } from '@/hooks/useXp';
import { XP_PER_LEVEL } from '@/utils/xp';

// Geometria do anel de nível em volta do avatar.
// Entrada de cada bloco da página, em cascata.
const BLOCO = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

const RING = 96;
const RING_W = 5;
const RING_R = (RING - RING_W) / 2;
const RING_C = 2 * Math.PI * RING_R;

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
  const { tasks, loading: tasksLoading } = useTasks();
  const toast = useToast();
  const xp = useXp();
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
          borda em telas largas, com muito vazio à direita.

          Os blocos entram em cascata, um logo após o outro. É pouco movimento
          de propósito — o suficiente para a página se montar em vez de piscar
          inteira, sem virar espetáculo. Respeita "reduzir movimento" pelo
          MotionConfig do App. */}
      <motion.div
        className="mx-auto w-full max-w-2xl space-y-6"
        initial="hidden"
        animate="shown"
        variants={{ shown: { transition: { staggerChildren: 0.07 } } }}
      >
        {/* Cabeçalho.
            A faixa de gradiente de 96px que ficava aqui era decoração pura —
            uma tarja colorida sem nada dentro, o clichê de página de perfil.
            No lugar dela, o avatar ganhou um ANEL que mostra o quanto falta
            para o próximo nível: mesma regra do ponto de status, movimento e
            cor só onde carregam informação.

            O chip "Nível X · Y XP" saiu junto: o bloco de Experiência, logo
            abaixo, já mostra nível, total e barra com muito mais detalhe. */}
        <motion.div variants={BLOCO} className="flex flex-col sm:flex-row sm:items-center gap-5">
          <Tooltip
            content={`Nível ${xp.level}`}
            description={`${xp.intoLevel} de ${XP_PER_LEVEL} XP para o nível ${xp.level + 1}.`}
          >
            {/* Tamanho fixo, igual ao anel. No celular o Tooltip não envolve
                nada (não há hover), então esta div vira filha direta da coluna
                flex e, sem largura própria, o `stretch` a esticava até a borda:
                o anel ficava à esquerda e a foto, o "Nv" e a câmera — todos
                posicionados em relação a ela — saíam de cima do anel. */}
            <div className="relative shrink-0" style={{ width: RING, height: RING }}>
              <svg width={RING} height={RING} className="block -rotate-90" aria-hidden="true">
                <circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={RING_R}
                  fill="none"
                  className="stroke-primary-light"
                  strokeWidth={RING_W}
                />
                <motion.circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={RING_R}
                  fill="none"
                  className="stroke-primary-vibrant"
                  strokeWidth={RING_W}
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  initial={{ strokeDashoffset: RING_C }}
                  animate={{ strokeDashoffset: RING_C - (xp.pctToNext / 100) * RING_C }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>

              <div className="absolute inset-0 flex items-center justify-center">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt=""
                    className="w-[74px] h-[74px] rounded-full object-cover"
                  />
                ) : (
                  <span className="w-[74px] h-[74px] rounded-full bg-gradient-to-br from-primary-vibrant to-brand-deep flex items-center justify-center text-white text-2xl font-bold">
                    {initialsOf(user.name)}
                  </span>
                )}
                {avatarLoading && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <Loader2 size={22} className="text-white animate-spin" />
                  </div>
                )}
              </div>

              {/* Nível no pé do anel: diz o que o anel está medindo. */}
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary-vibrant text-white text-[11px] font-bold shadow-sm">
                Nv {xp.level}
              </span>

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={avatarLoading}
                aria-label="Enviar foto"
                className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-surface border border-border text-text-secondary flex items-center justify-center hover:text-primary-vibrant hover:border-primary-vibrant active:scale-95 transition-all disabled:opacity-60"
              >
                <Camera size={15} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
            </div>
          </Tooltip>

          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold text-text-primary truncate">
              {user.name || 'Seu nome'}
            </h2>
            <p className="text-sm text-text-secondary truncate">{account?.email}</p>
            {avatarSrc && (
              <button
                type="button"
                onClick={onRemoveAvatar}
                disabled={avatarLoading}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-danger disabled:opacity-60 transition-colors"
              >
                <Trash2 size={15} /> Remover foto
              </button>
            )}
            {avatarMsg && <p className="text-sm text-danger mt-2">{avatarMsg}</p>}
          </div>
        </motion.div>

        {/* Três cartões com ícone colorido viraram a mesma faixa usada no
            Dashboard e na Equipe — menos moldura repetida, e os números do
            app passam a ter uma forma só em toda parte. */}
        <motion.div variants={BLOCO}>
          {/* `loading` em vez de esqueleto: a faixa tem altura fixa e os rótulos
              já são conhecidos, então trocar só os números por traços não move
              nada na tela. Sem isso, os três saltavam de 0 para o valor real. */}
          <StatStrip stats={stats} loading={tasksLoading} />
        </motion.div>

        {/* Sequência produtiva (foguinhos) */}
        <motion.div variants={BLOCO}>
          <StreakCard />
        </motion.div>

        {/* Experiência (XP), níveis e conquistas */}
        <motion.section variants={BLOCO}>
          <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-primary-vibrant" /> Experiência e conquistas
          </h3>
          <XpView tasks={tasks} />
        </motion.section>
      </motion.div>
    </AppLayout>
  );
};

export default ProfilePage;
