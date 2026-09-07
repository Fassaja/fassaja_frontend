import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * O destino da API entra no bundle e não sai mais.
 *
 * `src/services/api.ts` cai em `http://localhost:3333/api` quando VITE_API_URL
 * não está definida. Isso é ótimo em desenvolvimento e péssimo num build de
 * publicação: uma variável esquecida no painel geraria um site em que todo
 * pedido vai para a máquina de quem abriu a página — sem erro de build, sem
 * aviso, só um app que não funciona (e um endereço de rede local vazando no
 * bundle público).
 *
 * Por isso o build de produção EXIGE a variável, e recusa um destino de
 * desenvolvimento. Em produção o valor é '/api', um caminho relativo servido
 * pelo rewrite do vercel.json.
 */
function validarDestinoDaApi(valor: string | undefined): void {
  const ajuda =
    'Defina VITE_API_URL no ambiente de build (em produção o valor é "/api", ' +
    'servido pelo rewrite do vercel.json).'

  if (!valor) {
    throw new Error(`[fassaja] build de produção sem VITE_API_URL. ${ajuda}`)
  }
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(valor)) {
    throw new Error(
      `[fassaja] VITE_API_URL aponta para desenvolvimento ("${valor}"). ${ajuda}`,
    )
  }
  const relativa = valor.startsWith('/') && !valor.startsWith('//')
  if (!relativa && !/^https:\/\//i.test(valor)) {
    throw new Error(
      `[fassaja] VITE_API_URL deve ser um caminho relativo ou https ("${valor}"). ${ajuda}`,
    )
  }
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  if (command === 'build' && mode === 'production') {
    validarDestinoDaApi(env.VITE_API_URL)
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      open: false,
    },
  }
})
