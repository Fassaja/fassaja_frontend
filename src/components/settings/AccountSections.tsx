import React, { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { Input } from '@/components/common/Input';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Button } from '@/components/common/Button';
import { forgotPassword } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

/**
 * Nome e senha da conta.
 *
 * Ficavam no Perfil, que passou a ser só o retrato de quem você é (foto,
 * números, sequência, conquistas). Trocar nome e senha é ajuste de conta, e
 * ajuste de conta mora em Configurações — onde, aliás, a exclusão de conta já
 * estava. Ter as duas telas mexendo em dados da conta obrigava a lembrar em
 * qual delas cada coisa estava.
 *
 * As duas seções vêm juntas num componente porque compartilham as regras de
 * carência (30 dias) e a mesma noção de "credenciais desta conta".
 */

const COOLDOWN_DAYS = 30;

/** Dias restantes de carência (0 = liberado). */
function cooldownLeft(iso?: string | null): number {
  if (!iso) return 0;
  const remaining = COOLDOWN_DAYS * 86400000 - (Date.now() - new Date(iso).getTime());
  return remaining <= 0 ? 0 : Math.ceil(remaining / 86400000);
}

/** Data em que a próxima alteração fica disponível. */
function availableOn(iso: string): string {
  return new Date(new Date(iso).getTime() + COOLDOWN_DAYS * 86400000).toLocaleDateString('pt-BR');
}

/** Plural correto ("1 dia" / "3 dias") em vez do "dia(s)". */
function days(n: number): string {
  return n === 1 ? '1 dia' : `${n} dias`;
}

export const AccountNameSection: React.FC = () => {
  const { account, updateName } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(account?.name ?? '');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // O nome pode chegar depois (F5 direto aqui, com o perfil ainda carregando).
  useEffect(() => {
    setName(account?.name ?? '');
  }, [account?.name]);

  const left = cooldownLeft(account?.nameChangedAt);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === account?.name) return;
    setLoading(true);
    const result = await updateName(trimmed);
    setLoading(false);
    if (result.ok) {
      setMsg(null);
      toast.success('Nome atualizado.');
    } else {
      setMsg(result.error ?? 'Não foi possível alterar o nome.');
    }
  };

  return (
    <>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Nome"
            value={name}
            onChange={e => {
              setName(e.target.value);
              if (msg) setMsg(null);
            }}
            placeholder="Seu nome"
            disabled={left > 0 || loading}
          />
          <Input label="E-mail" type="email" value={account?.email ?? ''} disabled readOnly />
        </div>

        {left > 0 ? (
          <p className="text-sm text-amber-600 dark:text-amber-300 inline-flex items-center gap-1.5">
            <Lock size={14} />
            Disponível em {days(left)}
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
                isLoading={loading}
                disabled={!name.trim() || name.trim() === account?.name}
              >
                Salvar nome
              </Button>
              {msg && <span className="text-sm text-danger">{msg}</span>}
            </div>
          </>
        )}
      </form>
    </>
  );
};

