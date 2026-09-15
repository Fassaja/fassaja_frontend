# Política de Privacidade do Fassaja

**Versão 1.0 — vigente a partir de 15 de setembro de 2026**

Esta Política explica **quais dados o Fassaja coleta, por que, com quem
compartilha, por quanto tempo guarda e o que você pode fazer a respeito**. Ela
vale para o site `www.fassaja.com`, o aplicativo Android distribuído pela
Google Play e os e-mails que enviamos.

Foi escrita para cumprir a Lei Geral de Proteção de Dados (Lei 13.709/2018,
**"LGPD"**) e o Marco Civil da Internet (Lei 12.965/2014) — e, antes disso,
para ser entendida.

## 1. Quem é responsável pelos seus dados

**Controlador:** Magnum de Abreu, pessoa física, CPF 166.632.407-81, Campo Grande/MS,
Brasil.

**Encarregado pelo tratamento de dados (DPO):** o próprio controlador.
**Contato para assuntos de privacidade:** magnumjabreuu@gmail.com. É o canal
para exercer os direitos da seção 8 e para qualquer dúvida sobre esta
Política. Respondemos em até **15 dias**.

## 2. Resumo de uma página

| Pergunta | Resposta curta |
|---|---|
| O que vocês coletam? | O que você digita (conta, tarefas, equipes) e o mínimo técnico para o serviço funcionar. |
| Vendem meus dados? | **Não.** Nunca. |
| Usam para anúncios? | **Não.** Não há anúncios no Fassaja. |
| Usam meu conteúdo para treinar IA? | **Não** — nem nós, nem nossos fornecedores. |
| Quem mais vê meus dados? | Só os fornecedores que hospedam e operam o serviço (seção 5), sob contrato, e os membros das suas equipes, para o que é da equipe. |
| Por quanto tempo? | Enquanto a conta existir. Tarefas concluídas somem em 4 dias. Excluiu a conta, apagou tudo. |
| Posso apagar? | Sim, sozinho, em *Configurações → Excluir conta*. Imediato e irreversível. |
| Cookies de rastreamento? | **Não.** Um único cookie, de sessão, para você continuar logado. |

## 3. Quais dados tratamos e por quê

A LGPD exige que cada uso de dado tenha uma **finalidade** e uma **base
legal**. Elas estão nas tabelas abaixo.

### 3.1 Dados que você nos dá

| Dado | Para quê | Base legal (LGPD, art. 7º) |
|---|---|---|
| **Nome, e-mail, senha** | Criar e proteger a conta; enviar e-mails de confirmação, redefinição de senha e avisos do serviço | Execução de contrato (V) |
| **Foto de perfil** (opcional) | Mostrar quem é quem, principalmente em equipes | Execução de contrato (V) |
| **Dados da conta Google** (identificador, nome, e-mail, foto), se você entra com o Google | Login sem senha; vincular a conta | Execução de contrato (V) |
| **Conteúdo**: tarefas, projetos, subtarefas, comentários, ideias, metas, eventos da agenda, tags, sessões de foco | É o serviço: guardar e mostrar o que você organiza | Execução de contrato (V) |
| **Preferências**: metas diárias e semanais, dias da sequência, tema, fuso horário | Adaptar o aplicativo a você | Execução de contrato (V) |
| **Textos enviados ao assistente com IA** | Gerar a sugestão pedida (seção 4) | Execução de contrato (V) |
| **Mensagens de feedback** | Ler o que você nos diz e melhorar o produto | Legítimo interesse (IX) |
| **Resposta à pesquisa do plano Pro** (e-mail, faixa de preço, mensagem) | Decidir o preço do plano | Consentimento (I) — você envia se quiser |

A senha é guardada apenas como **hash criptográfico** (bcrypt). Ninguém,
inclusive nós, consegue lê-la. Tokens de confirmação de e-mail, redefinição de
senha e exclusão de conta também são guardados só como hash.

### 3.2 Dados gerados pelo uso

