import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Trash2,
  CheckCircle2,
  Clock,
  ListTodo,
  ShieldCheck,
  Loader2,
  Lock,
  Pencil,
  Sparkles,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Button } from '@/components/common/Button';
import { StreakCard } from '@/components/dashboard/StreakCard';
import { XpView } from '@/components/reports/XpView';
import { forgotPassword } from '@/services/authService';
import { useUser, initialsOf } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTasks } from '@/hooks/useTasks';
import { computeXp } from '@/utils/xp';
import { tint, chipText } from '@/utils/color';

const COOLDOWN_DAYS = 30;

// Dias restantes de cooldown (0 = liberado).
function cooldownLeft(iso?: string | null): number {
  if (!iso) return 0;
  const remaining = COOLDOWN_DAYS * 86400000 - (Date.now() - new Date(iso).getTime());
  return remaining <= 0 ? 0 : Math.ceil(remaining / 86400000);
}

// Data em que a próxima alteração ficará disponível.
function availableOn(iso: string): string {
  return new Date(new Date(iso).getTime() + COOLDOWN_DAYS * 86400000).toLocaleDateString('pt-BR');
}

// Plural correto ("1 dia" / "3 dias") em vez do "dia(s)".
function days(n: number): string {
  return n === 1 ? '1 dia' : `${n} dias`;
}

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
  const { account, changePassword, updateName, updateAvatar } = useAuth();
  const { tasks } = useTasks();
  const toast = useToast();
  const xp = computeXp(tasks);
  const fileRef = useRef<HTMLInputElement>(null);

  // Avatar
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);

  // Nome
  const [name, setName] = useState(account?.name ?? '');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  useEffect(() => {
    setName(account?.name ?? '');
  }, [account?.name]);

  // Senha
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwLoading, setPwLoading] = useState(false);
  // Envio do link para definir a PRIMEIRA senha (contas do Google).
  const [definingPw, setDefiningPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const nameLeft = cooldownLeft(account?.nameChangedAt);
  const pwLeft = cooldownLeft(account?.passwordChangedAt);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === account?.name) return;
    setNameLoading(true);
    const result = await updateName(trimmed);
    setNameLoading(false);
    if (result.ok) {
      setNameMsg(null);
      toast.success('Nome atualizado.');
    } else {
      setNameMsg({ type: 'error', text: result.error ?? 'Não foi possível alterar o nome.' });
    }
  };

  /**
   * Primeira senha de uma conta do Google.
   *
   * Reusa o "esqueci minha senha" de propósito: definir uma senha sem ter uma
   * anterior para comparar precisa de outra prova de identidade, e o link por
   * e-mail é exatamente essa prova. Um botão que definisse a senha direto na
   * tela aceitaria qualquer sessão sequestrada.
   */
  const handleDefinePassword = async () => {
    if (!account?.email || definingPw) return;
    setDefiningPw(true);
    try {
      await forgotPassword(account.email);
      setPwMsg({
        type: 'ok',
        text: `Link enviado para ${account.email}. Confira sua caixa de entrada.`,
      });
    } catch {
      setPwMsg({ type: 'error', text: 'Não foi possível enviar o link. Tente de novo.' });
    } finally {
      setDefiningPw(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Valida aqui antes de enviar. Sem isto, um campo vazio só era pego pelo
    // servidor e voltava como "current must be longer than or equal to 1
    // characters" — mensagem crua do validador, em inglês, na cara do usuário.
    if (!pw.current) {
      setPwMsg({ type: 'error', text: 'Digite sua senha atual.' });
      return;
    }
    if (!pw.next) {
      setPwMsg({ type: 'error', text: 'Digite a nova senha.' });
      return;
    }

    setPwLoading(true);
    const result = await changePassword(pw.current, pw.next);
    setPwLoading(false);
    if (result.ok) {
      setPwMsg(null);
      setPw({ current: '', next: '' });
      toast.success('Senha atualizada com sucesso.');
    } else {
      setPwMsg({ type: 'error', text: result.error ?? 'Não foi possível alterar a senha.' });
    }
  };

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
    { label: 'Total de tarefas', value: tasks.length, icon: <ListTodo size={18} />, color: '#2477FF' },
    { label: 'Concluídas', value: tasks.filter(t => t.status === 'completed').length, icon: <CheckCircle2 size={18} />, color: '#22C55E' },
    { label: 'Em andamento', value: tasks.filter(t => t.status === 'in_progress').length, icon: <Clock size={18} />, color: '#FBBF24' },
  ];

  const avatarSrc = account?.avatar ?? user.avatar;

  return (
    <AppLayout title="Perfil" subtitle="Suas informações pessoais.">
      <div className="max-w-3xl space-y-6">
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

        {/* Quick stats — empilha no celular (3 colunas estreitas não cabem em linha) */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          {stats.map(s => (
            <Card
              key={s.label}
              padding="sm"
              className="flex flex-col items-center text-center gap-1.5 sm:flex-row sm:items-center sm:text-left sm:gap-3 sm:p-5"
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: tint(s.color), color: chipText(s.color) }}
              >
                {s.icon}
              </span>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-extrabold text-text-primary leading-none">{s.value}</p>
                <p className="text-[11px] sm:text-xs text-text-secondary mt-1 truncate">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Sequência produtiva (foguinhos) */}
        <StreakCard />

        {/* Experiência (XP), níveis e conquistas */}
        <section>
          <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-primary-vibrant" /> Experiência e conquistas
          </h3>
          <XpView tasks={tasks} />
        </section>

        {/* Editar perfil */}
        <Card>
          <h3 className="text-lg font-bold text-text-primary mb-1 flex items-center gap-2">
            <Pencil size={18} className="text-primary-vibrant" /> Editar perfil
          </h3>
          <p className="text-sm text-text-secondary mb-5">
            Seu nome é exibido na plataforma. Por segurança, só pode ser alterado a cada 30 dias.
          </p>

          <form onSubmit={handleSaveName} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Nome"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (nameMsg) setNameMsg(null);
                }}
                placeholder="Seu nome"
                disabled={nameLeft > 0 || nameLoading}
              />
              <Input label="Email" type="email" value={account?.email ?? ''} disabled readOnly />
            </div>

            {nameLeft > 0 ? (
              <p className="text-sm text-amber-600 dark:text-amber-300 inline-flex items-center gap-1.5">
                <Lock size={14} />
                Disponível em {days(nameLeft)}
                {account?.nameChangedAt && ` — em ${availableOn(account.nameChangedAt)}`}.
              </p>
            ) : (
              <>
                <p className="text-xs text-text-secondary">
                  Ao salvar, você só poderá alterar o nome novamente daqui a 30 dias.
                </p>
                <div className="flex items-center gap-4">
                  <Button
                    type="submit"
                    className="rounded-xl"
                    isLoading={nameLoading}
                    disabled={!name.trim() || name.trim() === account?.name}
                  >
                    Salvar nome
                  </Button>
                  {nameMsg && <span className="text-sm text-danger">{nameMsg.text}</span>}
                </div>
              </>
            )}
          </form>
        </Card>

        {/* Conta / segurança */}
        <Card>
          <h3 className="text-lg font-bold text-text-primary mb-1 flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary-vibrant" /> Conta e segurança
          </h3>
          <p className="text-sm text-text-secondary mb-5">
            {account ? `Conectado como ${account.email}` : 'Gerencie suas credenciais de acesso.'}
          </p>

          {/* Conta do Google ainda sem senha: pedir a "senha atual" seria pedir
              algo que não existe. Definir a primeira senha passa pelo mesmo
              fluxo do "esqueci minha senha", que prova o controle do e-mail —
              é o que o servidor exige, e aqui a tela deixa isso explícito em
              vez de deixar a pessoa travada num campo impossível. */}
          {account?.hasPassword === false ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-bg-secondary/60 px-4 py-3 text-sm text-text-secondary inline-flex items-start gap-2">
                <Lock size={15} className="mt-0.5 shrink-0" />
                <span>
                  Você entra com o Google, então esta conta ainda não tem senha. Dá para definir
                  uma e passar a entrar das duas formas.
                </span>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  className="rounded-xl"
                  isLoading={definingPw}
                  onClick={handleDefinePassword}
                >
                  Definir senha
                </Button>
                {pwMsg && (
                  <span
                    className={`text-sm ${pwMsg.type === 'error' ? 'text-danger' : 'text-success'}`}
                  >
                    {pwMsg.text}
                  </span>
                )}
              </div>
            </div>
          ) : pwLeft > 0 ? (
            <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-300 inline-flex items-center gap-2">
              <Lock size={15} />
              Você já alterou a senha recentemente. Poderá trocar novamente em {days(pwLeft)}
              {account?.passwordChangedAt && ` (em ${availableOn(account.passwordChangedAt)})`}.
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="grid sm:grid-cols-2 gap-4">
              {/* `autoComplete` não é enfeite aqui: sem ele o navegador não
                  sabe qual campo é qual e preenche por conta própria. O campo
                  ficava com os pontinhos na tela enquanto o estado do React
                  seguia vazio — e o servidor recebia a senha atual em branco.
                  `new-password` ainda impede que a senha salva seja injetada
                  no campo da senha NOVA. */}
              <PasswordInput
                label="Senha atual"
                autoComplete="current-password"
                value={pw.current}
                onChange={e => {
                  setPw(p => ({ ...p, current: e.target.value }));
                  if (pwMsg) setPwMsg(null);
                }}
                placeholder="••••••••"
              />
              <PasswordInput
                label="Nova senha"
                autoComplete="new-password"
                value={pw.next}
                onChange={e => {
                  setPw(p => ({ ...p, next: e.target.value }));
                  if (pwMsg) setPwMsg(null);
                }}
                placeholder="Pelo menos 8 caracteres, com letra e número"
              />
              <p className="sm:col-span-2 text-xs text-text-secondary -mt-1">
                Após alterar, você só poderá trocar a senha novamente daqui a 30 dias.
              </p>
              <div className="sm:col-span-2 flex items-center gap-4">
                <Button type="submit" className="rounded-xl" isLoading={pwLoading}>
                  Alterar senha
                </Button>
                {pwMsg && <span className="text-sm text-danger">{pwMsg.text}</span>}
              </div>
            </form>
          )}
        </Card>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
