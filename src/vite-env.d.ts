/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** Nome do pacote Android na Play Store. VAZIO até o app ser publicado — e
   * enquanto estiver vazio, nenhuma tela fala do Pro como comprável. */
  readonly VITE_ANDROID_PACKAGE?: string;
  /** Id do produto de assinatura no Play Console. */
  readonly VITE_PLAY_SKU?: string;

}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
