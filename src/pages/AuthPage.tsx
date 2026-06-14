import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Logo } from '@/components/common/Logo';
import { Mascot } from '@/components/mascot/Mascot';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/contexts/AuthContext';

interface AuthPageProps {
  mode: 'login' | 'register';
}

const AuthPage: React.FC<AuthPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const isLogin = mode === 'login';

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
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
    const result = isLogin
      ? login(form.email, form.password)
      : register(form.name, form.email, form.password);
    setLoading(false);

    if (result.ok) {
      navigate('/');
    } else {
      setError(result.error ?? 'Algo deu errado. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex">
      {/* Brand panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-vibrant to-primary-dark text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="bg-white rounded-2xl px-4 py-3 w-fit">
          <Logo size="lg" showImage />
        </div>

        <div className="relative z-10">
          <Mascot state="strong" size="xl" animate />
          <h1 className="text-3xl font-extrabold mt-6 leading-tight max-w-md">
            Organize seu dia e conquiste suas metas com o Fassaja.
          </h1>
          <p className="text-white/80 mt-3 max-w-md">
            Tarefas, projetos, calendário e relatórios — tudo num só lugar, com aquele empurrãozinho
            motivacional.
          </p>
        </div>

        <div className="absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-white/10" />
        <div className="absolute right-24 top-20 w-32 h-32 rounded-full bg-white/10" />
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size="lg" showImage />
          </div>

          <h2 className="text-2xl font-bold text-text-primary">
            {isLogin ? 'Bem-vindo de volta 👋' : 'Crie sua conta'}
          </h2>
          <p className="text-text-secondary mt-1 mb-8">
            {isLogin
              ? 'Entre para acessar toda a plataforma.'
              : 'Leva menos de um minuto e libera tudo.'}
          </p>

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
            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => set('password', e.target.value)}
            />

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" isLoading={loading} className="w-full rounded-xl" size="lg">
              {isLogin ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          <p className="text-sm text-text-secondary text-center mt-6">
            {isLogin ? 'Ainda não tem conta?' : 'Já tem uma conta?'}{' '}
            <button
              onClick={() => navigate(isLogin ? '/register' : '/login')}
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
          <p className="text-xs text-text-soft text-center mt-2">
            Visitantes usam o Dashboard e Minhas Tarefas, com até 3 tarefas por dia.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
