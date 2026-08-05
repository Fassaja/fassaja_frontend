import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { PlatformTourModal } from './PlatformTourModal';
import { BobAssistant } from '@/components/ai/BobAssistant';

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
  return (
    <div className="flex min-h-screen bg-bg-main">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
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
