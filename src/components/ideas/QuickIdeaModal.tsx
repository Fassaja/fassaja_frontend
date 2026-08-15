import React, { useState } from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { HeadlineInput, NoteField } from '@/components/common/HeadlineInput';
import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/Select';
import { DatePicker } from '@/components/common/DatePicker';
import { OptionSelector } from '@/components/common/OptionSelector';
import { useToast } from '@/contexts/ToastContext';
import { monthOptions } from '@/utils/ideaStatus';
import { Idea, IdeaInput } from '@/types/idea';

interface QuickIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (input: IdeaInput) => Promise<Idea>;
  /** Chamado com a ideia recém-criada quando a pessoa escolhe detalhar agora. */
  onDetail: (idea: Idea) => void;
}

// "Quando" no cadastro rápido: só o suficiente para a ideia não se perder. A
// data exata, a dependência e o resto ficam no formulário completo — pedir tudo
// aqui faria a pessoa desistir de anotar, que é o único jeito de perder a ideia
// de vez.
type Quando = 'nao-sei' | 'mes' | 'data';

function proximoMes(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const QuickIdeaModal: React.FC<QuickIdeaModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  onDetail,
}) => {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quando, setQuando] = useState<Quando>('nao-sei');
  const [mes, setMes] = useState(proximoMes());
  const [data, setData] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const limpar = () => {
    setTitle('');
    setDescription('');
    setQuando('nao-sei');
    setMes(proximoMes());
    setData('');
    setError('');
  };

  const salvar = async (detalhar: boolean) => {
    const titulo = title.trim();
    if (!titulo) {
      setError('Dê um título à ideia antes de continuar.');
      return;
    }
    const startTarget = quando === 'mes' ? mes : quando === 'data' ? data : undefined;
    if (quando === 'data' && !data) {
      setError('Escolha a data ou volte para "ainda não sei".');
      return;
    }
    try {
      setSaving(true);
      const criada = await onCreate({
        title: titulo,
        description: description.trim() || undefined,
        startTarget,
        // Com previsão definida a ideia já nasce planejada; sem previsão, é
        // rascunho. Poupa um campo no cadastro rápido sem mentir sobre o estado.
        status: startTarget ? 'planejada' : 'rascunho',
      });
      toast.success('Ideia guardada.');
      limpar();
      onClose();
      if (detalhar) onDetail(criada);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível guardar a ideia.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        limpar();
        onClose();
      }}
      title="Nova ideia"
      size="md"
    >
      <form
        onSubmit={e => {
          e.preventDefault();
          salvar(false);
        }}
        className="space-y-4"
      >
        <div className="flex items-start gap-3 p-3 rounded-xl bg-primary-light/60">
          <span className="w-10 h-10 shrink-0 rounded-xl bg-surface text-primary-vibrant flex items-center justify-center">
            <Lightbulb size={18} />
          </span>
          <p className="text-sm text-primary-dark/80">
            Anote agora, decida depois. Só o título é obrigatório — dá para completar o resto
            quando a ideia amadurecer.
          </p>
        </div>

        {/* Mesmo bloco de escrita da tarefa e do evento: o título é a ideia,
            não um campo chamado "título". */}
        <div>
          <HeadlineInput
            aria-label="Título da ideia"
            placeholder="Qual é a ideia?"
            value={title}
            onChange={e => {
              setTitle(e.target.value);
              if (error) setError('');
            }}
            maxLength={160}
            disabled={saving}
            autoFocus
          />
          <NoteField
            aria-label="Descrição da ideia"
            className="mt-2"
            maxLength={4000}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="O suficiente para você lembrar do que era daqui a três meses."
            disabled={saving}
          />
        </div>

        <div className="pt-4 border-t border-border">
          <OptionSelector
            label="Quando pretende começar?"
            options={[
              { value: 'nao-sei', label: 'Ainda não sei' },
              { value: 'mes', label: 'Em um mês' },
              { value: 'data', label: 'Em uma data' },
            ]}
            value={quando}
            onChange={v => setQuando(v as Quando)}
            size="sm"
            disabled={saving}
          />
        </div>

        {/* Select em vez de <input type="month">: o Safari não suporta esse
            tipo e o campo vira texto livre, mostrando "2026-09" cru. */}
        {quando === 'mes' && (
          <Select
            label="Mês"
            options={monthOptions()}
            value={mes}
            onChange={setMes}
            helperText="Só o mês já basta — o dia você define quando estiver mais perto."
          />
        )}
        {/* DatePicker do app, e não <input type="date">: é o calendário que o
            resto das telas usa, e não depende do suporte do navegador. */}
        {quando === 'data' && (
          <DatePicker
            label="Data"
            value={data}
            onChange={v => {
              setData(v);
              if (error) setError('');
            }}
            disabled={saving}
            openUp
          />
        )}

        {/* Sem condição de título: o erro de "título vazio" era mostrado pelo
            campo antigo, e o HeadlineInput não tem onde exibi-lo. */}
        {error && <p className="text-xs text-danger">{error}</p>}

        {/* sticky: em janela baixa o modal rola, e sem isto os botões ficam
            abaixo da dobra — a pessoa preenche tudo e não acha como salvar. */}
        <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-1 bg-surface border-t border-border flex flex-col-reverse sm:flex-row justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => salvar(true)}
            isLoading={saving}
            icon={<Sparkles size={16} />}
          >
            Salvar e detalhar
          </Button>
          <Button type="submit" isLoading={saving}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
};
