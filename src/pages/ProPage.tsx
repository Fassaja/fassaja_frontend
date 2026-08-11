import React, { useState } from 'react';
import { Mail, Send, Sparkles, HeartHandshake, ServerCog } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { Button } from '@/components/common/Button';
import { OptionSelector, SelectableOption } from '@/components/common/OptionSelector';
import { Mascot } from '@/components/mascot/Mascot';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { proService, PriceBand } from '@/services/proService';
import { markRespondedLocally } from '@/utils/proReminder';

const MAX_MESSAGE = 500;

// A opção "não pagaria" fica junto das outras, com o mesmo peso visual. Escondê-la
// no fim ou pintá-la de vermelho enviesaria a resposta — e a resposta desconfortável
// é a mais valiosa das cinco.
const PRICE_OPTIONS: SelectableOption[] = [
  { value: 'ate-9', label: 'Até R$ 9,90' },
  { value: '10-19', label: 'R$ 10 a R$ 19,90' },
  { value: '20-29', label: 'R$ 20 a R$ 29,90' },
  { value: '30-mais', label: 'R$ 30 ou mais' },
  { value: 'nao-pagaria', label: 'Só usaria de graça' },
];

/**
 * Página "Apoiar" (/apoiar) — lista de espera do plano Pro.
 *
 * Não é uma página de doação, e a diferença é o ponto: doação ensina que o
 * Fassaja é gratuito e vive de ajuda, o que contradiz a assinatura que vem
 * depois. Aqui a pessoa responde se pagaria e quanto — o dado que falta para
 * definir preço — e quem responde vira o primeiro público do lançamento.
 */
const ProPage: React.FC = () => {
  const { account, isGuest } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState(account?.email ?? '');
  const [priceBand, setPriceBand] = useState<PriceBand | ''>('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  // Guarda a faixa escolhida no envio: a tela de agradecimento muda de texto
  // para quem respondeu "só usaria de graça" — celebrar um "não pagaria" como
  // se fosse adesão soaria falso.
  const [sentAs, setSentAs] = useState<PriceBand | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceBand) {
      toast.error('Escolha uma faixa de preço para continuar.');
      return;
    }
    setSending(true);
    try {
      await proService.register({
        email: email.trim(),
        priceBand,
        message: message.trim() || undefined,
      });
      // Encerra o lembrete do sino — inclusive para quem respondeu sem conta,
      // que o servidor não tem como reconhecer depois.
      markRespondedLocally();
      setSentAs(priceBand);
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível registrar seu interesse.');
    } finally {
      setSending(false);
    }
  };

  if (sentAs) {
    const wouldPay = sentAs !== 'nao-pagaria';
    return (
      <AppLayout title="Apoiar o Fassaja" subtitle="Obrigado por responder">
        <div className="max-w-2xl mx-auto">
          <Card padding="lg" className="text-center">
            <div className="flex justify-center mb-4">
              <Mascot state="celebrate" size="md" animate />
            </div>
            <h2 className="text-xl font-bold text-text-primary">
              {wouldPay ? 'Você está na lista 💙' : 'Resposta registrada 💙'}
            </h2>
            <p className="mt-2 text-text-secondary">
              {wouldPay ? (
                <>
                  Avisamos você em <strong>{email}</strong> assim que o plano Pro sair — com o
                  desconto de fundador reservado.
                </>
              ) : (
                <>
                  Saber que o preço não cabe no seu bolso é tão útil quanto o contrário: é isso
                  que evita lançarmos um plano que ninguém consegue assinar. O Fassaja continua
                  gratuito para você.
                </>
              )}
            </p>
            <p className="mt-4 text-sm text-text-soft">
              Mudou de ideia sobre a faixa de preço? É só responder de novo com o mesmo e-mail —
              a resposta nova substitui a anterior.
            </p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Apoiar o Fassaja"
      subtitle="O plano Pro está a caminho — sua resposta decide o preço"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Card padding="lg">
          <div className="flex items-start gap-4">
            <span className="w-12 h-12 shrink-0 rounded-2xl bg-primary-light text-primary-vibrant flex items-center justify-center">
              <Sparkles size={22} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                O Fassaja terá um plano Pro em breve
              </h2>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                Hoje o app é mantido por conta própria — servidor, banco de dados e o assistente
                de IA têm custo todo mês, e é isso que limita o quanto o Fassaja consegue
                crescer. Em vez de pedir doação, preferimos perguntar direto:{' '}
                <strong className="text-text-primary">
                  o Fassaja vale uma assinatura para você, e de quanto?
                </strong>
              </p>
              <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                Quem responder entra na lista de fundadores: avisamos primeiro quando o plano sair
                e garantimos um desconto por ter ajudado a definir o rumo.
              </p>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <form onSubmit={submit} className="space-y-5">
            <Input
              label="Seu melhor e-mail"
              type="email"
              required
              maxLength={255}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="voce@email.com"
              icon={<Mail size={18} />}
              helperText={
                isGuest
                  ? 'Usamos só para avisar do lançamento. Nada de spam.'
                  : 'Preenchido com o e-mail da sua conta — pode trocar se preferir outro.'
              }
            />

            <OptionSelector
              label="Quanto você pagaria por mês pelo Fassaja Pro?"
              options={PRICE_OPTIONS}
              value={priceBand}
              onChange={value => setPriceBand(value as PriceBand)}
              layout="grid"
              columns={2}
            />

            <Textarea
              label="O que o Pro precisaria ter para valer a pena? (opcional)"
              rows={3}
              maxLength={MAX_MESSAGE}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Ex.: mais gerações de IA por semana, relatórios da equipe, integração com o calendário…"
              helperText={`${message.length}/${MAX_MESSAGE} caracteres`}
            />

            <div className="flex justify-end">
              <Button type="submit" isLoading={sending} icon={<Send size={16} />}>
                Entrar na lista
              </Button>
            </div>
          </form>
        </Card>

        <div className="flex items-start gap-3 px-1 text-xs text-text-soft">
          <ServerCog size={16} className="shrink-0 mt-0.5" />
          <p>
            Enquanto o plano não existe, o Fassaja segue inteiro e gratuito — nenhum recurso vai
            ser trancado no que você já usa hoje.
          </p>
        </div>
        <div className="flex items-start gap-3 px-1 text-xs text-text-soft">
          <HeartHandshake size={16} className="shrink-0 mt-0.5" />
          <p>
            Seu e-mail fica guardado só para o aviso do lançamento e não é compartilhado com
            ninguém.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProPage;
