// @ts-check
/**
 * Configuração do ESLint (formato flat, ESLint 9).
 *
 * O `npm run lint` existia no package.json mas falhava com "eslint: command
 * not found" — não havia ferramenta nem configuração. Comando que não roda não
 * é rede de proteção nenhuma.
 *
 * A régua escolhida é a que pega ERRO, não estilo: as regras de hooks do React
 * (dependência esquecida vira dado velho na tela — exatamente a família do
 * FE-01) e as de acessibilidade em JSX. Formatação fica de fora de propósito:
 * este repositório não usa formatador automático, e transformar o lint num
 * revisor de vírgulas faria o time desligá-lo.
 */
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'test/**', '*.config.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      /*
       * `autoFocus` é decisão de produto aqui: nos formulários de entrada e nos
       * diálogos, levar o foco ao primeiro campo é o comportamento esperado —
       * inclusive por quem usa teclado. Desligada com nome e motivo, e não
       * silenciada caso a caso.
       */
      'jsx-a11y/no-autofocus': 'off',
      /*
       * Acessibilidade ainda por acertar, em AVISO e não erro: são elementos
       * não interativos com onClick (cartões, itens de lista) que precisam
       * virar botão de verdade, um a um, com teste de teclado. Ficam visíveis a
       * cada `npm run lint` em vez de sumirem num disable — a lista está no
       * SECURITY.md.
       */
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/interactive-supports-focus': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      // `any` apaga a checagem justamente onde ela protegeria. Aviso, não erro,
      // para não travar o CI por causa de código que já existe — mas visível.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Variável não usada é quase sempre resto de refatoração; o prefixo `_`
      // é a forma explícita de dizer "este parâmetro existe mas não me serve".
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // O worker do PDF.js roda fora da janela: tem escopo próprio.
    files: ['src/utils/pdfWorkerEntry.ts'],
    languageOptions: { globals: { ...globals.worker } },
  },
);
