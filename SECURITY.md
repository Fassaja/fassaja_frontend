# Segurança — front-end

Este arquivo existe para uma situação específica: alguém roda `npm audit`,
vê um alerta e precisa decidir o que fazer. Sem um registro da análise, a
reação costuma ser um dos dois extremos errados — ignorar tudo, ou forçar
`npm audit fix --force` e subir um major que ninguém testou.

**Um alerta do `npm audit` não é uma vulnerabilidade do app.** Ele diz que
uma versão vulnerável está instalada, não que o código chega até o trecho
afetado. A pergunta que decide é sempre a mesma: *este app usa o caminho que
a falha exige?*

Última revisão: **2026-09-07** (varredura de segurança do front-end).

---

## Estado atual do `npm audit`

`npm audit` completo → **3 moderadas**. `npm audit --omit=dev` → **3 moderadas**
(react-router, react-router-dom e @xmldom/xmldom).

As três altas de 2026-09-07 (`browserslist`, `nanoid`, `postcss`, todas de
ferramenta de build) foram corrigidas dentro do intervalo semver — `npm update`,
sem `--force` e sem major: postcss `8.5.15 → 8.5.28` (que já pede
`nanoid ^3.3.18`) e browserslist `4.28.2 → 4.28.9`.

### react-router / react-router-dom — moderada — não corrigir agora

- *Open redirect via backslash in `<Link>` e `useNavigate` (bypass do CVE-2025-68470)*
- *Arbitrary Constructor Injection via `deserializeErrors()` na hidratação SSR*

O intervalo vulnerável é `6.0.0 – 7.17.0`. Não existe correção na linha 6.x: a
`6.30.4` é a última da série e continua no intervalo. Corrigir significa ir para
o React Router 7, que tem mudanças incompatíveis — decisão de major, com testes
próprios, fora do escopo desta varredura.

**O advisory de SSR não se aplica**: `deserializeErrors()` roda na hidratação de
dados do servidor, e este app é uma SPA com `BrowserRouter`, sem SSR e sem
`StaticRouterProvider`. O caminho não existe no bundle.

**O de open redirect era alcançável — e a versão anterior deste arquivo dizia
que não.** A afirmação se apoiava em `isInternalPath`, uma regex
(`/^\/(?![/\\])/`) que aprovava um caminho com TAB literal (`"/<TAB>evil.com"`).
O parser de URL REMOVE tab, LF e CR antes de interpretar o endereço, então o que
o navegador via era `//evil.com` — outra origem. Em navegador, com o React
Router instalado, isso produziu uma navegação real entre duas origens locais.

A checagem superficial foi substituída por uma política
([`caminhoInternoSeguro`](src/utils/url.ts)): recusa controles (C0/DEL), barra
invertida e credencial embutida; resolve o destino contra uma base confiável;
compara a ORIGEM; e devolve a forma canônica (`pathname + search + hash`),
revalidada no ponto de uso. Percent-encoding não é decodificado de novo — `%09`
continua `%09` e nunca vira um TAB.

| Entrada | Resultado |
|---|---|
| `/<TAB>evil.com`, `/<LF>…`, `/<CR>…`, `/<NUL>…` | bloqueado |
| `/\evil.com` (a barra invertida do CVE) | bloqueado |
| `//evil.com`, `https://evil.com`, `javascript:alert(1)` | bloqueado |
| `/%09/agenda` (codificado, inofensivo) | permitido, intacto |
| `/tasks?a=1#b` | permitido, canônico |

Coberto por [test/urlSafety.unit.mts](test/urlSafety.unit.mts), que inclui o
caso da regex antiga como teste de regressão, e replicado no service worker com
paridade verificada em [test/swUrlPolicy.unit.mts](test/swUrlPolicy.unit.mts).

**Não validado**: a navegação em navegador de verdade. Não há Playwright neste
repositório; a prova aqui é a política e seus testes em Node, não uma execução
no Chrome.

### @xmldom/xmldom — moderada — sem alcance demonstrado

*XML fragment injection via invalid `EntityReference.nodeName` durante a
serialização com `requireWellFormed`.*

