import { Project } from '@/types/project';

export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Trabalho',
    color: '#2477FF',
    description: 'Tarefas relacionadas ao trabalho',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'proj-2',
    name: 'Estudos',
    color: '#8B5CF6',
    description: 'Aprendizados e certificações',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'proj-3',
    name: 'Pessoal',
    color: '#22C55E',
    description: 'Tarefas pessoais',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'proj-4',
    name: 'Saúde',
    color: '#F43F5E',
    description: 'Atividades relacionadas à saúde',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'proj-5',
    name: 'Marketing',
    color: '#FBBF24',
    description: 'Campanhas e estratégias',
    createdAt: new Date().toISOString(),
  },
];
