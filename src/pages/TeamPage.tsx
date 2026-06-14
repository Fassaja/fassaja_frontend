import React from 'react';
import { Mail } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';

const team = [
  { name: 'João Silva', role: 'Administrador', initials: 'JS', color: '#2477FF', tasks: 12, email: 'joao@fassaja.com' },
  { name: 'Marina Costa', role: 'Designer', initials: 'MC', color: '#8B5CF6', tasks: 8, email: 'marina@fassaja.com' },
  { name: 'Rafael Lima', role: 'Desenvolvedor', initials: 'RL', color: '#22C55E', tasks: 15, email: 'rafael@fassaja.com' },
  { name: 'Ana Souza', role: 'Marketing', initials: 'AS', color: '#FB7185', tasks: 6, email: 'ana@fassaja.com' },
];

const TeamPage: React.FC = () => {
  return (
    <AppLayout title="Equipe" subtitle="As pessoas que tocam os projetos com você.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {team.map(member => (
          <Card key={member.name} hoverable className="flex flex-col items-center text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold mb-3"
              style={{ backgroundColor: member.color }}
            >
              {member.initials}
            </div>
            <p className="font-semibold text-text-primary">{member.name}</p>
            <p className="text-sm text-text-secondary">{member.role}</p>
            <p className="mt-3 text-xs text-text-secondary">
              <span className="font-semibold text-text-primary">{member.tasks}</span> tarefas ativas
            </p>
            <a
              href={`mailto:${member.email}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-vibrant hover:text-primary-hover"
            >
              <Mail size={16} /> Mensagem
            </a>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
};

export default TeamPage;
