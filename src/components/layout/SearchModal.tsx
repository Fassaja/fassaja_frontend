import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckSquare, FolderOpen, CornerDownLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Task } from '@/types/task';
import { Project } from '@/types/project';
import { tasksService } from '@/services/tasksService';
import { projectsService } from '@/services/projectsService';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      tasksService.getTasks().then(setTasks);
      projectsService.getProjects().then(setProjects);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const taskMatches = tasks
      .filter(t => !q || t.title.toLowerCase().includes(q))
      .slice(0, 6);
    const projectMatches = projects
      .filter(p => !q || p.name.toLowerCase().includes(q))
      .slice(0, 4);
    return { taskMatches, projectMatches };
  }, [query, tasks, projects]);

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const total = results.taskMatches.length + results.projectMatches.length;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-primary-dark/60 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed inset-x-0 top-20 z-[70] flex justify-center px-4"
            onClick={onClose}
          >
            <div
              className="w-full max-w-xl bg-white rounded-2xl shadow-xl ring-1 ring-primary-vibrant/20 border-2 border-border overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search size={20} className="text-text-secondary" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar tarefas e projetos..."
                  className="flex-1 bg-transparent text-text-primary placeholder-text-soft focus:outline-none"
                />
                <kbd className="hidden sm:inline text-[11px] text-text-soft border border-border rounded px-1.5 py-0.5">
                  Esc
                </kbd>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-2">
                {total === 0 && (
                  <p className="text-center text-sm text-text-secondary py-8">
                    Nada encontrado para "{query}".
                  </p>
                )}

                {results.taskMatches.length > 0 && (
                  <div className="mb-2">
                    <p className="px-3 py-1.5 text-xs font-semibold text-text-soft uppercase tracking-wide">
                      Tarefas
                    </p>
                    {results.taskMatches.map(task => (
                      <button
                        key={task.id}
                        onClick={() => go('/tasks')}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-bg-secondary text-left group"
                      >
                        <CheckSquare size={18} className="text-primary-vibrant shrink-0" />
                        <span className="flex-1 min-w-0 truncate text-sm text-text-primary">
                          {task.title}
                        </span>
                        <CornerDownLeft
                          size={15}
                          className="text-text-soft opacity-0 group-hover:opacity-100"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {results.projectMatches.length > 0 && (
                  <div>
                    <p className="px-3 py-1.5 text-xs font-semibold text-text-soft uppercase tracking-wide">
                      Projetos
                    </p>
                    {results.projectMatches.map(project => (
                      <button
                        key={project.id}
                        onClick={() => go('/projects')}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-bg-secondary text-left group"
                      >
                        <span
                          className="w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0"
                          style={{ backgroundColor: project.color + '22', color: project.color }}
                        >
                          <FolderOpen size={13} />
                        </span>
                        <span className="flex-1 min-w-0 truncate text-sm text-text-primary">
                          {project.name}
                        </span>
                        <CornerDownLeft
                          size={15}
                          className="text-text-soft opacity-0 group-hover:opacity-100"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};
