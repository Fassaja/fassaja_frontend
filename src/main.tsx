import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registrarModoApp } from './utils/modoApp'
import { registrarTwa } from './utils/twa'
import { ANDROID_PACKAGE } from './utils/playConfig'

// Antes do render: o login com Google precisa saber, mais tarde e talvez numa
// aba do navegador, que esta pessoa usa o app instalado.
registrarModoApp()
// E o Pro precisa saber se estamos DENTRO do app da Play Store: só a primeira
// navegação traz o referrer `android-app://`, e é agora.
registrarTwa(document.referrer, ANDROID_PACKAGE)

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
