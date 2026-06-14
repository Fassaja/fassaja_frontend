import React, { useRef } from 'react';
import { Camera, Trash2, CheckCircle2, Clock, ListTodo, Flame } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { useUser, initialsOf, computeStreak } from '@/contexts/UserContext';
import { useTasks } from '@/hooks/useTasks';

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useUser();
  const { tasks } = useTasks();
  const fileRef = useRef<HTMLInputElement>(null);

  // Dias produtivos = histórico persistido ∪ dias com conclusões reais.
  const activeDays = new Set<string>(user.productiveDays);
  tasks.forEach(t => {
    if (t.status === 'completed' && t.completedAt) {
      activeDays.add(isoOf(new Date(t.completedAt)));
    }
  });
  const streak = computeStreak(Array.from(activeDays));
  const weekStrip = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      iso: isoOf(d),
      letter: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][d.getDay()],
      active: activeDays.has(isoOf(d)),
      isToday: i === 6,
    };
  });

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

        {/* Productive streak */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text-primary">Sequência produtiva</h3>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 font-bold text-sm">
              <Flame size={16} />
              {streak} {streak === 1 ? 'dia' : 'dias'}
            </span>
          </div>

          <p className="text-sm text-text-secondary mb-4">
            {streak === 0
              ? 'Conclua uma tarefa hoje para começar uma nova sequência.'
              : streak < 3
              ? 'Bom começo! Mantenha o ritmo para crescer a sequência.'
              : 'Você está mantendo uma ótima constância. Continue assim! 🔥'}
          </p>

          <div className="flex justify-between gap-2">
            {weekStrip.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={`w-full aspect-square max-w-[44px] rounded-xl flex items-center justify-center transition-colors ${
                    day.active
                      ? 'bg-amber-400 text-white'
                      : 'bg-bg-secondary text-text-soft'
                  } ${day.isToday ? 'ring-2 ring-primary-vibrant ring-offset-2' : ''}`}
                >
                  {day.active ? <Flame size={16} /> : ''}
                </div>
                <span className="text-[11px] text-text-secondary">{day.letter}</span>
              </div>
            ))}
          </div>
        </Card>

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
