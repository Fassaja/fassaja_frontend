import { Task } from '@/types/task';

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Reunião com a equipe de design',
    description: 'Discutir wireframes do novo dashboard',
    status: 'pending',
    priority: 'high',
    projectId: 'proj-1',
    dueDate: today.toISOString().split('T')[0],
    createdAt: new Date(today.getTime() - 86400000).toISOString(),
  },
  {
    id: '2',
    title: 'Finalizar protótipo da dashboard',
    description: 'Completar o design no Figma',
    status: 'in_progress',
    priority: 'high',
    projectId: 'proj-1',
    dueDate: tomorrow.toISOString().split('T')[0],
    createdAt: new Date(today.getTime() - 172800000).toISOString(),
  },
  {
    id: '3',
    title: 'Enviar relatório mensal',
    status: 'pending',
    priority: 'medium',
    projectId: 'proj-2',
    dueDate: tomorrow.toISOString().split('T')[0],
    createdAt: new Date(today.getTime() - 259200000).toISOString(),
  },
  {
    id: '4',
    title: 'Atualizar documentação do projeto',
    status: 'completed',
    priority: 'low',
    projectId: 'proj-1',
    dueDate: today.toISOString().split('T')[0],
    createdAt: new Date(today.getTime() - 345600000).toISOString(),
    completedAt: today.toISOString(),
  },
  {
    id: '5',
    title: 'Revisar feedback do cliente',
    status: 'pending',
    priority: 'high',
    projectId: 'proj-3',
    dueDate: yesterday.toISOString().split('T')[0],
    createdAt: new Date(today.getTime() - 432000000).toISOString(),
  },
  {
    id: '6',
    title: 'Estudar React Query',
    status: 'completed',
    priority: 'medium',
    projectId: 'proj-4',
    dueDate: today.toISOString().split('T')[0],
    createdAt: new Date(today.getTime() - 518400000).toISOString(),
    completedAt: today.toISOString(),
  },
  {
    id: '7',
    title: 'Planejar sprint da semana',
    status: 'pending',
    priority: 'high',
    projectId: 'proj-1',
    dueDate: nextWeek.toISOString().split('T')[0],
    createdAt: new Date(today.getTime() - 604800000).toISOString(),
  },
  {
    id: '8',
    title: 'Organizar tarefas pessoais',
    status: 'completed',
    priority: 'low',
    dueDate: today.toISOString().split('T')[0],
    createdAt: new Date(today.getTime() - 86400000).toISOString(),
    completedAt: today.toISOString(),
  },
  {
    id: '9',
    title: 'Revisão de código - PR #123',
    status: 'pending',
    priority: 'high',
    projectId: 'proj-1',
    dueDate: today.toISOString().split('T')[0],
    createdAt: new Date(today.getTime() - 172800000).toISOString(),
  },
  {
    id: '10',
    title: 'Configurar CI/CD pipeline',
    status: 'overdue',
    priority: 'high',
    projectId: 'proj-2',
    dueDate: yesterday.toISOString().split('T')[0],
    createdAt: new Date(today.getTime() - 259200000).toISOString(),
  },
];