Entra como dependência do `mammoth` (leitura de .docx). O advisory exige o
caminho de SERIALIZAÇÃO. O mammoth só faz o contrário: usa `DOMParser` para ler
o XML do documento (`lib/xml/xmldom.js`, `lib/xml/reader.js`), e não há uma única
chamada a `XMLSerializer`/`serializeToString`/`createEntityReference` no pacote
— verificado por busca no código instalado. A correção está na linha 0.9.x, um
major do pacote, que o mammoth ainda não acompanha (`^0.8.6`).

**Quando revisitar:** quando o mammoth passar a aceitar 0.9.x, ou se o app
passar a serializar XML.

### pdfjs-dist — HIGH — **corrigida** em 2026-08-06

*Arbitrary JavaScript execution upon opening a malicious PDF* (`>=5.6.83
<6.2.108`).

Esta **era** alcançável e por isso foi corrigida na hora: a tela do
Assistente de IA aceita PDF do usuário e o processa no navegador
([src/utils/extractFileText.ts](src/utils/extractFileText.ts)). Um PDF
preparado executaria script na origem do app, com acesso à sessão de quem só
tentou importar um documento. Subida para `6.2.108`.

Serve de contraste com o caso acima: o critério não é a severidade que o
`npm audit` imprime, é se o app chega até lá.

---

## Defesas do front-end

**CSP e cabeçalhos** ([vercel.json](vercel.json)) — `script-src 'self'`, sem
`'unsafe-inline'` e sem `'unsafe-eval'`; `object-src 'none'`;
`frame-ancestors 'none'`; `base-uri 'self'`; mais HSTS, `nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy` e `Permissions-Policy`.

> ⚠️ **`script-src 'self'` proíbe qualquer `<script>` inline.** Um script
> inline no `index.html` funciona em desenvolvimento (onde não há CSP) e é
> recusado em produção, sem quebrar nada visível — o app segue de pé e só o
> comportamento daquele script some. Já aconteceu uma vez, com o script que
> aplica o tema antes do primeiro paint: o sintoma em produção era o flash
> branco voltar. Script novo vai para um arquivo em `public/`, como
> [public/theme-init.js](public/theme-init.js). Um hash na CSP também
> funcionaria, mas para de valer em silêncio na primeira edição em que
> alguém esquecer de recalculá-lo.

**Sessão** — o token vive num cookie `httpOnly`, inacessível ao JavaScript.

> ⚠️ Correção de uma afirmação anterior deste arquivo: o `localStorage` **não**
> guarda "apenas um sinalizador de logado". A chave `fassaja_session` guarda o
> perfil (id, nome, e-mail, avatar, metas, preferências de lembrete), e
> `fassaja_user_<id>` espelha parte disso. É PII durável num aparelho que pode
> ser compartilhado. O que existe hoje contra o resíduo é
> [`clearAccountStorage`](src/utils/accountStorage.ts), chamado em toda saída,
> expiração e troca de conta detectada em outra aba. **Pendente**: reduzir o que
> é guardado ao mínimo necessário para a primeira pintura e dar prazo de
> validade ao restante.

**Identidade de sessão** — todo dado de conta em memória é carimbado com uma
identidade (`conta#geração`), e resposta que volta depois de uma troca é
descartada: não vira estado, não vira erro e não desliga o "carregando" de outra
sessão. Ver [src/utils/identidadeDeSessao.ts](src/utils/identidadeDeSessao.ts) e
[src/hooks/useSessao.ts](src/hooks/useSessao.ts). A troca feita em OUTRA aba
chega pelo evento `storage`, que serve só de sinal — quem responde "quem está
logado" continua sendo o servidor (`/auth/me`).

**Saída** — a limpeza local é imediata e incondicional; a revogação remota é uma
tentativa só, e o resultado é dito com honestidade (quando o servidor não
confirma, a pessoa é avisada em vez de ouvir que saiu de todos os lugares). Um
login novo espera a revogação pendente antes de sair, com prazo, para que a
resposta atrasada de um logout não derrube o cookie recém-criado. Ver
[src/utils/revogacaoDeSessao.ts](src/utils/revogacaoDeSessao.ts).

**Web Push** — a inscrição é vinculada à conta que a criou. Ao sair, ela é
removida no servidor (enquanto a credencial ainda vale), desfeita no navegador e
as notificações já exibidas são fechadas pelo service worker. Ver
[src/services/pushService.ts](src/services/pushService.ts).

