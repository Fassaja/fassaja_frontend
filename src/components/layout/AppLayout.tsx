import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppLayoutProps {
  children: React.ReactNode;
  onNewTask?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  onNewTask,
  searchValue,
  onSearchChange,
}) => {
  return (
    <div className="flex h-screen bg-bg-main">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-64">
        <Topbar onNewTask={onNewTask} searchValue={searchValue} onSearchChange={onSearchChange} />
        <main className="flex-1 overflow-auto pt-16">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