| Dado | Para quê | Base legal |
|---|---|---|
| **Estatísticas de produtividade**: tarefas concluídas por dia, pontos (XP), sequência de dias, projetos concluídos | Os relatórios e a gamificação que o aplicativo mostra a você | Execução de contrato (V) |
| **Participação em equipes**: de quais equipes você faz parte, com qual papel, tarefas atribuídas | O trabalho compartilhado funcionar | Execução de contrato (V) |
| **Registro de uso da IA**: qual ação, quando, quantos tokens custou — **não o texto** | Aplicar a cota semanal e controlar o custo do serviço | Execução de contrato (V) e legítimo interesse (IX) |
| **Assinatura do plano Pro**: identificador da compra na Google Play, produto, estado, validade | Saber que você é Pro e até quando | Execução de contrato (V) |
| **Endereço IP e cabeçalhos da requisição** | Limitar tentativas de login e abusos (rate limiting); segurança | Legítimo interesse (IX) |
| **Inscrição de notificações push** (endereço técnico do navegador e chaves), se você ativar | Enviar lembretes de tarefas ao seu dispositivo | Consentimento (I) — você ativa e desativa |

### 3.3 O que **não** coletamos

- Dados de pagamento (número de cartão, Pix, endereço de cobrança): quem
  cobra é a Google Play. **Nunca vemos** esses dados; recebemos apenas a
  confirmação de que a assinatura existe e está válida.
- Localização, contatos, arquivos do dispositivo, microfone, câmera.
- Dados de navegação em outros sites.
- Dados sensíveis (saúde, religião, orientação sexual, opinião política,
  biometria). Se você escrever isso numa tarefa, é conteúdo seu, tratado como
  tal (3.1) — mas não pedimos nem inferimos nada disso.

### 3.4 Dados de estatística do site

Usamos o **Vercel Web Analytics** para saber quantas pessoas visitam cada
página. Ele **não usa cookies**, não identifica visitantes individualmente e
não cruza dados entre sites. Antes de enviar a URL visitada, removemos dela
qualquer identificador (ids de equipe, tokens de convite). Base legal:
legítimo interesse (IX), com impacto mínimo.

## 4. O assistente com inteligência artificial

Quando você usa o assistente, o texto que você envia (comando e/ou documento
colado), junto com os nomes das suas tags, é transmitido à **Anthropic**
(Estados Unidos) para gerar a resposta. Isso acontece **só quando você aciona
o assistente** e só com o que você enviou naquele pedido — o restante das suas
tarefas não é transmitido.

Pela política da API da Anthropic aplicável a este tipo de uso, o conteúdo
**não é usado para treinar modelos** e é retido pelo provedor apenas pelo
tempo necessário para processar o pedido e para fins de segurança, conforme
a política deles. Nós guardamos, do lado do Fassaja, **apenas o registro de
que houve um uso e quanto custou** (3.2) — não o texto enviado nem a resposta
bruta. O que você aprovar vira tarefa e projeto seus, como qualquer outro
conteúdo.

Conversas com o assistente vinculadas a uma tarefa são guardadas junto com ela
e **apagadas com ela** (seção 7).

Não envie ao assistente dados de terceiros que você não tenha autorização
para transmitir.

## 5. Com quem compartilhamos

**Não vendemos, não alugamos e não cedemos dados pessoais a ninguém para fins
próprios de terceiros.** Compartilhamos apenas com:

### 5.1 Fornecedores que operam o serviço (operadores)

| Fornecedor | O que faz | Onde ficam os dados | Base da transferência internacional |
|---|---|---|---|
| **Neon** | Banco de dados | Estados Unidos (Oregon) | Cláusulas contratuais (LGPD, art. 33, II) |
| **Render** | Servidor da aplicação (API) | Estados Unidos (Oregon) | Cláusulas contratuais (art. 33, II) |
| **Vercel** | Hospedagem do site e estatística de visitas | Estados Unidos (rede global) | Cláusulas contratuais (art. 33, II) |
| **Anthropic** | Modelo de IA do assistente | Estados Unidos | Cláusulas contratuais (art. 33, II); só o texto que você envia |
| **Brevo** | Envio de e-mails transacionais | União Europeia (França) | País com grau de proteção reconhecido / cláusulas contratuais (art. 33, I e II) |
| **Google** | Login com Google (se você usar); Google Play (assinatura) | Estados Unidos e rede global | Cláusulas contratuais (art. 33, II) |
| **Serviço de push do seu navegador** (Google, Mozilla ou Apple, conforme o navegador), se você ativar notificações | Entregar os lembretes ao dispositivo; recebe só o conteúdo do lembrete, cifrado | Estados Unidos | Cláusulas contratuais (art. 33, II) |

