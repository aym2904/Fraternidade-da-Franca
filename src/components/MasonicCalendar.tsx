import React, { useState, useMemo } from 'react';
import {
  Member,
  Session,
  CustomEvent,
  ComputedCalendarItem,
  CalendarEventCategory,
  MessageTemplate
} from '../types/masonic';
import {
  generateAllComputedCalendarEvents,
  getEventsForSpecificDate,
  getUpcomingEvents,
  formatFullBrazilianDate,
  generateWhatsAppUrl,
  buildMessageFromTemplate,
  DEFAULT_MESSAGE_TEMPLATES
} from '../utils/masonicCalendarUtils';
import { isLodgeAdmin } from '../utils/authUtils';
import { TodayInLodgeView } from './calendar/TodayInLodgeView';
import { CalendarTimelineView } from './calendar/CalendarTimelineView';
import { CalendarFormModal } from './calendar/CalendarFormModal';
import { WhatsAppTemplateModal } from './calendar/WhatsAppTemplateModal';
import { CustomEventModal } from './calendar/CustomEventModal';
import {
  Calendar as CalendarIcon,
  Sparkles,
  Cake,
  Heart,
  Award,
  Building,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Users,
  MessageCircle,
  List,
  Grid,
  CalendarDays,
  Send,
  Eye,
  SlidersHorizontal,
  Download,
  Share2
} from 'lucide-react';

interface MasonicCalendarProps {
  members: Member[];
  sessions: Session[];
  currentUser: Member;
  onUpdateMember: (updatedMember: Member) => void;
  customEvents?: CustomEvent[];
  onSaveCustomEvent?: (event: CustomEvent) => void;
  onDeleteCustomEvent?: (id: string) => void;
}