**Telemetria** — o endereço enviado à medição de acessos é classificado por uma
lista fechada de rotas, com a mesma semântica do roteador (segmento decodificado,
sem distinção de caixa). `/join/<token>` e suas variantes (`/Join/…`,
`/%6aoin/…`) viram um rótulo; `/reset-password` e `/excluir-conta` não são
enviados; o que não é rota conhecida vira `/[desconhecida]`. Ver
[src/utils/analyticsPath.ts](src/utils/analyticsPath.ts).

**Importação de arquivos** — PDF/DOCX/TXT e a foto de perfil têm orçamento
(bytes, páginas, caracteres, tempo, pixels) checado antes e durante o trabalho,
com liberação do documento e do worker do PDF.js no fim. Ver
[src/utils/limitesDeArquivo.ts](src/utils/limitesDeArquivo.ts).

**Renderização** — nenhum uso de `dangerouslySetInnerHTML` ou `innerHTML`
(verificado). Cores vindas de dados do usuário entram por `style`, nunca
concatenadas em classe ou HTML.

---

## Pendências que dependem do backend

Correções de cliente que só ficam completas com um contrato do outro lado. Cada
uma tem teste no front descrevendo o comportamento esperado.

1. **Remover as inscrições de push no logout.** O front avisa
   (`POST /push/unsubscribe`) enquanto a credencial ainda vale, mas se a rede
   falhar a inscrição continua viva no servidor. Contrato pedido: ao revogar uma
   sessão (logout, expiração, "sair de todos os dispositivos", exclusão de
   conta), apagar as inscrições daquele dispositivo/conta e não entregar push
   enfileirado para sessão encerrada.
2. **`POST /auth/logout` idempotente e verificável.** Chamar duas vezes não pode
   dar erro, e a resposta precisa distinguir "revogado agora" de "já não havia
   sessão". O front trata falha como *não confirmado* — nunca como sucesso.
3. **Vínculo da inscrição de push com a conta, conferido no servidor.** Hoje o
   vínculo é local (`fassaja_push_conta`), o que já impede a conta B de ver
   "ativado" por causa da inscrição de A neste aparelho. Um `GET /push/status`
   que responda se ESTE endpoint pertence a quem está logado tornaria a checagem
   verificável.
4. **Autorização de equipe.** Guarda de rota, botão escondido e cota no cliente
   são conveniência, não autorização: toda chamada forjada precisa ser recusada
   pelo servidor. Não foi possível exercitar isso nesta varredura (sem backend
   completo em ambiente isolado).

## Acessibilidade — o que ficou pendente

`npm run lint` agora existe de verdade (ESLint 9 + regras de hooks e de
acessibilidade em JSX; antes o comando falhava com "eslint: command not found").
Ele passa sem erros. Ficam **24 avisos**, todos de acessibilidade e todos
visíveis a cada execução — de propósito, em vez de silenciados:

- `jsx-a11y/click-events-have-key-events` / `no-static-element-interactions` /
  `interactive-supports-focus`: elementos não interativos com `onClick` (cartões,
  itens de lista, seletor de tags) que precisam virar botão de verdade, um a um,
  com teste de teclado.
- `jsx-a11y/label-has-associated-control`: rótulos sobre componentes próprios
  (Dropdown, DatePicker) que ainda não expõem um `id` para associar.

Já corrigidos: [Input.tsx](src/components/common/Input.tsx) (rótulo ligado ao
campo por `htmlFor`/`id`, `aria-invalid`, `aria-describedby`) e
[Modal.tsx](src/components/common/Modal.tsx) (`role="dialog"`, `aria-modal`,
nome acessível pelo título, foco inicial no painel, foco preso enquanto aberto,
retorno do foco ao fechar, botão de fechar com nome, e Escape respondido só pelo
modal do topo da pilha).

**Não validado**: leitor de tela real e navegação por teclado num navegador.

---

## Como reportar

Encontrou algo? Abra uma issue **sem detalhes de exploração** e peça
contato privado, ou escreva direto para quem mantém o repositório. Não abra
PR com o exploit.
