import React from 'react';
import { Card } from './Card';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-border/70 rounded-lg ${className}`} />
);

export const DashboardSkeleton: React.FC = () => (
  <>
    {/* Bloco de foco do dia */}
    <Card className="mb-6 h-28 flex items-center gap-4">
      <Skeleton className="w-16 h-16 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
    </Card>

    {/* Faixa de resumo das tarefas */}
    <Card
      padding="none"
      className="mb-6 grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-border"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="px-4 py-3.5 sm:px-5 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-10" />
        </div>
      ))}
    </Card>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <Card className="lg:col-span-2 h-[290px] flex flex-col gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="flex-1 w-full rounded-xl" />
      </Card>
      <Card className="h-[290px] flex flex-col items-center justify-center gap-4">
        <Skeleton className="w-28 h-28 rounded-full" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-2 w-full" />
      </Card>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <Card className="lg:col-span-5 h-64 space-y-3">
        <Skeleton className="h-4 w-36 mb-4" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
      </Card>
      <Card className="lg:col-span-4 h-64 flex items-center justify-center">
        <Skeleton className="w-36 h-36 rounded-full" />
      </Card>
      <Card className="lg:col-span-3 h-64 grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="rounded-2xl" />)}
      </Card>
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

export const CalendarSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <Card className="lg:col-span-2 space-y-3">
      <Skeleton className="h-6 w-40 mb-4" />
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
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

/** Equipe: abas das equipes, faixa de números e os cards de membro. */
export const TeamSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="flex gap-2">
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-32 rounded-xl" />)}
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => <Card key={i} className="h-20" />)}
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="flex flex-col items-center gap-3 py-6">
          <Skeleton className="w-14 h-14 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </Card>
      ))}
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <Card key={i} className="h-20" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="h-72"><Skeleton className="h-full w-full rounded-xl" /></Card>
      <Card className="h-72"><Skeleton className="h-full w-full rounded-xl" /></Card>
    </div>
  </div>
);
