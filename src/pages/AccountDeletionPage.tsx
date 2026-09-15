import React, { useState } from 'react';
import { useTelaSensivel } from '@/hooks/useTelaSensivel';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ShieldQuestion, Trash2 } from 'lucide-react';
import { Mascot } from '@/components/mascot/Mascot';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { deleteAccount } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Confirmação final da exclusão de conta, aberta pelo link do e-mail.
 *
 * Existe porque quem entra só pelo Google não tem senha para confirmar a
 * exclusão, e o servidor passou a exigir uma prova que o cookie de sessão
 * sozinho não dá — a exclusão é irreversível, e antes bastava a sessão.
 *
 * A prova é o token que só chega na caixa de e-mail. O caminho natural seria
 * um ID token do Google, mas o login usa o GIS em modo REDIRECT (o Google faz
 * um POST de navegação direto para a API, porque o popup quebrava no celular e
 * no PWA): nesse modo o navegador nunca vê um token, então não há o que enviar.
 *
 * NADA acontece ao abrir esta página — e isso não é excesso de zelo. Um link
 * que apagasse a conta por GET seria disparado sozinho pelos antivírus e
 * pré-carregadores que varrem links de e-mail: a conta sumiria antes de a
 * pessoa abrir a mensagem. Quem exclui é o botão, com o texto digitado.
 *
 * Não é uma tela "sempre clara" como as de login: quem chega aqui está logado e
 * tem uma preferência de tema. Por isso ela fica fora de LIGHT_ONLY_PATHS.
 */
const AccountDeletionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Lido uma vez: logo em seguida o token sai da barra de endereço.
  const [token] = useState(() => searchParams.get('token') ?? '');
  useTelaSensivel({ limparQuery: true });
  const { account, status, logout } = useAuth();

  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirm.trim().toUpperCase() !== 'EXCLUIR') {
      setError('Digite EXCLUIR para confirmar.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await deleteAccount({ token });
      setDone(true);
      // A conta não existe mais: `logout` limpa o que está espelhado neste
      // navegador. Sem ele, o app seguiria mostrando nome e avatar de uma conta
      // que já foi apagada.
      logout({ redirect: false });
    } catch (err) {
      setError((err as Error).message || 'Não foi possível excluir a conta.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <Mascot state={done ? 'sad' : 'confused'} size="sm" animate />
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

        {/* Feito. Sem botão de "voltar ao app": não há mais app para voltar. */}
        {done && (
          <div className="text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-bg-secondary flex items-center justify-center">
              <CheckCircle2 size={28} className="text-text-secondary" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Conta excluída</h2>
            <p className="text-text-secondary mt-2">
              Seus dados pessoais foram apagados. O que você criou dentro de equipes continua com
              elas, para não apagar o trabalho de outras pessoas.
            </p>
            <p className="text-text-secondary mt-2 text-sm">Obrigado por ter usado o Fassaja.</p>
            <Button
              onClick={() => navigate('/login')}
              variant="secondary"
              className="w-full rounded-xl mt-6"
              size="lg"
            >
              Voltar ao início
            </Button>
          </div>
        )}

        {/* Link sem token: e-mail truncado, ou alguém chegou aqui por engano. */}
        {!done && !token && (
          <div className="text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <ShieldQuestion size={28} className="text-amber-600 dark:text-amber-300" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Link incompleto</h2>
            <p className="text-text-secondary mt-2">
              Este endereço não traz o código de confirmação. Copie o link do e-mail inteiro, ou
              peça outro nas Configurações.
            </p>
            <Button
              onClick={() => navigate('/settings')}
              variant="secondary"
              className="w-full rounded-xl mt-6"
              size="lg"
            >
              Ir para Configurações
            </Button>
          </div>
        )}

        {/* O link abriu num navegador sem sessão (outro aparelho, aba anônima).
            A exclusão é escopada na sessão: o token sozinho não basta, e isso é
            proposital — quem interceptar o e-mail ainda precisa estar logado. */}
        {!done && token && status !== 'authed' && (
          <div className="text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <ShieldQuestion size={28} className="text-amber-600 dark:text-amber-300" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary">Entre para confirmar</h2>
            <p className="text-text-secondary mt-2">
              Abra este link no aparelho onde você está conectado, ou entre na sua conta e clique
              nele de novo. Só quem está dentro da conta pode excluí-la.
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="w-full rounded-xl mt-6"
              size="lg"
            >
              Entrar na conta
            </Button>
          </div>
        )}

        {/* O caminho normal. */}
        {!done && token && status === 'authed' && (
          <>
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
              <Trash2 size={28} className="text-danger" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary text-center">
              Excluir sua conta
            </h2>
            {account?.email && (
              <p className="text-text-secondary mt-1 text-center text-sm">{account.email}</p>
            )}

            <div className="mt-6 flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-700 dark:text-rose-300">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                Isto é permanente. Seu perfil, projetos individuais, tarefas, etiquetas, eventos e
                sua sequência são apagados e não podem ser recuperados.
              </span>
            </div>

            <p className="text-text-secondary mt-4 text-sm">
              O que você criou em equipes fica com a equipe. Equipes das quais você é dono passam
              para o membro mais antigo — e, se você for o único integrante, a equipe é excluída
              junto.
            </p>
            <p className="text-text-secondary mt-2 text-sm">
              Assina o Pro pelo Google Play? Excluir a conta <strong>não cancela a assinatura</strong>{' '}
              — cancele na Play Store também, senão a cobrança continua.
            </p>

            <form onSubmit={handleDelete} className="space-y-4 mt-6">
              <Input
                label="Digite EXCLUIR para confirmar"
                placeholder="EXCLUIR"
                value={confirm}
                onChange={e => {
                  setConfirm(e.target.value);
                  if (error) setError('');
                }}
                autoFocus
              />

              {error && <p className="text-sm text-danger">{error}</p>}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 rounded-xl"
                  onClick={() => navigate('/settings')}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  className="flex-1 rounded-xl"
                  isLoading={loading}
                >
                  Excluir para sempre
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AccountDeletionPage;
