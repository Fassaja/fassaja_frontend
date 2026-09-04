import React from 'react';
import { Card } from './Card';

/**
 * Bloco base de todo esqueleto. A cor e a varredura do brilho vivem na classe
 * `.skeleton` (index.css) porque o brilho é um pseudo-elemento — Tailwind
 * inline não alcança `::after`.
 *
 * `animate={false}` congela a varredura mantendo o bloco no lugar: serve para
 * estado de erro, quando o esqueleto ainda reserva o espaço mas não há mais
 * nada a caminho. Um brilho eterno faz parecer que a tela travou carregando.
 */
export const Skeleton: React.FC<{ className?: string; animate?: boolean }> = ({
  className = '',
  animate = true,
}) => (
  <div
    className={`${animate ? 'skeleton' : 'bg-border/70'} rounded-lg ${className}`}
    aria-hidden="true"
  />
);

/**
 * Espelha a estrutura do painel: abertura sobre o fundo, faixa de números,
 * e três regiões separadas por linha. O esqueleto que existia aqui ainda
 * desenhava cartões e uma terceira fileira de três colunas que a tela não
 * tem mais — o que pisca no carregamento tem de ser o que aparece depois,
 * senão o conteúdo entra pulando.
 */
export const DashboardSkeleton: React.FC = () => (
  <>
    {/* Faixa de abertura: mesma altura e mesmo raio da faixa dia/noite. */}
    <Skeleton className="mb-8 h-[104px] w-full rounded-2xl sm:h-28" />

    <div className="mb-12 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`space-y-2 ${i % 2 ? 'flex flex-col items-end' : ''} ${i === 3 ? 'sm:items-end' : 'sm:items-start'}`}>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-10" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Skeleton className="mb-4 h-3 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="mb-4 h-3 w-32" />
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-28 w-28 rounded-full" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
        </div>
      </div>
    </div>

    <div className="mt-12">
      <Skeleton className="mb-4 h-3 w-28" />
      <Skeleton className="h-[232px] w-full rounded-xl" />
    </div>

    <div className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="mb-4 h-3 w-36" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ))}
    </div>
  </>
);

export const TaskListSkeleton: React.FC = () => (
  <>
    <div className="flex gap-2 mb-4">
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-28 rounded-xl" />)}
    </div>
    <Card padding="sm" className="flex flex-col lg:flex-row gap-3 mb-6">
      <Skeleton className="h-11 flex-1 rounded-xl" />
      <Skeleton className="h-11 w-full lg:w-44 rounded-xl" />
      <Skeleton className="h-11 w-full lg:w-44 rounded-xl" />
    </Card>
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="flex items-start gap-4">
          <Skeleton className="w-6 h-6 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  </>
);

export const ProjectsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i} className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-11 h-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2 w-20" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </Card>
    ))}
  </div>
);

/**
 * Calendário/Agenda: mesma forma da grade real (6 semanas, célula da mesma
 * altura), senão a troca do esqueleto pelo conteúdo empurra a página.
 */
export const CalendarSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <Card className="lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={`w${i}`} className="h-4 w-8 mx-auto my-1" />
        ))}
        {Array.from({ length: 42 }).map((_, i) => (
          <Skeleton key={i} className="h-14 sm:h-16 rounded-xl" />
        ))}
      </div>
    </Card>
    <Card className="space-y-3">
      <Skeleton className="h-5 w-40 mb-3" />
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
    </Card>
  </div>
);

/**
 * Prioridades: cabeçalho da seção + lista de tarefas.
 *
 * Não reusa o TaskListSkeleton porque aquele desenha os chips de filtro e a
 * barra de busca, que esta tela não tem — um esqueleto com forma diferente do
 * conteúdo real dá um solavanco na troca.
 */
export const PrioritiesSkeleton: React.FC = () => (
  <>
    <div className="flex items-center gap-2 mb-4">
      <Skeleton className="w-9 h-9 rounded-xl" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="flex items-start gap-4">
          <Skeleton className="w-6 h-6 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  </>
);

/**
 * Equipe: abas, o cartão principal (cabeçalho + faixa de números + membros) e
 * a dupla de baixo (projetos e tarefas da equipe).
 *
 * Espelha a estrutura real da página: o cartão grande existe porque números e
 * membros ficam DENTRO de um Card só, e não soltos na página. Todo bloco é um
 * `<Skeleton>`, que é quem carrega o `animate-pulse` — um `<Card>` vazio, como
 * havia aqui antes, ocupa o espaço mas fica parado.
 */
export const TeamSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Abas das equipes */}
    <div className="flex gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-36 rounded-xl" />
      ))}
    </div>

    <Card>
      {/* Cabeçalho: cor, nome e os botões da direita */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-3 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="hidden gap-2 sm:flex">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Faixa de números, na mesma divisão do StatStrip */}
      <div className="mb-5 grid grid-cols-2 divide-x divide-y rounded-2xl border border-border sm:grid-cols-4 sm:divide-y-0 divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 px-4 py-3.5 sm:px-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>

      {/* Membros */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border p-4"
          >
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    </Card>

    {/* Projetos (carrossel) + tarefas da equipe */}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <Card className="space-y-3 lg:col-span-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </Card>
      <Card className="lg:col-span-3">
        <Skeleton className="mb-4 h-4 w-36" />
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <Skeleton className="h-[18px] w-[18px] shrink-0 rounded-full" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-3 w-14 shrink-0" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  </div>
);

export const ReportsSkeleton: React.FC = () => (
  <div className="space-y-6">
    <Card className="flex items-center gap-6">
      <Skeleton className="w-20 h-20 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64" />
      </div>
    </Card>
    {/* Cards com conteúdo, não vazios: o pulso mora no <Skeleton>, então um
        <Card> sem nada dentro reservava o espaço mas ficava parado. */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="h-20 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-12" />
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="h-72"><Skeleton className="h-full w-full rounded-xl" /></Card>
      <Card className="h-72"><Skeleton className="h-full w-full rounded-xl" /></Card>
    </div>
  </div>
);