export const AccountPasswordSection: React.FC = () => {
  const { account, changePassword } = useAuth();
  const toast = useToast();

  const [pw, setPw] = useState({ current: '', next: '' });
  const [loading, setLoading] = useState(false);
  // Envio do link para definir a PRIMEIRA senha (contas do Google).
  const [defining, setDefining] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const left = cooldownLeft(account?.passwordChangedAt);

  /**
   * Primeira senha de uma conta do Google.
   *
   * Reusa o "esqueci minha senha" de propósito: definir uma senha sem ter uma
   * anterior para comparar precisa de outra prova de identidade, e o link por
   * e-mail é exatamente essa prova. Um botão que definisse a senha direto na
   * tela aceitaria qualquer sessão sequestrada.
   */
  const handleDefine = async () => {
    if (!account?.email || defining) return;
    setDefining(true);
    try {
      await forgotPassword(account.email);
      setMsg({
        type: 'ok',
        text: `Link enviado para ${account.email}. Confira sua caixa de entrada.`,
      });
    } catch {
      setMsg({ type: 'error', text: 'Não foi possível enviar o link. Tente de novo.' });
    } finally {
      setDefining(false);
    }
  };

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Valida aqui antes de enviar. Sem isto, um campo vazio só era pego pelo
    // servidor e voltava como "current must be longer than or equal to 1
    // characters" — mensagem crua do validador, em inglês, na cara do usuário.
    if (!pw.current) {
      setMsg({ type: 'error', text: 'Digite sua senha atual.' });
      return;
    }
    if (!pw.next) {
      setMsg({ type: 'error', text: 'Digite a nova senha.' });
      return;
    }

    setLoading(true);
    const result = await changePassword(pw.current, pw.next);
    setLoading(false);
    if (result.ok) {
      setMsg(null);
      setPw({ current: '', next: '' });
      toast.success('Senha atualizada com sucesso.');
    } else {
      setMsg({ type: 'error', text: result.error ?? 'Não foi possível alterar a senha.' });
    }
  };

  return (
    <>
      {/* Conta do Google ainda sem senha: pedir a "senha atual" seria pedir
          algo que não existe. Definir a primeira senha passa pelo mesmo fluxo
          do "esqueci minha senha", que prova o controle do e-mail — é o que o
          servidor exige, e aqui a tela deixa isso explícito em vez de deixar a
          pessoa travada num campo impossível. */}
      {account?.hasPassword === false ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-bg-secondary/60 px-4 py-3 text-sm text-text-secondary inline-flex items-start gap-2">
            <Lock size={15} className="mt-0.5 shrink-0" />
            <span>
              Você entra com o Google, então esta conta ainda não tem senha. Dá para definir uma e
              passar a entrar das duas formas.
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button type="button" className="rounded-xl" isLoading={defining} onClick={handleDefine}>
              Definir senha
            </Button>
            {msg && (
              <span className={`text-sm ${msg.type === 'error' ? 'text-danger' : 'text-success'}`}>
                {msg.text}
              </span>
            )}
          </div>
        </div>
      ) : left > 0 ? (
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-300 inline-flex items-center gap-2">
          <Lock size={15} />
          Você já alterou a senha recentemente. Poderá trocar novamente em {days(left)}
          {account?.passwordChangedAt && ` (em ${availableOn(account.passwordChangedAt)})`}.
        </div>
      ) : (
        <form onSubmit={handleChange} className="grid sm:grid-cols-2 gap-4">
          {/* `autoComplete` não é enfeite aqui: sem ele o navegador não sabe
              qual campo é qual e preenche por conta própria. O campo ficava com
              os pontinhos na tela enquanto o estado do React seguia vazio — e o
              servidor recebia a senha atual em branco. `new-password` ainda
              impede que a senha salva seja injetada no campo da senha NOVA. */}
          <PasswordInput
            label="Senha atual"
            autoComplete="current-password"
            value={pw.current}
            onChange={e => {
              setPw(p => ({ ...p, current: e.target.value }));
              if (msg) setMsg(null);
            }}
            placeholder="••••••••"
          />
          <PasswordInput
            label="Nova senha"
            autoComplete="new-password"
            value={pw.next}
            onChange={e => {
              setPw(p => ({ ...p, next: e.target.value }));
              if (msg) setMsg(null);
            }}
            placeholder="Pelo menos 8 caracteres, com letra e número"
          />
          <p className="sm:col-span-2 text-xs text-text-secondary -mt-1">
            Após alterar, você só poderá trocar a senha novamente daqui a 30 dias.
          </p>
          <div className="sm:col-span-2 flex items-center gap-4">
            <Button type="submit" className="rounded-xl" isLoading={loading}>
              Alterar senha
            </Button>
            {msg && (
              <span className={`text-sm ${msg.type === 'error' ? 'text-danger' : 'text-success'}`}>
                {msg.text}
              </span>
            )}
          </div>
        </form>
      )}
    </>
  );
};
