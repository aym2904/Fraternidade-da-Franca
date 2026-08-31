import React, { useState } from 'react';
import {
  Member,
  ComputedCalendarItem,
  CalendarEventCategory,
  MessageTemplate
} from '../../types/masonic';
import {
  getEventsForSpecificDate,
  formatFullBrazilianDate,
  generateWhatsAppUrl,
  buildMessageFromTemplate,
  DEFAULT_MESSAGE_TEMPLATES
} from '../../utils/masonicCalendarUtils';
import {
  Calendar,
  Cake,
  Heart,
  Award,
  Building,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Clock,
  Send,
  User,
  CheckCircle2,
  CalendarDays,
  Gift
} from 'lucide-react';

interface TodayInLodgeViewProps {
  allEvents: ComputedCalendarItem[];
  members: Member[];
  currentUser: Member;
  messageTemplates: MessageTemplate[];
  onOpenMessageModal: (event: ComputedCalendarItem) => void;
  onNavigateToMonthView: (dateStr: string) => void;
}

export const TodayInLodgeView: React.FC<TodayInLodgeViewProps> = ({
  allEvents,
  members,
  currentUser,
  messageTemplates = DEFAULT_MESSAGE_TEMPLATES,
  onOpenMessageModal,
  onNavigateToMonthView,
}) => {
  // Data selecionada para o "Hoje na Loja" (por padrão a data de hoje YYYY-MM-DD)
  const todayIso = new Date().toISOString().split('T')[0];
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayIso);

  const isCurrentDayToday = selectedDateStr === todayIso;

  // Eventos do dia selecionado
  const dayEvents = getEventsForSpecificDate(allEvents, selectedDateStr);

  // Categorização dos eventos para exibição elegante no formato especificado pelo usuário
  const birthAnniversaries = dayEvents.filter(
    (e) =>
      e.category === 'aniversario_irmao' ||
      e.category === 'aniversario_cunhada' ||
      e.category === 'aniversario_sobrinho'
  );

  const masonicMilestones = dayEvents.filter(
    (e) =>
      e.category === 'iniciacao' ||
      e.category === 'elevacao' ||
      e.category === 'exaltacao' ||
      e.category === 'instalacao'
  );

  const lodgeEvents = dayEvents.filter(
    (e) =>
      e.category === 'aniversario_loja' ||
      e.category === 'aniversario_potencia' ||
      e.category === 'data_historica'
  );

  const weddingAnniversaries = dayEvents.filter((e) => e.category === 'casamento');

  const customAndOtherEvents = dayEvents.filter(
    (e) =>
      e.category === 'evento_social' ||
      e.category === 'homenagem' ||
      e.category === 'personalizado'
  );

  // Navegar dias
  const handleShiftDay = (delta: number) => {
    const parts = selectedDateStr.split('-');
    const curDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    curDate.setDate(curDate.getDate() + delta);
    setSelectedDateStr(curDate.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDateStr(todayIso);
  };

  // Envio direto do WhatsApp para um evento
  const handleDirectWhatsApp = (event: ComputedCalendarItem) => {
    let tpl = messageTemplates.find((t) => t.category === event.category);
    if (!tpl) {
      tpl = DEFAULT_MESSAGE_TEMPLATES.find((t) => t.category === event.category) || DEFAULT_MESSAGE_TEMPLATES[0];
    }

    const targetMember = members.find((m) => m.id === event.memberId || m.cim === event.memberCim);

    const messageText = buildMessageFromTemplate(tpl.template, {
      nome: event.personName || targetMember?.fullName || '',
      idade: event.yearsCount,
      grau: targetMember?.degree || event.degree || 'Mestre Maçom',
      cargo: targetMember?.currentOfficerRole || event.role || 'Obreiro',
      anos: event.yearsCount,
      boda: event.weddingBodaName,
      cunhada: targetMember?.wife?.name || event.personName,
      irmao: targetMember?.fullName || event.personName,
      pai: targetMember?.fullName,
      mae: targetMember?.wife?.name,
    });

    const url = generateWhatsAppUrl(event.phone || targetMember?.phone, messageText);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header com Navegador de Data */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-amber-950/40 border border-amber-900/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ⭐ Painel Solene da Oficina
              </span>
              {isCurrentDayToday && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                  HOJE
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif-masonic text-amber-200 mt-2 tracking-wide font-bold">
              Hoje na Loja
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Centralizador instantâneo de aniversários, datas maçônicas, celebrações e agenda do dia.
            </p>
          </div>

          {/* Seletor e Navegação de Data */}
          <div className="flex items-center justify-between sm:justify-start space-x-1.5 sm:space-x-2 bg-slate-950/90 p-1.5 sm:p-2 rounded-xl border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => handleShiftDay(-1)}
              title="Dia Anterior"
              className="p-2 sm:p-2.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleSetToday}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                isCurrentDayToday
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Hoje
            </button>

            <input
              type="date"
              value={selectedDateStr}
              onChange={(e) => e.target.value && setSelectedDateStr(e.target.value)}
              className="flex-1 sm:flex-none bg-slate-900 border border-slate-700 text-slate-200 text-xs sm:text-sm rounded-lg px-2.5 sm:px-3 py-1.5 focus:outline-none focus:border-amber-500 font-mono"
            />

            <button
              onClick={() => handleShiftDay(1)}
              title="Próximo Dia"
              className="p-2 sm:p-2.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Banner de Data Destacada */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center space-x-2 text-amber-300/90 font-medium">
            <CalendarDays className="w-5 h-5 text-amber-400" />
            <span className="text-base uppercase tracking-wider font-serif-masonic">
              {formatFullBrazilianDate(selectedDateStr)}
            </span>
          </div>

          <div className="flex items-center space-x-4 text-xs text-slate-400">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span>{dayEvents.length} acontecimento(s) nesta data</span>
            </span>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal do Dia */}
      {dayEvents.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-800/80 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-serif-masonic text-slate-300">Nenhum evento registrado para este dia</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
            Não há aniversários de irmãos, cunhadas, sobrinhos, datas maçônicas ou comemorações da loja agendadas para{' '}
            {formatFullBrazilianDate(selectedDateStr)}.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {!isCurrentDayToday && (
              <button
                onClick={handleSetToday}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-semibold rounded-xl transition-colors shadow"
              >
                Voltar para Hoje
              </button>
            )}
            <button
              onClick={() => onNavigateToMonthView(selectedDateStr)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-sm font-medium rounded-xl transition-colors border border-slate-700"
            >
              Ver Mês Completo
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Aniversários Natalícios (Irmãos, Cunhadas, Sobrinhos) */}
          {birthAnniversaries.length > 0 && (
            <div className="bg-slate-900 border border-amber-900/30 rounded-2xl p-5 shadow-lg relative flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                    <Cake className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-serif-masonic text-amber-200 text-lg font-bold">🎂 Aniversários</h2>
                    <p className="text-xs text-slate-400">Parabéns aos aniversariantes do dia</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/30">
                  {birthAnniversaries.length}
                </span>
              </div>

              <div className="mt-4 space-y-3 flex-1">
                {birthAnniversaries.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 hover:border-amber-500/40 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="text-2xl shrink-0">{ev.icon}</div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-slate-200 text-sm break-words group-hover:text-amber-300 transition-colors">
                            {ev.personName}
                          </h4>
                          {ev.yearsCount !== undefined && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold shrink-0">
                              {ev.yearsCount} anos
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 break-words">{ev.subInfo}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        onClick={() => handleDirectWhatsApp(ev)}
                        title="Enviar Felicitação no WhatsApp"
                        className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-medium transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Felicitar</span>
                      </button>
                      <button
                        onClick={() => onOpenMessageModal(ev)}
                        title="Ver / Personalizar Modelo"
                        className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Datas Maçônicas (Iniciações, Elevações, Exaltações, Instalações) */}
          {masonicMilestones.length > 0 && (
            <div className="bg-slate-900 border border-emerald-900/30 rounded-2xl p-5 shadow-lg relative flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-serif-masonic text-emerald-200 text-lg font-bold">⚜️ Datas Maçônicas</h2>
                    <p className="text-xs text-slate-400">Jornada nos Augustos Mistérios da Maçonaria</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                  {masonicMilestones.length}
                </span>
              </div>

              <div className="mt-4 space-y-3 flex-1">
                {masonicMilestones.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 hover:border-emerald-500/40 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="text-2xl shrink-0">{ev.icon}</div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-slate-200 text-sm break-words group-hover:text-emerald-300 transition-colors">
                            {ev.yearsCount} anos • {ev.title.replace('Aniv. de ', '')}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 break-words">{ev.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDirectWhatsApp(ev)}
                      title="Enviar Parabéns Maçônico no WhatsApp"
                      className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-medium transition-colors shrink-0"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Aniversários de Casamento (Bodas) */}
          {weddingAnniversaries.length > 0 && (
            <div className="bg-slate-900 border border-pink-900/30 rounded-2xl p-5 shadow-lg relative flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-serif-masonic text-rose-200 text-lg font-bold">💍 Família & Bodas</h2>
                    <p className="text-xs text-slate-400">Aniversários de Casamento</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/30">
                  {weddingAnniversaries.length}
                </span>
              </div>

              <div className="mt-4 space-y-3 flex-1">
                {weddingAnniversaries.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 hover:border-rose-500/40 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="text-2xl shrink-0">🥂</div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-slate-200 text-sm break-words group-hover:text-rose-300 transition-colors">
                            {ev.personName}
                          </h4>
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold shrink-0">
                            {ev.yearsCount} anos
                          </span>
                        </div>
                        <p className="text-xs text-rose-400/90 font-medium mt-0.5 break-words">{ev.weddingBodaName}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDirectWhatsApp(ev)}
                      title="Felicitar Casal no WhatsApp"
                      className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-medium transition-colors shrink-0"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Felicitar</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Loja & Datas Históricas */}
          {lodgeEvents.length > 0 && (
            <div className="bg-slate-900 border border-amber-900/30 rounded-2xl p-5 shadow-lg relative flex flex-col md:col-span-2">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-serif-masonic text-amber-200 text-lg font-bold">🏛️ Loja & Tradição Maçônica</h2>
                    <p className="text-xs text-slate-400">Marcos históricos e datas comemorativas</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/30">
                  {lodgeEvents.length}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                {lodgeEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 hover:border-amber-500/40 transition-all flex items-start space-x-3"
                  >
                    <div className="text-2xl shrink-0">{ev.icon}</div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-slate-200 text-sm">{ev.title}</h4>
                        {ev.yearsCount !== undefined && ev.yearsCount > 0 && (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-md shrink-0">
                            {ev.yearsCount} anos
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ev.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Eventos Personalizados / Sociais */}
          {customAndOtherEvents.length > 0 && (
            <div className="bg-slate-900 border border-cyan-900/30 rounded-2xl p-5 shadow-lg relative flex flex-col md:col-span-2">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-serif-masonic text-cyan-200 text-lg font-bold">✨ Eventos & Atividades da Loja</h2>
                    <p className="text-xs text-slate-400">Acontecimentos programados</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/30">
                  {customAndOtherEvents.length}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                {customAndOtherEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/90 hover:border-cyan-500/40 transition-all flex items-start space-x-3"
                  >
                    <div className="text-2xl shrink-0">{ev.icon || '📌'}</div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-200 text-sm">{ev.title}</h4>
                      <p className="text-xs text-cyan-300/80 mt-0.5">{ev.subInfo}</p>
                      {ev.description && <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ev.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
