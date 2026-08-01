import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, MailCheck, CheckSquare, CalendarDays, BarChart3, Sparkles } from 'lucide-react';
import { Mascot } from '@/components/mascot/Mascot';
import { Input } from '@/components/common/Input';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/contexts/AuthContext';
import { isInternalPath } from '@/utils/url';

interface AuthPageProps {
  mode: 'login' | 'register';
}

const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Só aceita caminho interno: blinda contra open redirect (mesmo que um dia
  // troquemos navigate() por window.location).
  const rawRedirect = searchParams.get('redirect') || '/';
  const redirectTo = isInternalPath(rawRedirect) ? rawRedirect : '/';
  const sessionExpired = searchParams.get('expired') === '1';
  const verifiedParam = searchParams.get('verified'); // '1' ok | '0' inválido
  const { login, register, resendVerification } = useAuth();
  const isLogin = mode === 'login';

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState('');

  // Ao alternar entre /register e /login (mesmo componente é reaproveitado),
  // limpa a tela de "confirme seu e-mail" para mostrar o formulário certo.
  useEffect(() => {
    setRegisteredEmail(null);
    setResendMsg('');
    setError('');
  }, [mode]);

  const set = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    if (!isLogin && !form.name.trim()) {
      setError('Informe seu nome.');
      return;
    }

    setLoading(true);
    if (isLogin) {
      const result = await login(form.email, form.password);
      setLoading(false);
      if (result.ok) navigate(redirectTo);
      else setError(result.error ?? 'Algo deu errado. Tente novamente.');
      return;
    }
    const result = await register(form.name, form.email, form.password);
    setLoading(false);
    if (result.ok) {
      // Não loga: mostra a tela de "confirme seu e-mail".
      setRegisteredEmail(form.email.trim());
    } else {
      setError(result.error ?? 'Algo deu errado. Tente novamente.');
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setResendMsg('');
    const r = await resendVerification(registeredEmail);
    setResendMsg(r.ok ? 'E-mail reenviado. Confira sua caixa de entrada.' : (r.error ?? 'Falha ao reenviar.'));
  };

  return (
    <div className="min-h-screen bg-bg-main flex">
      {/* Brand panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-vibrant to-primary-dark text-white flex-col items-center justify-center text-center p-12 relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center">
          <Mascot state={isLogin ? 'happy' : 'strong'} size="xl" animate />
          <h1 className="text-3xl font-extrabold mt-6 leading-tight max-w-md">
            {isLogin
              ? 'Que bom te ver de novo! Bora organizar o dia?'
              : 'Vem com o Fassaja conquistar suas metas!'}
          </h1>
          <p className="text-white/80 mt-3 max-w-md">
            Tarefas, projetos, calendário e relatórios — tudo num só lugar, com aquele empurrãozinho
            motivacional do Bob.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-2.5 w-full max-w-sm">
            {[
              { icon: <CheckSquare size={16} />, label: 'Tarefas e projetos' },
              { icon: <CalendarDays size={16} />, label: 'Calendário' },
              { icon: <BarChart3 size={16} />, label: 'Relatórios' },
              { icon: <Sparkles size={16} />, label: 'XP e conquistas' },
            ].map(f => (
              <div
                key={f.label}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm text-sm font-semibold text-left"
              >
                <span className="text-white/90 shrink-0">{f.icon}</span>
                {f.label}
              </div>
            ))}
          </div>
        </div>

        <div className="absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-white/10" />
        <div className="absolute right-24 top-20 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -left-12 top-1/3 w-40 h-40 rounded-full bg-white/5" />
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* No mobile o painel da marca não existe: o Bob recebe aqui. */}
          <div className="lg:hidden flex justify-center">
            <Mascot state={isLogin ? 'happy' : 'strong'} size="sm" animate />
          </div>
          <div className="mb-8 flex justify-center">
            <div className="h-12 flex items-center justify-center overflow-hidden">
              <img
                src="/logofassaja.png"
                alt="Fassaja"
                className="max-w-none w-56 h-auto object-contain select-none"
                draggable={false}
              />
            </div>
          </div>

          {registeredEmail ? (
          <div className="text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center">
              <MailCheck size={28} className="text-primary-vibrant" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Confirme seu e-mail</h2>
            <p className="text-text-secondary mt-2">
              Enviamos um link de confirmação para{' '}
              <strong className="text-text-primary">{registeredEmail}</strong>. Clique nele para
              ativar sua conta.
            </p>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
              ⚠️ Não encontrou? Verifique a caixa de <strong>spam</strong> ou lixo eletrônico — e
              marque como "não é spam" para receber os próximos.
            </div>
            <button
              type="button"
              onClick={handleResend}
              className="mt-5 text-sm font-semibold text-primary-vibrant hover:text-primary-hover"
            >
              Não recebeu? Reenviar e-mail
            </button>
            {resendMsg && <p className="text-sm text-success mt-2">{resendMsg}</p>}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm font-semibold text-text-secondary hover:text-text-primary"
              >
                Voltar para o login
              </button>
            </div>
          </div>
          ) : (
          <>
          <h2 className="text-2xl font-bold text-text-primary">
            {isLogin ? 'Bem-vindo de volta 👋' : 'Crie sua conta'}
          </h2>
          <p className="text-text-secondary mt-1 mb-8">
            {isLogin
              ? 'Entre para acessar toda a plataforma.'
              : 'Leva menos de um minuto e libera tudo.'}
          </p>

          {sessionExpired && isLogin && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
              Sua sessão expirou. Entre novamente para continuar.
            </div>
          )}

          {verifiedParam === '1' && isLogin && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              E-mail confirmado! Faça login para entrar.
            </div>
          )}
          {verifiedParam === '0' && isLogin && (
            <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              Link inválido ou expirado. Faça login para reenviar a confirmação.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                label="Nome"
                placeholder="Seu nome"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                autoFocus
              />
            )}
            <Input
              label="E-mail"
              type="email"
              placeholder="voce@email.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              autoFocus={isLogin}
            />
            <PasswordInput
              label="Senha"
              placeholder="••••••••"
              value={form.password}
              onChange={e => set('password', e.target.value)}
            />
            {!isLogin && (
              <p className="text-xs text-text-secondary -mt-2">
                Use ao menos 8 caracteres, com letra e número.
              </p>
            )}

            {isLogin && (
              <div className="-mt-2 text-right">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm font-semibold text-primary-vibrant hover:text-primary-hover"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" isLoading={loading} className="w-full rounded-xl" size="lg">
              {isLogin ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          <p className="text-sm text-text-secondary text-center mt-6">
            {isLogin ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
            <button
              onClick={() =>
                navigate(
                  `${isLogin ? '/register' : '/login'}${
                    redirectTo !== '/' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''
                  }`,
                )
              }
              className="font-semibold text-primary-vibrant hover:text-primary-hover"
            >
              {isLogin ? 'Criar conta' : 'Entrar'}
            </button>
          </p>

          <div className="flex items-center gap-3 my-6">
            <span className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-soft">ou</span>
            <span className="flex-1 h-px bg-border" />
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-primary hover:bg-bg-secondary transition-colors"
          >
            Continuar como visitante
            <ArrowRight size={16} />
          </button>
          <p className="text-xs text-text-secondary text-center mt-2">
            Visitantes usam o Dashboard e Minhas Tarefas, com até 3 tarefas por dia.
          </p>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
