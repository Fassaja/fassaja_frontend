import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MailCheck, KeyRound, CheckCircle2 } from 'lucide-react';
import { Mascot } from '@/components/mascot/Mascot';
import { Input } from '@/components/common/Input';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Button } from '@/components/common/Button';
import { forgotPassword, resetPassword } from '@/services/authService';

interface PasswordResetPageProps {
  /** 'request' = pede o e-mail; 'reset' = define a nova senha (via link). */
  mode: 'request' | 'reset';
}

// Mesma regra do backend (RegisterDto): 8+ caracteres, com letra e número.
// Validar aqui é só conveniência — quem manda é o servidor.
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const PasswordResetPage: React.FC<PasswordResetPageProps> = ({ mode }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Informe seu e-mail.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      // Sucesso sempre — a resposta é genérica de propósito (não revela se a
      // conta existe). Mostramos a mesma tela nos dois casos.
      setDone(true);
    } catch (err) {
      setError((err as Error).message || 'Algo deu errado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PASSWORD_RULE.test(password)) {
      setError('A senha deve ter ao menos 8 caracteres, incluindo letra e número.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não são iguais.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError((err as Error).message || 'Algo deu errado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Link sem token: chegou aqui por engano ou o e-mail foi truncado.
  const missingToken = mode === 'reset' && !token;

  return (
    <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <Mascot state={done ? 'happy' : 'confused'} size="sm" animate />
        </div>
        <div className="mt-4 mb-8 flex justify-center">
          <div className="h-12 flex items-center justify-center overflow-hidden">
            <img
              src="/logofassaja.png"
                data-logo
              alt="Fassaja"
              className="max-w-none w-56 h-auto object-contain select-none"
              draggable={false}
            />
          </div>
        </div>

        {/* Sucesso: e-mail enviado */}
        {done && mode === 'request' && (
          <div className="text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center">
              <MailCheck size={28} className="text-primary-vibrant" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Confira seu e-mail</h2>
            <p className="text-text-secondary mt-2">
              Se <strong className="text-text-primary">{email.trim()}</strong> estiver cadastrado,
              enviamos um link para criar uma nova senha. Ele vale por 1 hora.
            </p>
            <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-300">
              ⚠️ Não encontrou? Verifique a caixa de <strong>spam</strong> ou lixo eletrônico.
            </div>
          </div>
        )}

        {/* Sucesso: senha redefinida */}
        {done && mode === 'reset' && (
          <div className="text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-300" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Senha redefinida!</h2>
            <p className="text-text-secondary mt-2">
              Por segurança, encerramos as sessões abertas em outros dispositivos. Entre novamente
              com a senha nova.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full rounded-xl mt-6" size="lg">
              Ir para o login
            </Button>
          </div>
        )}

        {/* Formulário: pedir o e-mail */}
        {!done && mode === 'request' && (
          <>
            <h2 className="text-2xl font-bold text-text-primary">Esqueceu a senha?</h2>
            <p className="text-text-secondary mt-1 mb-8">
              Informe o e-mail da sua conta e enviamos um link para você criar uma nova.
            </p>
            <form onSubmit={handleRequest} className="space-y-4">
              <Input
                label="E-mail"
                type="email"
                placeholder="voce@email.com"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                autoFocus
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" isLoading={loading} className="w-full rounded-xl" size="lg">
                Enviar link
              </Button>
            </form>
          </>
        )}

        {/* Formulário: nova senha */}
        {!done && mode === 'reset' && (
          <>
            <h2 className="text-2xl font-bold text-text-primary">Criar nova senha</h2>
            <p className="text-text-secondary mt-1 mb-8">
              Escolha uma senha nova para sua conta.
            </p>

            {missingToken ? (
              <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700 dark:text-rose-300">
                Link inválido ou incompleto. Peça um novo e-mail de redefinição.
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <PasswordInput
                  label="Nova senha"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  autoFocus
                />
                <p className="text-xs text-text-secondary -mt-2">
                  Use ao menos 8 caracteres, com letra e número.
                </p>
                <PasswordInput
                  label="Repita a nova senha"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => {
                    setConfirm(e.target.value);
                    if (error) setError('');
                  }}
                />
                {error && <p className="text-sm text-danger">{error}</p>}
                <Button
                  type="submit"
                  isLoading={loading}
                  icon={<KeyRound size={18} />}
                  className="w-full rounded-xl"
                  size="lg"
                >
                  Redefinir senha
                </Button>
              </form>
            )}
          </>
        )}

        {/* Volta ao login (some na tela de sucesso do reset, que já tem CTA) */}
        {!(done && mode === 'reset') && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft size={16} />
              Voltar para o login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordResetPage;
