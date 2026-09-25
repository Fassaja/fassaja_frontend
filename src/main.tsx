import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registrarModoApp } from './utils/modoApp'
import { registrarTwa, registrarAberturaPorApp } from './utils/twa'
import { ANDROID_PACKAGE } from './utils/playConfig'
import { destinoCanonico } from './utils/dominio'

/*
 * Chegou por um endereço antigo? Manda para o de verdade, com o caminho.
 *
 * Antes de qualquer render: redirecionar depois de montar a árvore faria a
 * pessoa ver meio segundo de uma tela que vai embora. Hoje `fassaja.vercel.app`
 * devolve 404 da própria Vercel e isto nem chega a rodar — mas vale para o dia
 * em que o domínio voltar a servir o site, e para qualquer outro endereço que
 * entre na lista de legados.
 */
const canonico = destinoCanonico(window.location)
if (canonico) window.location.replace(canonico)

// Antes do render: o login com Google precisa saber, mais tarde e talvez numa
// aba do navegador, que esta pessoa usa o app instalado.
registrarModoApp()
// E o Pro precisa saber se estamos DENTRO do app da Play Store: só a primeira
// navegação traz o referrer `android-app://`, e é agora.
registrarTwa(document.referrer, ANDROID_PACKAGE)
registrarAberturaPorApp(document.referrer)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Registra o service worker (necessário para receber Web Push, mesmo com o app
// fechado). Falha silenciosa em navegadores sem suporte.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
