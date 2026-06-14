import React, { useRef } from 'react';
import { Camera, Trash2, CheckCircle2, Clock, ListTodo } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { useUser, initialsOf } from '@/contexts/UserContext';
import { useTasks } from '@/hooks/useTasks';

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useUser();
  const { tasks } = useTasks();
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => updateUser({ avatar: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const stats = [
    { label: 'Total de tarefas', value: tasks.length, icon: <ListTodo size={18} />, color: '#2477FF' },
    { label: 'Concluídas', value: tasks.filter(t => t.status === 'completed').length, icon: <CheckCircle2 size={18} />, color: '#22C55E' },
    { label: 'Em andamento', value: tasks.filter(t => t.status === 'in_progress').length, icon: <Clock size={18} />, color: '#FBBF24' },
  ];

  return (
    <AppLayout title="Perfil" subtitle="Suas informações pessoais.">
      <div className="max-w-3xl space-y-6">
        {/* Header card */}
        <Card padding="none" className="overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary-vibrant to-primary-dark" />
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
              <div className="relative shrink-0">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-sm"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-vibrant to-primary-dark flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-sm">
                    {initialsOf(user.name)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Enviar foto"
                  className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-primary-vibrant text-white flex items-center justify-center border-2 border-white hover:bg-primary-hover active:scale-95 transition-all"
                >
                  <Camera size={16} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
              </div>
              <div className="sm:pb-1">
                <h2 className="text-xl font-bold text-text-primary">{user.name || 'Seu nome'}</h2>
                <p className="text-sm text-text-secondary">{user.role}</p>
              </div>
              {user.avatar && (
                <button
                  type="button"
                  onClick={() => updateUser({ avatar: undefined })}
                  className="sm:ml-auto sm:pb-1 inline-flex items-center gap-1.5 text-sm font-medium text-danger hover:text-rose-600"
                >
                  <Trash2 size={15} /> Remover foto
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map(s => (
            <Card key={s.label} className="flex items-center gap-3 py-4">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: s.color + '1A', color: s.color }}
              >
                {s.icon}
              </span>
              <div className="min-w-0">
                <p className="text-xl font-extrabold text-text-primary leading-none">{s.value}</p>
                <p className="text-xs text-text-secondary mt-1 truncate">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Editable info */}
        <Card>
          <h3 className="text-lg font-bold text-text-primary mb-5">Dados pessoais</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Nome"
              value={user.name}
              onChange={e => updateUser({ name: e.target.value })}
              placeholder="Seu nome"
            />
            <Input
              label="Email"
              type="email"
              value={user.email}
              onChange={e => updateUser({ email: e.target.value })}
              placeholder="seu@email.com"
            />
            <Input
              label="Cargo"
              value={user.role}
              onChange={e => updateUser({ role: e.target.value })}
              placeholder="Ex.: Administrador"
            />
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
