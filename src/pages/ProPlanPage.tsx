import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Check, ExternalLink, ShieldCheck, CreditCard } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Mascot } from '@/components/mascot/Mascot';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { billingService } from '@/services/billingService';
import { useProStatus } from '@/contexts/ProContext';
import { ANDROID_PACKAGE, PLAY_SKU, FREE_PROJECT_LIMIT, PRO_PRECO } from '@/utils/playConfig';
import { linkGerenciarAssinatura, linkLoja } from '@/utils/twa';
import * as play from '@/utils/playBilling';

/** O que o Pro inclui. Espelha docs/google-play.md (fatia 5) e os Termos (6.4). */
const BENEFICIOS = [
  { titulo: 'Equipes', detalhe: 'crie equipes; quem você convida entra de graça' },
  { titulo: 'Ideias, agenda e foco', detalhe: 'registre, marque compromissos e faça sessões de foco' },
  { titulo: '15 usos do assistente por semana', detalhe: 'no lugar dos 5 da conta gratuita' },
  { titulo: 'Projetos ilimitados', detalhe: `a conta gratuita tem ${FREE_PROJECT_LIMIT} em andamento` },
  { titulo: 'Tarefas, calendário e metas', detalhe: 'continuam grátis para todo mundo, sem limite' },
  { titulo: 'Cancela quando quiser', detalhe: 'sem ligar nem explicar' },
];

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * A página do Pro quando o Pro EXISTE.
 *
 * `modo='app'`: dentro do app da Play Store; a compra é pelo Play Billing.
 * `modo='web'`: no site, com o Mercado Pago ligado; a compra é no cartão,
 * na página do Mercado Pago, e a pessoa volta para cá (`?retorno=mp`).
 * `modo='loja'`: no site, sem web; manda para a ficha do app na loja.
 * Em todos, quem já é Pro vê o estado e como gerenciar.
 *
 * Dentro do app nada aponta para pagar FORA da Play Store — é motivo de
 * rejeição. O `modo` já chega decidido (`ondeAssinar`); esta página não
 * escolhe.
 */