Cada fornecedor trata os dados **apenas sob nossas instruções**, para a
finalidade indicada, e está vinculado por contrato a padrões de segurança e
confidencialidade. Esta lista é atualizada aqui quando mudar.

**Seus dados ficam fora do Brasil.** O banco de dados e o servidor da
aplicação rodam nos Estados Unidos (Oregon). A LGPD permite isso quando o
fornecedor se compromete, por contrato, a dar aos dados a mesma proteção que
a lei brasileira exige (art. 33, II) — é o caso de todos os listados acima.
Você continua com todos os direitos da seção 8, e a autoridade competente
continua sendo a ANPD.

### 5.2 Membros das suas equipes

Ao participar de uma equipe, os outros membros veem, conforme o papel de cada
um: seu nome, foto, e-mail, as tarefas e projetos **da equipe**, seus
comentários neles e os relatórios da equipe. Suas tarefas pessoais **não**
são visíveis. Quem convida alguém para uma equipe é responsável por isso.

### 5.3 Autoridades

Podemos ser obrigados a fornecer dados por ordem judicial ou requisição legal
válida. Quando isso acontecer, fornecemos **o mínimo exigido** e, salvo
proibição legal, avisamos você.

### 5.4 Sucessão

Se o Fassaja passar a ser operado por uma pessoa jurídica (por exemplo, uma
empresa constituída para isso) ou for transferido, seus dados seguem
protegidos por esta Política; você será avisado.

## 6. Cookies e armazenamento no navegador

| Nome | Tipo | Para quê | Duração |
|---|---|---|---|
| `fassaja_token` | Cookie **essencial**, `httpOnly`, `Secure` | Manter você logado | 7 dias, renovado ao usar |
| `g_csrf_token` | Cookie essencial, definido pelo Google durante o login com Google | Proteger o login contra falsificação de requisição | Minutos |
| `localStorage` / `sessionStorage` | Armazenamento local | Tema claro/escuro, barra recolhida, rascunhos não enviados, dados do modo visitante, lembretes já vistos | Até você limpar o navegador |

Não há cookies de publicidade, de rastreamento entre sites nem de terceiros
com finalidade própria. Por serem essenciais, esses itens não exigem
consentimento e **não há banner de cookies** — não porque ignoramos a regra,
mas porque não há o que pedir.

## 7. Por quanto tempo guardamos

| Dado | Retenção |
|---|---|
| Conta e conteúdo | Enquanto a conta existir |
| **Tarefas concluídas** | **Apagadas 4 dias após a conclusão**, automaticamente (faz parte do desenho do produto: a lista fica leve). Conversas com o assistente vinculadas a elas vão junto. |
| Eventos da agenda | Apagados 30 dias após a data |
| Estatísticas de produtividade (contagens por dia, XP, sequência) | Enquanto a conta existir — são agregados, não contêm o conteúdo das tarefas |
| Tokens de confirmação, redefinição e exclusão | Até serem usados ou expirarem (horas) |
| Registro de uso da IA (sem o texto) | Enquanto a conta existir — é a base da cota semanal e do controle de custo |
| Registros de segurança (IP em tentativas de login e no limite de requisições) | Só em memória, durante a janela do limite (minutos). Os registros técnicos de acesso do provedor de hospedagem (data, hora, IP) são mantidos por ele por prazo curto, de dias |
| Resposta à pesquisa do Pro | Até a decisão de preço ser tomada; apagada a pedido a qualquer momento |
| Assinatura do Pro (identificador da compra, estado, validade) | Enquanto a conta existir. Os registros financeiros da compra (recibos, valores, meio de pagamento) ficam com a Google Play, pelas regras dela |
| Cópias de segurança do banco | Restauração pontual mantida pelo provedor por até **7 dias**; dados apagados desaparecem das cópias nesse prazo |