export const MasonicCalendar: React.FC<MasonicCalendarProps> = ({
  members,
  sessions,
  currentUser,
  onUpdateMember,
  customEvents = [],
  onSaveCustomEvent,
  onDeleteCustomEvent,
}) => {
  const isAdmin = isLodgeAdmin(currentUser);

  // Sub-aba ativa (Painel Geral como primeira opção)
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'mensal' | 'timeline' | 'anual' | 'templates'
  >('dashboard');

  // Ano e Mês de visualização
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth()); // 0-11

  // Filtros
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [memberToEditInModal, setMemberToEditInModal] = useState<Member | null>(null);
  const [isCustomEventModalOpen, setIsCustomEventModalOpen] = useState<boolean>(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [selectedEventForWhatsApp, setSelectedEventForWhatsApp] = useState<ComputedCalendarItem | null>(null);

  // Dia selecionado para visualização em popup/painel
  const [selectedDayEventsModal, setSelectedDayEventsModal] = useState<{
    dateStr: string;
    events: ComputedCalendarItem[];
  } | null>(null);

  // Modelos de Mensagens carregados
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>(() => {
    const saved = localStorage.getItem('masonic_calendar_templates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_MESSAGE_TEMPLATES;
      }
    }
    return DEFAULT_MESSAGE_TEMPLATES;
  });

  const handleSaveTemplates = (updatedTemplates: MessageTemplate[]) => {
    setMessageTemplates(updatedTemplates);
    localStorage.setItem('masonic_calendar_templates', JSON.stringify(updatedTemplates));
  };

  // Eventos computados para o ano atual selecionado
  const allEvents = useMemo(() => {
    return generateAllComputedCalendarEvents(
      members,
      sessions,
      customEvents,
      currentYear,
      messageTemplates
    );
  }, [members, sessions, customEvents, currentYear, messageTemplates]);

  // Eventos filtrados por categoria e termo de busca
  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      // Filtro de Categoria
      if (selectedCategoryFilter !== 'todos') {
        if (selectedCategoryFilter === 'aniversarios') {
          if (
            ev.category !== 'aniversario_irmao' &&
            ev.category !== 'aniversario_cunhada' &&
            ev.category !== 'aniversario_sobrinho'
          ) {
            return false;
          }
        } else if (selectedCategoryFilter === 'maconicos') {
          if (
            ev.category !== 'iniciacao' &&
            ev.category !== 'elevacao' &&
            ev.category !== 'exaltacao' &&
            ev.category !== 'instalacao'
          ) {
            return false;
          }
        } else if (selectedCategoryFilter === 'casamentos') {
          if (ev.category !== 'casamento') return false;
        } else if (selectedCategoryFilter === 'loja_datas' || selectedCategoryFilter === 'loja_sessoes') {
          if (
            ev.category !== 'aniversario_loja' &&
            ev.category !== 'aniversario_potencia' &&
            ev.category !== 'data_historica' &&
            ev.category !== 'evento_social' &&
            ev.category !== 'homenagem' &&
            ev.category !== 'personalizado'
          ) {
            return false;
          }
        } else if (ev.category !== selectedCategoryFilter) {
          return false;
        }
      }

      // Filtro de Busca
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(query);
        const matchesPerson = ev.personName ? ev.personName.toLowerCase().includes(query) : false;
        const matchesDesc = ev.description ? ev.description.toLowerCase().includes(query) : false;
        const matchesCim = ev.memberCim ? ev.memberCim.includes(query) : false;
        if (!matchesTitle && !matchesPerson && !matchesDesc && !matchesCim) {
          return false;
        }
      }

      return true;
    });
  }, [allEvents, selectedCategoryFilter, searchTerm]);

  // Eventos do mês selecionado
  const monthEvents = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return filteredEvents.filter((e) => e.date.startsWith(monthPrefix));
  }, [filteredEvents, currentYear, currentMonth]);

  // Eventos de Hoje e Próximos Dias (7 ou 15 dias)
  const [upcomingDaysRange, setUpcomingDaysRange] = useState<7 | 15>(7);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = useMemo(() => getEventsForSpecificDate(allEvents, todayStr), [allEvents, todayStr]);
  const upcomingEvents = useMemo(
    () => getUpcomingEvents(allEvents, upcomingDaysRange, new Date()),
    [allEvents, upcomingDaysRange]
  );

  // Navegação de Mês
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  // Matriz de Dias do Mês para a Grade Mensal
  const calendarGridDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Domingo
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      events: ComputedCalendarItem[];
      isToday: boolean;
    }> = [];

    // Dias do mês anterior para preencher a primeira semana
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevMonthNum = currentMonth === 0 ? 12 : currentMonth;
      const prevYearNum = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dStr = `${prevYearNum}-${String(prevMonthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        day: dayNum,
        dateStr: dStr,
        isCurrentMonth: false,
        events: getEventsForSpecificDate(allEvents, dStr),
        isToday: dStr === todayStr,
      });
    }

    // Dias do mês atual
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        dateStr: dStr,
        isCurrentMonth: true,
        events: getEventsForSpecificDate(allEvents, dStr),
        isToday: dStr === todayStr,
      });
    }

    // Dias do próximo mês para completar 35 ou 42 células
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let j = 1; j <= remainingCells; j++) {
      const nextMonthNum = currentMonth === 11 ? 1 : currentMonth + 2;
      const nextYearNum = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dStr = `${nextYearNum}-${String(nextMonthNum).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
      days.push({
        day: j,
        dateStr: dStr,
        isCurrentMonth: false,
        events: getEventsForSpecificDate(allEvents, dStr),
        isToday: dStr === todayStr,
      });
    }

    return days;
  }, [currentYear, currentMonth, allEvents, todayStr]);

  const handleOpenWhatsAppModal = (ev: ComputedCalendarItem) => {
    if (isAdmin) {
      // Usuários com permissões de gestão (Venerável, Secretário, Chanceler, Admin):
      // Acesso ao sistema completo de modelos de mensagens e felicitações oficiais da Loja
      setSelectedEventForWhatsApp(ev);
      setIsWhatsAppModalOpen(true);
    } else {
      // Obreiro comum: abre o contato direto no WhatsApp para conversar com o Irmão
      const targetMember = members.find(
        (m) => m.id === ev.memberId || (ev.memberCim && m.cim === ev.memberCim)
      );
      const targetPhone = targetMember?.phone || ev.phone;
      if (targetPhone && targetPhone.trim() && targetPhone !== '-') {
        const directChatUrl = generateWhatsAppUrl(targetPhone, '');
        window.open(directChatUrl, '_blank');
      } else {
        alert('Este Irmão não possui número de telefone/WhatsApp cadastrado para contato.');
      }
    }
  };

  const handleOpenEditFamily = (member: Member) => {
    setMemberToEditInModal(member);
    setIsFormModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Principal do Módulo */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
              <CalendarIcon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Módulo de Calendário Maçônico
                </span>
                <span className="text-xs text-slate-400">• A∴R∴L∴S∴ Fraternidade da Franca Nº 3571</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif-masonic text-amber-200 font-bold mt-1">
                Calendário da Oficina
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Cálculo automático de idades natalícias, bodas de casamento, marcos maçônicos e envio de
                felicitações no WhatsApp.
              </p>
            </div>
          </div>

          {/* Botões de Ação do Topo */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setMemberToEditInModal(null);
                setIsFormModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Vincular por CIM / Família</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setIsCustomEventModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 sm:px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-medium rounded-xl text-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Evento da Loja</span>
              </button>
            )}
          </div>
        </div>

        {/* Abas de Navegação com Rolagem Horizontal Suave e Toque Fluido */}
        <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto pb-1.5 scrollbar-none touch-pan-x">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg'
                : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Painel Geral</span>
          </button>

          <button
            onClick={() => setActiveTab('mensal')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'mensal'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg'
                : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/60'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grade Mensal</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'timeline'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg'
                : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Por Irmão & Família</span>
          </button>

          <button
            onClick={() => setActiveTab('anual')}
            className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 shrink-0 ${
              activeTab === 'anual'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg'
                : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/60'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Visão Anual ({currentYear})</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center space-x-1.5 shrink-0 ${
                activeTab === 'templates'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg'
                  : 'bg-slate-950/70 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/80 border border-slate-800/60'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Modelos WhatsApp</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ABA: PAINEL GERAL (Principal) */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Próximos 7 ou 15 Dias */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div className="flex items-center space-x-2.5">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                  <h3 className="font-serif-masonic text-amber-200 text-base font-bold">
                    Próximos {upcomingDaysRange} Dias na Loja
                  </h3>
                </div>

                <div className="flex items-center space-x-2.5 self-end sm:self-auto">
                  {/* Seletor 7 Dias / 15 Dias */}
                  <div className="inline-flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setUpcomingDaysRange(7)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                        upcomingDaysRange === 7
                          ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      7 dias
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpcomingDaysRange(15)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                        upcomingDaysRange === 15
                          ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      15 dias
                    </button>
                  </div>

                  <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                    {upcomingEvents.length} {upcomingEvents.length === 1 ? 'evento' : 'eventos'}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">
                    Nenhum evento nos próximos {upcomingDaysRange} dias.
                  </p>
                ) : (
                  upcomingEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-amber-500/40 transition-colors"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="text-xl shrink-0">{ev.icon || '📌'}</div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-200 text-xs break-words leading-tight">{ev.title}</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {formatFullBrazilianDate(ev.date)} • {ev.subInfo}
                          </p>
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => handleOpenWhatsAppModal(ev)}
                          className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs transition-colors shrink-0"
                          title="Felicitações Oficiais da Loja (WhatsApp)"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Acontecimentos do Mês Atual */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <CalendarDays className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-serif-masonic text-indigo-200 text-base font-bold">
                    Destaques de {monthNames[currentMonth]}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('mensal')}
                  className="text-xs text-amber-400 hover:text-amber-300 underline"
                >
                  Ver na Grade
                </button>
              </div>

              <div className="mt-4 space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {monthEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">Nenhum evento este mês.</p>
                ) : (
                  monthEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="text-xl shrink-0">{ev.icon || '📌'}</div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-200 text-xs break-words leading-tight">{ev.title}</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Dia {ev.date.split('-')[2]} • {ev.subInfo}
                          </p>
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => handleOpenWhatsAppModal(ev)}
                          className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs transition-colors shrink-0"
                          title="Felicitações Oficiais da Loja (WhatsApp)"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ABA: GRADE MENSAL */}
      {/* ========================================================================= */}
      {activeTab === 'mensal' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {/* Barra de Controle de Mês/Ano e Filtros */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePrevMonth}
                className="p-2 text-slate-400 hover:text-amber-300 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-serif-masonic text-amber-200 font-bold min-w-[200px] text-center">
                {monthNames[currentMonth]} de {currentYear}
              </h2>

              <button
                onClick={handleNextMonth}
                className="p-2 text-slate-400 hover:text-amber-300 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  setCurrentYear(new Date().getFullYear());
                  setCurrentMonth(new Date().getMonth());
                }}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
              >
                Hoje
              </button>
            </div>

            {/* Filtro Rápido de Categoria */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-amber-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
              >
                <option value="todos">Todos os Eventos</option>
                <option value="aniversarios">Apenas Aniversários (Irmãos, Cunhadas, Sobrinhos)</option>
                <option value="maconicos">Apenas Datas Maçônicas (Graus 1, 2, 3)</option>
                <option value="casamentos">Apenas Bodas de Casamento</option>
                <option value="loja_datas">Datas da Loja & Potência / Comemorativas</option>
              </select>
            </div>
          </div>

          {/* Grade do Calendário */}
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Cabeçalho dos Dias da Semana */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider font-serif-masonic">
                <div className="p-2 rounded-lg bg-slate-950/40 text-amber-400">Domingo</div>
                <div className="p-2 rounded-lg bg-slate-950/40">Segunda</div>
                <div className="p-2 rounded-lg bg-slate-950/40">Terça</div>
                <div className="p-2 rounded-lg bg-slate-950/40">Quarta</div>
                <div className="p-2 rounded-lg bg-slate-950/40">Quinta</div>
                <div className="p-2 rounded-lg bg-slate-950/40">Sexta</div>
                <div className="p-2 rounded-lg bg-slate-950/40 text-indigo-400">Sábado</div>
              </div>

              {/* Células de Dias */}
              <div className="grid grid-cols-7 gap-2">
                {calendarGridDays.map((cell, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (cell.events.length > 0) {
                        setSelectedDayEventsModal({
                          dateStr: cell.dateStr,
                          events: cell.events,
                        });
                      }
                    }}
                    className={`min-h-[110px] p-2 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                      cell.isCurrentMonth
                        ? 'bg-slate-950/80 border-slate-800 hover:border-amber-500/50 hover:bg-slate-950'
                        : 'bg-slate-950/30 border-slate-900/60 opacity-40 hover:opacity-70'
                    } ${cell.isToday ? 'ring-2 ring-amber-500 border-amber-500/60' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold font-serif-masonic ${
                          cell.isToday
                            ? 'px-2 py-0.5 rounded-full bg-amber-500 text-slate-950'
                            : cell.isCurrentMonth
                            ? 'text-slate-200'
                            : 'text-slate-500'
                        }`}
                      >
                        {cell.day}
                      </span>

                      {cell.events.length > 0 && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-full">
                          {cell.events.length}
                        </span>
                      )}
                    </div>

                    {/* Badges de Eventos no Dia */}
                    <div className="mt-1.5 space-y-1 flex-1 overflow-hidden">
                      {cell.events.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className="text-[10px] truncate px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/60 text-slate-300 font-medium flex items-center space-x-1"
                        >
                          <span>{ev.icon}</span>
                          <span className="truncate">{ev.personName || ev.title}</span>
                        </div>
                      ))}

                      {cell.events.length > 2 && (
                        <div className="text-[9px] text-amber-400 font-semibold text-center">
                          +{cell.events.length - 2} outro(s)
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ABA: LINHA DO TEMPO POR IRMÃO */}
      {/* ========================================================================= */}
      {activeTab === 'timeline' && (
        <CalendarTimelineView
          members={members}
          currentUser={currentUser}
          allEvents={allEvents}
          onOpenEditFamilyModal={handleOpenEditFamily}
          messageTemplates={messageTemplates}
        />
      )}

      {/* ========================================================================= */}
      {/* 6. ABA: VISÃO ANUAL */}
      {/* ========================================================================= */}
      {activeTab === 'anual' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif-masonic text-amber-200 font-bold">
              Visão Anual Panorâmica • {currentYear}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentYear(currentYear - 1)}
                className="p-1.5 text-slate-400 hover:text-amber-300 bg-slate-950 border border-slate-800 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-amber-300 font-serif-masonic px-2">{currentYear}</span>
              <button
                onClick={() => setCurrentYear(currentYear + 1)}
                className="p-1.5 text-slate-400 hover:text-amber-300 bg-slate-950 border border-slate-800 rounded-lg"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {monthNames.map((mName, mIdx) => {
              const prefix = `${currentYear}-${String(mIdx + 1).padStart(2, '0')}`;
              const count = allEvents.filter((e) => e.date.startsWith(prefix)).length;

              return (
                <div
                  key={mName}
                  onClick={() => {
                    setCurrentMonth(mIdx);
                    setActiveTab('mensal');
                  }}
                  className="p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-amber-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="font-serif-masonic text-slate-200 font-bold group-hover:text-amber-300 transition-colors">
                      {mName}
                    </h3>
                    <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold rounded-full">
                      {count}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-400">
                    {allEvents
                      .filter((e) => e.date.startsWith(prefix))
                      .slice(0, 3)
                      .map((ev) => (
                        <div key={ev.id} className="truncate flex items-center space-x-1.5">
                          <span>{ev.icon}</span>
                          <span className="truncate">
                            Dia {ev.date.split('-')[2]}: {ev.personName || ev.title}
                          </span>
                        </div>
                      ))}
                    {count > 3 && (
                      <p className="text-[10px] text-amber-400 font-semibold pt-1">+{count - 3} outros...</p>
                    )}
                    {count === 0 && <p className="text-slate-600 text-xs py-2">Sem eventos</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. ABA: MODELOS DE MENSAGENS WHATSAPP */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && isAdmin && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-serif-masonic text-amber-200 font-bold">
                Modelos de Mensagens WhatsApp
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Personalize os textos automáticos utilizados para felicitações e saudações maçônicas.
              </p>
            </div>

            <button
              onClick={() => handleSaveTemplates(DEFAULT_MESSAGE_TEMPLATES)}
              className="text-xs text-amber-400 hover:text-amber-300 underline"
            >
              Restaurar Padrões da Loja
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {messageTemplates.map((tpl) => (
              <div key={tpl.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-200 text-sm">{tpl.title}</h4>
                  <span className="text-[11px] text-amber-400/90 font-mono bg-amber-500/10 px-2 py-0.5 rounded">
                    {tpl.category}
                  </span>
                </div>

                <textarea
                  rows={6}
                  value={tpl.template}
                  onChange={(e) => {
                    const newTpl = messageTemplates.map((item) =>
                      item.id === tpl.id ? { ...item, template: e.target.value } : item
                    );
                    handleSaveTemplates(newTpl);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE EVENTOS DO DIA ESPECÍFICO (GRADE MENSAL) */}
      {/* ========================================================================= */}
      {selectedDayEventsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-serif-masonic text-amber-200 text-base font-bold">
                  Acontecimentos do Dia
                </h3>
                <p className="text-xs text-amber-400 font-mono">
                  {formatFullBrazilianDate(selectedDayEventsModal.dateStr)}
                </p>
              </div>
              <button
                onClick={() => setSelectedDayEventsModal(null)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {selectedDayEventsModal.events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{ev.icon}</div>
                    <div>
                      <h4 className="font-semibold text-slate-200 text-xs">{ev.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{ev.subInfo || ev.description}</p>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setSelectedDayEventsModal(null);
                        handleOpenWhatsAppModal(ev);
                      }}
                      className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-medium transition-colors shrink-0"
                      title="Felicitações Oficiais da Loja (WhatsApp)"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: FORMULÁRIO DE VÍNCULO POR CIM */}
      <CalendarFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        members={members}
        currentUser={currentUser}
        initialMember={memberToEditInModal}
        onSaveMember={(updated) => {
          onUpdateMember(updated);
        }}
      />

      {/* MODAL 2: NOVO EVENTO DA LOJA */}
      <CustomEventModal
        isOpen={isCustomEventModalOpen}
        onClose={() => setIsCustomEventModalOpen(false)}
        onSaveEvent={(evt) => {
          if (onSaveCustomEvent) {
            onSaveCustomEvent(evt);
          }
        }}
      />

      {/* MODAL 3: DISPARO WHATSAPP */}
      <WhatsAppTemplateModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        selectedEvent={selectedEventForWhatsApp}
        members={members}
        templates={messageTemplates}
        onSaveTemplates={handleSaveTemplates}
      />
    </div>
  );
};
