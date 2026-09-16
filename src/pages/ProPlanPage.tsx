import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Check,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Users,
  FolderKanban,
  Lightbulb,
  CalendarDays,
  Timer,
  ChevronDown,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Mascot } from '@/components/mascot/Mascot';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { billingService } from '@/services/billingService';
import { useProStatus } from '@/contexts/ProContext';
import { ANDROID_PACKAGE, PLAY_SKU, FREE_PROJECT_LIMIT, PRO_PRECO, PRO_WEEKLY_LIMIT } from '@/utils/playConfig';
import { linkLoja } from '@/utils/twa';
import { AssinaturaAtual } from '@/components/pro/AssinaturaAtual';
import * as play from '@/utils/playBilling';

/** O que o Pro destrava. Espelha docs/google-play.md (fatia 5) e os Termos (8.1). */
const DESTRAVA = [
  { icone: <Users size={20} />, titulo: 'Equipes', detalhe: 'Crie equipes e distribua o trabalho. Quem você convida entra de graça.' },
  { icone: <FolderKanban size={20} />, titulo: 'Projetos sem teto', detalhe: `Quantos quiser em andamento — a conta gratuita para em ${FREE_PROJECT_LIMIT}.` },
  { icone: <Lightbulb size={20} />, titulo: 'Ideias', detalhe: 'Registre agora, transforme em projeto quando for a hora.' },
  { icone: <CalendarDays size={20} />, titulo: 'Agenda', detalhe: 'Compromissos com hora marcada, separados das tarefas.' },
  { icone: <Timer size={20} />, titulo: 'Foco', detalhe: 'Uma tarefa, um tempo, o Bob de olho. Sem o resto do mundo.' },
  { icone: <Sparkles size={20} />, titulo: `${PRO_WEEKLY_LIMIT} usos do assistente por semana`, detalhe: 'Três vezes mais que a conta gratuita para transformar texto em plano.' },
];