## 8. Seus direitos (LGPD, art. 18)

Você pode, a qualquer momento e sem custo:

| Direito | Como |
|---|---|
| **Confirmar** se tratamos seus dados e **acessá-los** | Boa parte está no próprio aplicativo (Perfil, Configurações). Para uma cópia completa, escreva para magnumjabreuu@gmail.com; enviamos em formato legível por máquina (JSON) em até 15 dias. |
| **Corrigir** dados incompletos ou desatualizados | Perfil e Configurações, ou pelo e-mail |
| **Portar** seus dados para outro serviço | A mesma cópia em JSON do item acima; a agenda também pode ser exportada em formato iCalendar (`.ics`) pelo aplicativo |
| **Apagar** | *Configurações → Excluir conta*: imediato e irreversível. Ou pelo e-mail. |
| **Revogar consentimento** | Notificações push: desative no aplicativo ou no navegador. Pesquisa do Pro: pelo e-mail. |
| **Saber com quem compartilhamos** | Seção 5, e pelo e-mail para detalhes |
| **Opor-se** a um tratamento baseado em legítimo interesse | Pelo e-mail; avaliamos e respondemos com a justificativa |
| **Não ser discriminado** por exercer esses direitos | Nunca acontecerá. Exercer um direito não afeta seu acesso ao Serviço. |
| **Reclamar à autoridade** | Autoridade Nacional de Proteção de Dados (ANPD): [gov.br/anpd](https://www.gov.br/anpd) |

Para proteger sua conta, podemos pedir confirmação de identidade antes de
atender um pedido feito por e-mail (por exemplo, responder a partir do e-mail
cadastrado).

**Decisões automatizadas.** O Fassaja não toma decisões automatizadas que
afetem seus direitos. As sugestões do assistente com IA são propostas que
você aprova ou descarta; a cota da IA e o limite de tentativas de login são
regras fixas e iguais para todos.

## 9. Como protegemos seus dados

- Conexão criptografada (HTTPS) em todo o site e API.
- Senhas com hash bcrypt; tokens de e-mail com hash SHA-256 — nunca em claro.
- Cookie de sessão `httpOnly` e `Secure`, inacessível a scripts.
- Proteções contra falsificação de requisição (CSRF), limite de tentativas de
  login e de requisições por IP, e verificação de origem nas rotas que alteram
  dados.
- O acesso ao banco de dados é restrito ao controlador.
- Verificação **no servidor** de toda regra de permissão (equipe, papel,
  plano): o que a tela esconde, o servidor também recusa.

Nenhum sistema é infalível. **Se ocorrer um incidente de segurança que possa
causar risco a você, avisaremos você e a ANPD** conforme o art. 48 da LGPD,
dizendo o que aconteceu, quais dados foram afetados e o que fazer.

## 10. Crianças e adolescentes

O Fassaja não se destina a menores de 13 anos e não coletamos seus dados
conscientemente. Adolescentes de 13 a 17 anos podem usar com autorização do
responsável (Termos, seção 2). Se você é responsável e acredita que uma
criança criou uma conta, escreva para magnumjabreuu@gmail.com e apagaremos os
dados.

## 11. Alterações desta Política

Quando mudarmos esta Política de forma relevante — novo fornecedor, nova
finalidade, novo dado coletado — avisaremos por e-mail e/ou no aplicativo com
**pelo menos 15 dias de antecedência**. Mudanças que exijam seu consentimento
serão pedidas expressamente. A versão e a data ficam no topo; versões
anteriores ficam disponíveis a pedido.

## 12. Contato

**Assuntos de privacidade e exercício de direitos:** magnumjabreuu@gmail.com
**Controlador e encarregado:** Magnum de Abreu — CPF 166.632.407-81 — Campo Grande/MS, Brasil
