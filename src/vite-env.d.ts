/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Nome do pacote Android na Play Store. VAZIO até o app ser publicado — e
   * enquanto estiver vazio, nenhuma tela fala do Pro como comprável. */
  readonly VITE_ANDROID_PACKAGE?: string;
  /** Id do produto de assinatura no Play Console. */
  readonly VITE_PLAY_SKU?: string;
  /** '1' liga a assinatura pela web (Mercado Pago). Só quando o servidor tem
   * MERCADO_PAGO_ACCESS_TOKEN — os dois andam juntos. */
  readonly VITE_PRO_WEB?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
