import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import termos from '../../docs/legal/termos-de-uso.md?raw';
import privacidade from '../../docs/legal/politica-de-privacidade.md?raw';
import { markdownParaHtml } from '@/utils/markdown';

/**
 * Termos de Uso (/termos) e Política de Privacidade (/privacidade).
 *
 * Página PÚBLICA e sem o layout do app, de propósito: quem abre é um
 * visitante decidindo se cria conta, ou o revisor da Play Store conferindo a
 * URL da política — nenhum dos dois tem sessão, e uma barra lateral vazia só
 * atrapalha a leitura.
 *
 * O texto vem de docs/legal/*.md, o mesmo arquivo do repositório: não existe
 * uma cópia "da tela" que possa ficar diferente da que foi revisada.
 */
const DOCS = {
  termos: { titulo: 'Termos de Uso', md: termos },
  privacidade: { titulo: 'Política de Privacidade', md: privacidade },
} as const;

// Os .md se referem um ao outro pelo nome do arquivo (para funcionar no
// GitHub); na tela, viram as rotas.
const ROTAS: Record<string, string> = {
  'termos-de-uso.md': '/termos',
  'politica-de-privacidade.md': '/privacidade',
};

const LegalPage: React.FC<{ kind: keyof typeof DOCS }> = ({ kind }) => {
  const { titulo, md } = DOCS[kind];
  const html = useMemo(
    () =>
      markdownParaHtml(
        md.replace(/\]\(([a-z-]+\.md)\)/g, (_m, arq: string) => `](${ROTAS[arq] ?? arq})`),
      ),
    [md],
  );

  return (
    <div className="min-h-screen bg-bg-main text-text-primary">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <nav className="flex items-center justify-between text-sm mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-text-secondary hover:text-primary-vibrant"
          >
            <ArrowLeft size={16} /> Voltar ao Fassajá
          </Link>
          <Link
            to={kind === 'termos' ? '/privacidade' : '/termos'}
            className="font-medium text-primary-vibrant hover:text-primary-hover"
          >
            {kind === 'termos' ? 'Política de Privacidade' : 'Termos de Uso'} →
          </Link>
        </nav>

        <article
          aria-label={titulo}
          className="
            leading-relaxed text-[15px] sm:text-base
            [&_h1]:text-2xl [&_h1]:sm:text-3xl [&_h1]:font-bold [&_h1]:mb-4
            [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-3
            [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2
            [&_p]:my-3 [&_p]:text-text-secondary
            [&_strong]:text-text-primary
            [&_a]:text-primary-vibrant [&_a]:underline [&_a]:underline-offset-2
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3
            [&_li]:my-1 [&_li]:text-text-secondary
            [&_hr]:my-8 [&_hr]:border-border
            [&_code]:text-[0.9em] [&_code]:bg-bg-secondary [&_code]:px-1 [&_code]:rounded
            [&_table]:w-full [&_table]:my-4 [&_table]:text-sm [&_table]:block [&_table]:overflow-x-auto
            [&_th]:text-left [&_th]:font-semibold [&_th]:p-2 [&_th]:border-b [&_th]:border-border
            [&_td]:p-2 [&_td]:border-b [&_td]:border-border [&_td]:align-top [&_td]:text-text-secondary
          "
          // O HTML vem do nosso próprio .md, escapado em markdownParaHtml.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
};

export default LegalPage;
