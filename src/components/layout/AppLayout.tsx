import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { PlatformTourModal } from './PlatformTourModal';
import { BobAssistant } from '@/components/ai/BobAssistant';
import { SIDEBAR_LARGURA, useSidebar } from '@/contexts/SidebarContext';

interface AppLayoutProps {
  children: React.ReactNode;
  onNewTask?: () => void;
  actionLabel?: string;
  title?: string;
  subtitle?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  onNewTask,
  actionLabel,
  title,
  subtitle,
}) => {
  const { collapsed } = useSidebar();
  const margem = collapsed ? SIDEBAR_LARGURA.conteudo.recolhida : SIDEBAR_LARGURA.conteudo.aberta;

  return (
    <div className="flex min-h-screen bg-bg-main">
      <Sidebar />
      {/* A margem acompanha a barra na mesma duração e curva — se as duas
          transições divergirem, aparece uma faixa de fundo entre elas. */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ease-out-expo ${margem}`}
      >
        <Topbar onNewTask={onNewTask} actionLabel={actionLabel} title={title} subtitle={subtitle} />
        <main className="flex-1 pt-20">
          {/* Entrada suave do conteúdo a cada navegação (o layout remonta por página). */}
          <div className="p-4 lg:p-8 animate-page-in">
            {children}
          </div>
        </main>
      </div>
      <PlatformTourModal />
      {/* Assistente flutuante — em portal, então não afeta o fluxo do layout. */}
      <BobAssistant />
    </div>
  );
};
