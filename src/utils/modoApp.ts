/**
 * Detecta se a pessoa usa o Fassaja INSTALADO (na tela de início) ou pelo
 * navegador.
 *
 * Serve para um problema específico do login com Google. O login sai do escopo
 * do app, então o sistema abre o navegador — e a volta acontece lá, porque
 * nenhuma API permite a uma página trazer o navegador de volta para o app
 * instalado (no iOS é limitação do WebKit, sem contorno). A pessoa termina
 * olhando para o Dashboard dentro do navegador, sem pista de que o app ao lado
 * já está logado também.
 *
 * Não dá para perguntar ao navegador "esta pessoa tem o app instalado?" — essa
 * informação não é exposta. O que dá é LEMBRAR: toda vez que o app roda em modo
 * instalado, deixa um registro. Se depois aparecemos numa aba comum e o
 * registro existe, é quase certo que ela veio do app.
 *
 * Se o armazenamento não for compartilhado entre o app instalado e o navegador
 * (o comportamento varia por sistema), o registro simplesmente não estará lá e
 * nada é sugerido — a falha é silenciosa e inofensiva, nunca um aviso errado.
 */
const KEY = 'fassaja_modo_app';

/** O app está rodando instalado (fora do navegador), agora? */
export function rodandoInstalado(): boolean {
  try {
    // display-mode cobre Android/desktop; navigator.standalone é o equivalente
    // no iOS, que nunca implementou a media query para isto.
    return (
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

/** Anota que esta pessoa usa o app instalado. Chamado na subida do app. */
export function registrarModoApp(): void {
  try {
    if (rodandoInstalado()) localStorage.setItem(KEY, '1');
  } catch {
    /* sem armazenamento: só não vamos sugerir nada depois */
  }
}

/**
 * Estamos numa aba do navegador, mas esta pessoa costuma usar o app instalado?
 *
 * Verdadeiro só quando as duas coisas valem — é o caso em que avisar "volte
 * para o app" ajuda. Para quem usa mesmo o navegador, o aviso seria só ruído.
 */
export function deveSugerirVoltarAoApp(): boolean {
  try {
    return !rodandoInstalado() && localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
