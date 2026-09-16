/**
 * Google Play Billing de dentro de uma TWA: Digital Goods API + Payment
 * Request API. Só existe no Chrome rodando dentro do app da Play Store;
 * em qualquer outro lugar `disponivel()` é falso e nada daqui deve ser
 * chamado.
 *
 * O fluxo tem três pontas, e a ordem importa:
 *   1. `comprar(sku)` abre a folha de pagamento do Google e devolve o
 *      `purchaseToken` — a compra JÁ ACONTECEU nesse ponto;
 *   2. o servidor confirma com o Google e vincula à conta
 *      (`billingService.verifyGoogle`);
 *   3. só então `concluir()` fecha a folha com sucesso. Se o servidor recusar,
 *      `concluir(false)` avisa o Google que a compra não foi entregue, e o
 *      próprio Google estorna.
 *
 * Sem a etapa 2 o Google devolve o dinheiro em 3 dias (compra não
 * "reconhecida") — é o servidor quem reconhece.
 */
const METODO = 'https://play.google.com/billing';

interface ItemDetails {
  itemId: string;
  title: string;
  price: { currency: string; value: string };
}
interface PurchaseDetails {
  itemId: string;
  purchaseToken: string;
}
interface DigitalGoodsService {
  getDetails(ids: string[]): Promise<ItemDetails[]>;
  listPurchases(): Promise<PurchaseDetails[]>;
}
type Janela = Window & {
  getDigitalGoodsService?: (metodo: string) => Promise<DigitalGoodsService>;
};

/** A API do Play Billing existe neste navegador? */
export function disponivel(): boolean {
  return typeof window !== 'undefined' && typeof (window as Janela).getDigitalGoodsService === 'function';
}

async function servico(): Promise<DigitalGoodsService> {
  const g = (window as Janela).getDigitalGoodsService;
  if (!g) throw new Error('Google Play Billing não está disponível aqui.');
  return g(METODO);
}

/** Preço do produto, já formatado ("R$ 14,90"), ou null se a loja não o tem. */
export async function precoDoProduto(sku: string): Promise<string | null> {
  const [item] = await (await servico()).getDetails([sku]);
  if (!item) return null;
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: item.price.currency }).format(
      Number(item.price.value),
    );
  } catch {
    return `${item.price.value} ${item.price.currency}`;
  }
}

/**
 * Compras que esta conta Google já fez do nosso app. É o que recupera a
 * assinatura num celular novo e re-tenta um verify que falhou por rede.
 */
export async function comprasExistentes(): Promise<string[]> {
  const lista = await (await servico()).listPurchases();
  return lista.map((p) => p.purchaseToken);
}

export interface Compra {
  purchaseToken: string;
  /** Fecha a folha de pagamento. `true` depois de o servidor confirmar. */
  concluir(ok: boolean): Promise<void>;
}

/** Abre a folha de pagamento do Google. Resolve depois de a pessoa pagar. */
export async function comprar(sku: string): Promise<Compra> {
  const pedido = new PaymentRequest(
    [{ supportedMethods: METODO, data: { sku } }],
    // O total é ignorado pelo Play Billing (o preço vem do produto na loja),
    // mas a API exige o campo.
    { total: { label: 'Fassajá Pro', amount: { currency: 'BRL', value: '0' } } },
  );
  const resposta = await pedido.show();
  const detalhes = resposta.details as { purchaseToken?: string };
  if (!detalhes?.purchaseToken) {
    await resposta.complete('fail');
    throw new Error('O Google Play não devolveu o comprovante da compra.');
  }
  return {
    purchaseToken: detalhes.purchaseToken,
    concluir: (ok) => resposta.complete(ok ? 'success' : 'fail'),
  };
}
