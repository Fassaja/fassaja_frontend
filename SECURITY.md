# Segurança — front-end

Este arquivo existe para uma situação específica: alguém roda `npm audit`,
vê um alerta e precisa decidir o que fazer. Sem um registro da análise, a
reação costuma ser um dos dois extremos errados — ignorar tudo, ou forçar
`npm audit fix --force` e subir um major que ninguém testou.

**Um alerta do `npm audit` não é uma vulnerabilidade do app.** Ele diz que
uma versão vulnerável está instalada, não que o código chega até o trecho
afetado. A pergunta que decide é sempre a mesma: *este app usa o caminho que
a falha exige?*

Última revisão: **2026-08-06**.

---

## Estado atual do `npm audit`

`npm audit --omit=dev` → **2 moderadas**, ambas do `react-router`.

### react-router / react-router-dom — moderada — não corrigir

- *Open redirect via backslash in `<Link>` e `useNavigate` (bypass do CVE-2025-68470)*
- *Open redirect levando a XSS*

**Não é alcançável neste app, e a correção exigiria subir de major.**

O intervalo vulnerável é `6.0.0 – 7.17.0`. Não existe correção na linha 6.x:
a `6.30.4` é a última da série e continua no intervalo. Corrigir significa ir
para o React Router 7, que tem mudanças incompatíveis — um risco maior do que
a falha, dado o que segue.

A falha exige que o app navegue para uma URL controlada pelo usuário. Aqui
existe **um** ponto assim: o parâmetro `?redirect=` da tela de login. Ele
passa por `isInternalPath` ([src/utils/url.ts](src/utils/url.ts)), que só
aceita caminho começando com `/` não seguido de `/` nem de `\` — exatamente
os vetores do CVE:

| Entrada | Resultado |
|---|---|
| `/\evil.com` (a barra invertida do CVE) | bloqueado |
| `//evil.com` | bloqueado |
| `https://evil.com` | bloqueado |
| `javascript:alert(1)` | bloqueado |
| `/tasks` | permitido |

Coberto por [test/urlSafety.unit.mts](test/urlSafety.unit.mts), incluindo o
caso da barra invertida. As demais chamadas a `navigate()` usam caminhos
literais internos, e links externos (o campo `link` de um evento da Agenda)
passam por `toExternalHref`.

**Quando revisitar:** se surgir uma correção na linha 6.x; se o app passar a
navegar para alguma URL vinda do usuário; ou se o React Router 7 entrar por
outro motivo. Nesse último caso a falha se resolve de carona — mas o
`isInternalPath` deve continuar de pé de qualquer forma, porque ele protege
contra open redirect independente da versão da biblioteca.

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
O front guarda apenas um sinalizador de "logado" no `localStorage`, para
distinguir 401 de sessão expirada. Nenhum dado pessoal é persistido no
navegador além da preferência de tema.

**Renderização** — nenhum uso de `dangerouslySetInnerHTML` ou `innerHTML`
(verificado). Cores vindas de dados do usuário entram por `style`, nunca
concatenadas em classe ou HTML.

---

## Como reportar

Encontrou algo? Abra uma issue **sem detalhes de exploração** e peça
contato privado, ou escreva direto para quem mantém o repositório. Não abra
PR com o exploit.
