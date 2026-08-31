import React, { useState } from 'react';
import {
  CustomEvent,
  CalendarEventCategory,
  EventRecurrence
} from '../../types/masonic';
import { X, Calendar, Plus, CheckCircle2 } from 'lucide-react';

interface CustomEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveEvent: (event: CustomEvent) => void;
}

export const CustomEventModal: React.FC<CustomEventModalProps> = ({
  isOpen,
  onClose,
  onSaveEvent,
}) => {
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<CalendarEventCategory>('evento_social');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>('20:00');
  const [icon, setIcon] = useState<string>('🏛️');
  const [recurrence, setRecurrence] = useState<EventRecurrence>('anual');
  const [description, setDescription] = useState<string>('');
  const [responsible, setResponsible] = useState<string>('');
  const [notify, setNotify] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) {
      alert('Informe ao menos o título e a data do evento.');
      return;
    }

    const newEvent: CustomEvent = {
      id: `evt-${Date.now()}`,
      title: title.trim(),
      category: category,
      date: date,
      time: time || undefined,
      icon: icon || '📌',
      recurrence: recurrence,
      description: description.trim() || undefined,
      responsible: responsible.trim() || undefined,
      notify: notify,
      createdAt: new Date().toISOString(),
    };

    onSaveEvent(newEvent);
    onClose();
  };

  const ICONS_LIST = ['🏛️', '⚜️', '🎂', '🍷', '🍖', '🎓', '🕊️', '🤝', '📐', '👑', '☀️', '✨', '📌', '🏆'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-gradient-to-r from-slate-900 via-slate-850 to-amber-950/40 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-masonic text-amber-200 text-base sm:text-lg font-bold">
                Novo Evento / Data da Loja
              </h3>
              <p className="text-xs text-slate-400">
                Datas comemorativas, banquetes ou eventos sociais
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Título do Evento *</label>
              <input
                type="text"
                placeholder="Ex: Banquete Ritualístico de São João, Fundação da Loja..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CalendarEventCategory)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="evento_social">Evento Social / Ágape / Banquete</option>
                  <option value="aniversario_loja">Aniversário da Loja</option>
                  <option value="aniversario_potencia">Data da Potência / GOSP</option>
                  <option value="data_historica">Data Histórica Maçônica</option>
                  <option value="homenagem">Homenagem / Entrega de Títulos</option>
                  <option value="personalizado">Outro Evento Personalizado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Recorrência</label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as EventRecurrence)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="anual">Anual (Repete todos os anos)</option>
                  <option value="uma_vez">Uma única vez (Data específica)</option>
                  <option value="mensal">Mensal</option>
                  <option value="semanal">Semanal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Data *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Horário (Opcional)</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Ícone */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Ícone</label>
              <div className="flex items-center space-x-2 overflow-x-auto py-1">
                {ICONS_LIST.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all shrink-0 ${
                      icon === ic
                        ? 'bg-amber-500/30 border-2 border-amber-500 scale-110'
                        : 'bg-slate-950 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Responsável / Comissão</label>
              <input
                type="text"
                placeholder="Ex: Comissão de Banquetes, Venerável Mestre, Irmão Chanceler..."
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Descrição / Detalhes</label>
              <textarea
                rows={3}
                placeholder="Descreva a programação, traje sugerido, local ou pauta do evento..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl p-3 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="px-5 py-3 sm:px-6 sm:py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 sm:px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-lg flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Evento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