const ProPlanPage: React.FC<{ modo: 'app' | 'web' | 'loja' }> = ({ modo }) => {
  const { status: auth } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const logado = auth === 'authed';

  // O status vem do ProContext, que o app inteiro lê: comprar aqui destrava
  // as outras áreas sem recarregar a página.
  const { status: pro, recarregar } = useProStatus();
  const [preco, setPreco] = useState<string | null>(null);
  const [comprando, setComprando] = useState(false);
  const podeComprarAqui = modo === 'app' && play.disponivel();
  const [params, setParams] = useSearchParams();

  // Voltou do checkout do Mercado Pago: o webhook pode ainda não ter
  // chegado, então pedimos ao servidor para conferir agora. O parâmetro sai
  // da URL para um F5 não repetir o sync (inofensivo, mas inútil).
  useEffect(() => {
    if (params.get('retorno') !== 'mp') return;
    setParams((p) => {
      p.delete('retorno');
      return p;
    }, { replace: true });
    void (async () => {
      try {
        const novo = await billingService.syncMercadoPago();
        await recarregar();
        toast.success(
          novo.pro
            ? 'Bem-vindo ao Pro!'
            : 'Ainda não recebemos a confirmação do Mercado Pago. Se você concluiu o pagamento, ela chega em instantes.',
        );
      } catch {
        /* o status do contexto continua valendo; o webhook resolve */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assinarWeb = async () => {
    if (!logado) {
      navigate('/login?redirect=%2Fapoiar');
      return;
    }
    setComprando(true);
    try {
      const { url } = await billingService.checkoutMercadoPago();
      window.location.assign(url);
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível abrir o pagamento.');
      setComprando(false);
    }
  };

  const [cancelando, setCancelando] = useState(false);
  const cancelarWeb = async () => {
    if (!window.confirm('Cancelar a assinatura? O Pro continua até o fim do período já pago.')) return;
    setCancelando(true);
    try {
      await billingService.cancelMercadoPago();
      await recarregar();
      toast.success('Assinatura cancelada. O Pro vale até o fim do período pago.');
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível cancelar agora.');
    } finally {
      setCancelando(false);
    }
  };

  useEffect(() => {
    if (!podeComprarAqui) return;
    play
      .precoDoProduto(PLAY_SKU)
      .then(setPreco)
      .catch(() => setPreco(null));
  }, [podeComprarAqui]);

  const assinar = async () => {
    if (!logado) {
      navigate('/login?redirect=%2Fapoiar');
      return;
    }
    setComprando(true);
    let compra: play.Compra | null = null;
    try {
      compra = await play.comprar(PLAY_SKU);
      // A compra já aconteceu no Google. Só o servidor pode dizer que ela vale:
      // ele confere com o Google, vincula à conta e RECONHECE — sem isso o
      // dinheiro volta em 3 dias.
      const novo = await billingService.verifyGoogle(compra.purchaseToken);
      await compra.concluir(true);
      await recarregar();
      toast.success(novo.pro ? 'Bem-vindo ao Pro!' : 'Compra registrada. O Google ainda está confirmando o pagamento.');
    } catch (err) {
      // Folha fechada pela pessoa (AbortError) não é erro nosso.
      const e = err as Error;
      if (compra) await compra.concluir(false).catch(() => undefined);
      if (e?.name !== 'AbortError') {
        toast.error(e?.message || 'Não foi possível concluir a assinatura.');
      }
    } finally {
      setComprando(false);
    }
  };

  const titulo = 'Fassaja Pro';

  if (pro?.pro) {
    return (
      <AppLayout title={titulo} subtitle="Sua assinatura">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card padding="lg" className="text-center">
            <div className="flex justify-center mb-4">
              <Mascot state="celebrate" size="md" animate />
            </div>
            <h2 className="text-xl font-bold text-text-primary">Você é Pro</h2>
            <p className="mt-2 text-text-secondary">
              {pro.autoRenewing ? (
                <>Renova em <strong className="text-text-primary">{pro.until && formatarData(pro.until)}</strong>.</>
              ) : (
                <>
                  Renovação cancelada — o Pro continua até{' '}
                  <strong className="text-text-primary">{pro.until && formatarData(pro.until)}</strong>.
                </>
              )}
            </p>
            {pro.provider === 'mercado_pago' ? (
              pro.autoRenewing ? (
                <button
                  type="button"
                  onClick={cancelarWeb}
                  disabled={cancelando}
                  className="mt-5 text-sm font-medium text-text-secondary underline underline-offset-2 hover:text-danger disabled:opacity-60"
                >
                  {cancelando ? 'Cancelando…' : 'Cancelar assinatura'}
                </button>
              ) : null
            ) : (
              <a
                href={linkGerenciarAssinatura(ANDROID_PACKAGE, PLAY_SKU)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary-vibrant hover:text-primary-hover"
              >
                Gerenciar na Play Store <ExternalLink size={14} />
              </a>
            )}
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={titulo} subtitle="Mais assistente, mesmo Fassaja">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card padding="lg">
          <div className="flex items-start gap-4">
            <span className="w-12 h-12 shrink-0 rounded-2xl bg-primary-light text-primary-vibrant flex items-center justify-center">
              <Sparkles size={22} />
            </span>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-text-primary">O que o Pro inclui</h2>
              <ul className="mt-3 space-y-2.5">
                {BENEFICIOS.map((b) => (
                  <li key={b.titulo} className="flex items-start gap-2.5 text-sm">
                    <Check size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                    <span>
                      <strong className="text-text-primary">{b.titulo}</strong>{' '}
                      <span className="text-text-secondary">— {b.detalhe}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="text-center">
          {modo === 'app' ? (
            <>
              <p className="text-2xl font-bold text-text-primary tabular-nums">
                {preco ?? 'Assinatura mensal'}
                {preco && <span className="text-base font-normal text-text-secondary"> / mês</span>}
              </p>
              <p className="mt-1 text-sm text-text-soft">
                Cobrado pelo Google Play. Renova todo mês até você cancelar.
              </p>
              <Button
                size="lg"
                className="mt-5 w-full sm:w-auto rounded-xl"
                onClick={assinar}
                isLoading={comprando}
                disabled={!podeComprarAqui}
              >
                {logado ? 'Assinar o Pro' : 'Entrar para assinar'}
              </Button>
              {!podeComprarAqui && (
                <p className="mt-3 text-sm text-danger">
                  A loja não respondeu. Feche e abra o app de novo; se continuar, atualize o Google
                  Play.
                </p>
              )}
            </>
          ) : modo === 'web' ? (
            <>
              <p className="text-2xl font-bold text-text-primary tabular-nums">
                {PRO_PRECO}
                <span className="text-base font-normal text-text-secondary"> / mês</span>
              </p>
              <p className="mt-1 text-sm text-text-soft">
                No cartão de crédito, pelo Mercado Pago. Renova todo mês até você cancelar — aqui
                mesmo, em um clique.
              </p>
              <Button
                size="lg"
                className="mt-5 w-full sm:w-auto rounded-xl"
                onClick={assinarWeb}
                isLoading={comprando}
              >
                <CreditCard size={18} className="mr-2" />
                {logado ? 'Assinar o Pro' : 'Entrar para assinar'}
              </Button>
              {ANDROID_PACKAGE && (
                <p className="mt-3 text-xs text-text-soft">
                  Prefere pela Play Store?{' '}
                  <a
                    href={linkLoja(ANDROID_PACKAGE)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    Instale o app Android
                  </a>{' '}
                  e assine por lá — vale na mesma conta.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-text-primary">O Pro é assinado pelo app Android</p>
              <p className="mt-1 text-sm text-text-secondary">
                Instale o Fassaja pela Play Store, assine por lá e o Pro vale aqui no site também —
                é a mesma conta.
              </p>
              <a
                href={linkLoja(ANDROID_PACKAGE)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-vibrant px-6 py-3 text-lg font-medium text-white hover:bg-primary-hover"
              >
                Abrir na Play Store <ExternalLink size={16} />
              </a>
            </>
          )}
          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-text-soft">
            <ShieldCheck size={14} />
            7 dias para se arrepender, sem perguntas. Ver os{' '}
            <a href="/termos" className="underline underline-offset-2">Termos</a>.
          </p>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ProPlanPage;