const FAQ = [
  { p: 'Posso cancelar quando quiser?', r: 'Sim, em um clique, aqui mesmo ou nas Configurações. Você mantém o Pro até o fim do mês já pago e não é cobrado de novo. Sem ligação, sem motivo.' },
  { p: 'E se eu me arrepender?', r: 'Você tem 7 dias para pedir o dinheiro de volta, integral, sem perguntas.' },
  { p: 'Perco algo se deixar de ser Pro?', r: 'Não. Tudo o que você criou continua visível e é seu. Só criar e editar nas áreas do Pro passa a pedir a assinatura de novo.' },
  { p: 'Vale no celular e no computador?', r: 'Sim. A assinatura é da sua conta, não do aparelho: assinou num, vale em todos.' },
];

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
            <div className="mt-2">
              <AssinaturaAtual align="center" />
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const cta = logado ? 'Assinar o Pro' : 'Entrar para assinar';

  // O botão de cada caminho. Fica num lugar só para o bloco de preço não
  // repetir três vezes o mesmo par botão + ressalva.
  const botao =
    modo === 'app' ? (
      <>
        <Button size="lg" className="w-full sm:w-72 rounded-xl" onClick={assinar} isLoading={comprando} disabled={!podeComprarAqui}>
          <Sparkles size={18} /> {cta}
        </Button>
        {!podeComprarAqui && (
          <p className="text-sm text-danger">
            A loja não respondeu. Feche e abra o app de novo; se continuar, atualize o Google Play.
          </p>
        )}
      </>
    ) : modo === 'web' ? (
      <Button size="lg" className="w-full sm:w-72 rounded-xl" onClick={assinarWeb} isLoading={comprando}>
        <CreditCard size={18} /> {cta}
      </Button>
    ) : (
      <a
        href={linkLoja(ANDROID_PACKAGE)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full sm:w-72 items-center justify-center gap-2 rounded-xl bg-primary-vibrant px-6 py-3 text-lg font-semibold text-white hover:bg-primary-hover"
      >
        Abrir na Play Store <ExternalLink size={16} />
      </a>
    );

  const precoTexto = modo === 'app' ? preco ?? PRO_PRECO : PRO_PRECO;

  return (
    <AppLayout title={titulo} subtitle="Para quem já faz do Fassaja parte do dia">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Abertura: o Bob e a promessa. O Pro não é "mais recursos", é o
            Fassaja sem teto para quem já o usa todo dia — a página fala com
            essa pessoa, não com quem chegou ontem. */}
        <section className="relative overflow-hidden rounded-3xl border border-primary-vibrant/20 bg-gradient-to-br from-primary-light via-surface to-surface p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Mascot state="strong" size="lg" animate />
            <div className="text-center sm:text-left">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-vibrant/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-vibrant">
                <Sparkles size={13} /> Fassaja Pro
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold leading-tight text-text-primary">
                Você já organiza o seu dia aqui.
                <br />
                Agora organize o resto.
              </h2>
              <p className="mt-3 text-text-secondary leading-relaxed">
                Equipes para trabalhar junto, ideias para não perder nada, agenda e foco para
                o tempo render — e o assistente três vezes mais presente. Por menos de{' '}
                <strong className="text-text-primary">R$ 0,50 por dia</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* O que destrava, um cartão por coisa: dá para bater o olho e achar
            a que a pessoa já sentiu falta. */}
        <section className="grid gap-3 sm:grid-cols-2">
          {DESTRAVA.map((b) => (
            <Card key={b.titulo} padding="md" className="flex items-start gap-3">
              <span className="mt-0.5 w-10 h-10 shrink-0 rounded-xl bg-primary-light text-primary-vibrant flex items-center justify-center">
                {b.icone}
              </span>
              <div>
                <h3 className="font-semibold text-text-primary">{b.titulo}</h3>
                <p className="mt-0.5 text-sm text-text-secondary leading-relaxed">{b.detalhe}</p>
              </div>
            </Card>
          ))}
        </section>

        {/* Preço e o botão — tudo centralizado num eixo só. */}
        <Card padding="lg" className="border-primary-vibrant/30">
          <div className="flex flex-col items-center text-center gap-4">
            <div>
              <p className="text-4xl font-bold tabular-nums text-text-primary">
                {precoTexto}
                <span className="text-lg font-normal text-text-secondary"> / mês</span>
              </p>
              <p className="mt-1 text-sm text-text-soft">
                {modo === 'web'
                  ? 'No cartão de crédito, pelo Mercado Pago.'
                  : 'Cobrado pela Google Play.'}{' '}
                Renova todo mês até você cancelar.
              </p>
            </div>
            {botao}
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs text-text-soft">
              <li className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> 7 dias para se arrepender</li>
              <li className="inline-flex items-center gap-1.5"><Check size={14} /> Cancela em um clique</li>
              <li className="inline-flex items-center gap-1.5"><Check size={14} /> Vale no site e no app</li>
            </ul>
            {modo === 'web' && ANDROID_PACKAGE && (
              <p className="text-xs text-text-soft">
                Prefere pela Play Store?{' '}
                <a href={linkLoja(ANDROID_PACKAGE)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  Instale o app Android
                </a>{' '}
                e assine por lá — mesma conta.
              </p>
            )}
          </div>
        </Card>

        {/* O que NÃO muda. Dizer isso é o que faz o resto ser crível: ninguém
            está sendo trancado para fora do que já usa. */}
        <section className="rounded-2xl border border-border bg-bg-secondary px-5 py-4 text-sm text-text-secondary">
          <strong className="text-text-primary">O que continua grátis, para sempre:</strong> tarefas,
          calendário, metas e relatórios, sem limite. Até {FREE_PROJECT_LIMIT} projetos em andamento e
          5 usos do assistente por semana. E o que você já criou em ideias, agenda ou equipes
          continua seu, com ou sem Pro.
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold text-text-primary">Perguntas rápidas</h3>
          {FAQ.map((f) => (
            <details key={f.p} className="group rounded-xl border border-border bg-surface px-4 py-3">
              <summary className="cursor-pointer list-none font-medium text-text-primary flex items-center justify-between gap-3">
                {f.p}
                <ChevronDown size={16} className="shrink-0 text-text-soft transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">{f.r}</p>
            </details>
          ))}
          <p className="text-xs text-text-soft">
            Detalhes nos <a href="/termos" className="underline underline-offset-2">Termos de Uso</a>.
          </p>
        </section>
      </div>
    </AppLayout>
  );
};

export default ProPlanPage;
