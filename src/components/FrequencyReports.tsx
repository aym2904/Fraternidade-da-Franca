import React, { useState, useMemo, useCallback } from 'react';
import {
  ShieldAlert,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  Search,
  Send,
  Award,
  Check,
  Calendar,
  XCircle,
  Clock,
  MapPin,
  X,
  FileText,
  ChevronRight,
  Info,
  Copy,
  MessageCircle
} from 'lucide-react';
import { Member, Session, AttendanceRecord, InactivityAlert } from '../types/masonic';
import {
  calculateMemberAttendance,
  detectInactivityAlerts,
  getMemberAttendanceBreakdown,
  MemberAttendanceItem
} from '../utils/masonicUtils';
import { isLodgeAdmin } from '../utils/authUtils';
import { getMemberPhotoUrl } from '../utils/avatarUtils';
import { generateWhatsAppUrl } from '../utils/masonicCalendarUtils';

interface FrequencyReportsProps {
  members: Member[];
  sessions: Session[];
  attendances: AttendanceRecord[];
  inactivityAlerts: InactivityAlert[];
  currentUser: Member;
}

export const FrequencyReports: React.FC<FrequencyReportsProps> = ({
  members = [],
  sessions = [],
  attendances = [],
  inactivityAlerts = [],
  currentUser,
}) => {
  const isAdmin = isLodgeAdmin(currentUser);
  const [activeTab, setActiveTab] = useState<'assiduidade' | 'alertas'>('assiduidade');
  const [searchTerm, setSearchTerm] = useState('');
  const [notifiedMembers, setNotifiedMembers] = useState<Record<string, boolean>>({});
  const [selectedMemberForDetail, setSelectedMemberForDetail] = useState<Member | null>(null);
  const [detailFilter, setDetailFilter] = useState<'all' | 'missed' | 'attended'>('all');
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Non-admin users see ONLY their own attendance data
  const visibleMembers = useMemo(() => {
    return isAdmin ? members : members.filter((m) => m.id === currentUser.id);
  }, [isAdmin, members, currentUser.id]);

  // Memoize all individual attendance stats map to prevent redundant heavy recalculations on search input
  const memberStatsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateMemberAttendance>>();
    for (const m of visibleMembers) {
      map.set(m.id, calculateMemberAttendance(m, sessions, attendances));
    }
    return map;
  }, [visibleMembers, sessions, attendances]);

  const filteredMembers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return visibleMembers;
    return visibleMembers.filter((m) =>
      m.fullName.toLowerCase().includes(term) || m.cim.includes(term)
    );
  }, [visibleMembers, searchTerm]);

  const handleSendNotification = (alert: InactivityAlert) => {
    const member = members.find((m) => m.id === alert.memberId);
    if (!member) return;

    const messageText = `Prezado e Querido Irmão *${member.fullName}*, Fraternas Saudações! 🤝🏛️\n\nSentimos muito a sua falta em nossos últimos trabalhos na Oficina (registramos *${alert.consecutiveAbsences} ausências consecutivas*).\n\nGostaríamos de saber com muito carinho e zelo como você e sua família estão, e se está acontecendo alguma situação ou dificuldade em que a Loja e seus Irmãos possam estender as mãos e ajudar de alguma forma.\n\nSua presença, sua luz e sua amizade são fundamentais para o fortalecimento de nossas colunas. Conte sempre conosco!\n\nUm fraterno e caloroso abraço de seus Irmãos de Loja.`;

    setNotifiedMembers((prev) => ({ ...prev, [member.id]: true }));

    const url = generateWhatsAppUrl(member.phone, messageText);
    window.open(url, '_blank');
  };

  const exportToCSV = () => {
    const headers = ['Nome Completo', 'CIM', 'Grau', 'Status', 'Sessoes Elegiveis', 'Presencas', 'Faltas', 'Assiduidade %'];
    const rows = visibleMembers.map((m) => {
      const stats = memberStatsMap.get(m.id) || calculateMemberAttendance(m, sessions, attendances);
      return [
        `"${m.fullName}"`,
        m.cim,
        m.degree,
        m.status,
        stats.totalEligible,
        stats.totalAttended,
        stats.totalMissed,
        `${stats.percentage}%`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_frequencia_maconica_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Detailed breakdown for the selected member modal
  const selectedMemberBreakdown = useMemo(() => {
    return selectedMemberForDetail
      ? getMemberAttendanceBreakdown(selectedMemberForDetail, sessions, attendances)
      : null;
  }, [selectedMemberForDetail, sessions, attendances]);

  const filteredBreakdownItems = useMemo(() => {
    if (!selectedMemberBreakdown) return [];
    return selectedMemberBreakdown.items.filter((item) => {
      if (detailFilter === 'missed') return item.status === 'Falta';
      if (detailFilter === 'attended') return item.status === 'Presente';
      return true;
    });
  }, [selectedMemberBreakdown, detailFilter]);

  const handleCopyMemberSummary = () => {
    if (!selectedMemberForDetail || !selectedMemberBreakdown) return;
    const missedList = selectedMemberBreakdown.items
      .filter((i) => i.status === 'Falta')
      .map((i) => `• ${i.session.date} - ${i.session.title} (${i.session.degree})`)
      .join('\n');

    const summaryText = `RELATÓRIO DE FREQUÊNCIA E AUDITORIA DE FALTAS\n` +
      `Obreiro: ${selectedMemberForDetail.fullName} (CIM: ${selectedMemberForDetail.cim})\n` +
      `Grau: ${selectedMemberForDetail.degree} | Status: ${selectedMemberForDetail.status}\n` +
      `----------------------------------------\n` +
      `Sessões Elegíveis: ${selectedMemberBreakdown.totalEligible}\n` +
      `Presenças Confirmadas: ${selectedMemberBreakdown.totalAttended}\n` +
      `Total de Faltas: ${selectedMemberBreakdown.totalMissed}\n` +
      `Percentual de Assiduidade: ${selectedMemberBreakdown.percentage}%\n` +
      `----------------------------------------\n` +
      `SESSÕES COM FALTA REGISTRADA:\n${missedList || 'Nenhuma falta registrada.'}`;

    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="font-serif-masonic text-xl font-bold text-amber-200">
            {isAdmin ? 'Inteligência Regimental e Estatísticas de Frequência' : 'Minha Frequência e Assiduidade Maçônica'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin
              ? 'Cálculo automático de assiduidade e detalhamento individual de faltas e presenças.'
              : 'Detalhamento do seu histórico de frequência e assiduidade nas sessões.'}
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-lg flex items-center space-x-2 transition shadow-md shadow-emerald-600/20"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Exportar Relatório (CSV)</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('assiduidade')}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition ${
            activeTab === 'assiduidade'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{isAdmin ? 'Assiduidade Geral do Quadro' : 'Sua Assiduidade Individual'}</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('alertas')}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition relative ${
              activeTab === 'alertas'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Alertas de Inassiduidade (3 Faltas)</span>
            {inactivityAlerts.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {inactivityAlerts.length}
              </span>
            )}
          </button>
        )}
      </div>

      {activeTab === 'assiduidade' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-serif-masonic text-base font-bold text-amber-200">
                {isAdmin ? 'Assiduidade Individual dos Obreiros' : 'Seu Relatório de Frequência'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Clique no botão <strong className="text-amber-300">"Ver Faltas e Sessões"</strong> de qualquer obreiro para auditar exatamente quais sessões foram frequentadas ou faltadas.
              </p>
            </div>

            {isAdmin && (
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar obreiro por nome ou CIM..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-3 px-2">Obreiro</th>
                  <th className="py-3 px-2">CIM</th>
                  <th className="py-3 px-2">Grau</th>
                  <th className="py-3 px-2">Elegíveis</th>
                  <th className="py-3 px-2 text-emerald-400">Presenças</th>
                  <th className="py-3 px-2 text-rose-400">Faltas</th>
                  <th className="py-3 px-2">Frequência %</th>
                  <th className="py-3 px-2 text-right">Auditoria de Faltas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMembers.map((m) => {
                  const stats = memberStatsMap.get(m.id) || calculateMemberAttendance(m, sessions, attendances);

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-950/60 transition group cursor-pointer"
                      onClick={() => {
                        setSelectedMemberForDetail(m);
                        setDetailFilter(stats.totalMissed > 0 ? 'missed' : 'all');
                      }}
                    >
                      <td className="py-3 px-2 flex items-center space-x-2">
                        <img
                          src={getMemberPhotoUrl(m.photoUrl)}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
                        />
                        <span className="font-semibold text-slate-200 group-hover:text-amber-300 transition-colors">
                          {m.fullName}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-mono text-slate-300">{m.cim}</td>
                      <td className="py-3 px-2 text-amber-400">{m.degree}</td>
                      <td className="py-3 px-2 font-mono">{stats.totalEligible}</td>
                      <td className="py-3 px-2 text-emerald-400 font-mono font-bold">{stats.totalAttended}</td>
                      <td className="py-3 px-2">
                        {stats.totalMissed > 0 ? (
                          <span className="bg-rose-950/80 text-rose-300 border border-rose-800/80 px-2 py-0.5 rounded font-mono font-bold text-[11px] inline-flex items-center space-x-1">
                            <span>{stats.totalMissed} falta{stats.totalMissed > 1 ? 's' : ''}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">0 faltas</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`font-mono font-bold ${
                            stats.percentage >= 75
                              ? 'text-emerald-400'
                              : stats.percentage >= 60
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {stats.percentage}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMemberForDetail(m);
                            setDetailFilter(stats.totalMissed > 0 ? 'missed' : 'all');
                          }}
                          className="bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition inline-flex items-center space-x-1.5 shadow-sm active:scale-95"
                          title="Auditar quais sessões o obreiro esteve presente ou faltou"
                        >
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>Ver Faltas e Sessões</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'alertas' && isAdmin && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="font-serif-masonic text-base font-bold text-amber-200 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>Alertas Regimentais de Inassiduidade (3 Faltas Consecutivas)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Irmãos com 3 faltas consecutivas recebem aviso fraterno da administração para acompanhamento.
            </p>
          </div>

          {inactivityAlerts.length === 0 ? (
            <div className="bg-slate-950 p-8 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-200">Nenhum Obreiro em Alerta Crítico</p>
              <p className="mt-1">Todos os Irmãos possuem frequência regular nas reuniões de seu grau.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inactivityAlerts.map((alert) => {
                const member = members.find((m) => m.id === alert.memberId);
                const isNotified = notifiedMembers[alert.memberId];
                const missedSessions = sessions.filter((s) => alert.missedSessionIds.includes(s.id));

                return (
                  <div
                    key={alert.memberId}
                    className="bg-rose-950/30 border border-rose-800/80 rounded-xl p-5 flex flex-col space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-4">
                        {member && (
                          <img
                            src={getMemberPhotoUrl(member.photoUrl)}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-rose-500"
                          />
                        )}
                        <div>
                          <h4 className="text-sm font-bold text-slate-100">{member?.fullName}</h4>
                          <p className="text-xs text-rose-300 font-mono mt-0.5">
                            CIM: {member?.cim} • Grau: {member?.degree} • Status: {member?.status}
                          </p>
                          <p className="text-xs text-slate-300 mt-1">
                            Atingiu <strong className="text-rose-400 font-bold">{alert.consecutiveAbsences} faltas consecutivas</strong>.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-auto">
                        {member && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMemberForDetail(member);
                              setDetailFilter('missed');
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 px-3 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Auditar Faltas</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleSendNotification(alert)}
                          className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition ${
                            isNotified
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900/60'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-900/30 active:scale-95'
                          }`}
                          title="Enviar mensagem carinhosa e acolhedora no WhatsApp do Irmão"
                        >
                          {isNotified ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-400" />
                              <span>WhatsApp Enviado</span>
                            </>
                          ) : (
                            <>
                              <MessageCircle className="w-4 h-4" />
                              <span>Notificar Irmão</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Exibição das Sessões Faltadas no Alerta */}
                    {missedSessions.length > 0 && (
                      <div className="bg-slate-950/70 border border-rose-900/40 rounded-lg p-3 space-y-1.5">
                        <p className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider">
                          Sessões consecutivas que geraram o alerta:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                          {missedSessions.map((ms) => (
                            <div key={ms.id} className="bg-rose-950/40 border border-rose-900/50 rounded px-2.5 py-1.5 text-xs text-slate-200">
                              <span className="font-bold text-rose-300 block">{ms.date} • {ms.time}</span>
                              <span className="text-[11px] text-slate-300 truncate block">{ms.title}</span>
                              <span className="text-[10px] text-amber-400/80 font-mono">Grau {ms.degreeLevel} - {ms.degree}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ESPELHO INDIVIDUAL DE FREQUÊNCIA E AUDITORIA DE FALTAS             */}
      {/* ========================================================================= */}
      {selectedMemberForDetail && selectedMemberBreakdown && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto overscroll-contain p-2 sm:p-5">
          <div className="min-h-full flex flex-col items-center justify-start sm:justify-center py-2 sm:py-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
              {/* Header do Modal */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3 sm:space-x-3.5 min-w-0">
                  <img
                    src={getMemberPhotoUrl(selectedMemberForDetail.photoUrl)}
                    alt=""
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-amber-500/50 shadow-md shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <h3 className="font-serif-masonic text-base sm:text-xl font-bold text-slate-100 truncate">
                        {selectedMemberForDetail.fullName}
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shrink-0">
                        CIM: {selectedMemberForDetail.cim}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      Grau: <strong className="text-amber-300">{selectedMemberForDetail.degree}</strong> • Status: <span className="text-slate-200">{selectedMemberForDetail.status}</span>
                      {selectedMemberForDetail.currentOfficerRole && (
                        <span className="text-amber-400"> • Cargo: {selectedMemberForDetail.currentOfficerRole}</span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedMemberForDetail(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Painel de Métricas e Resumo */}
              <div className="p-3.5 sm:p-5 space-y-4 sm:space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                  <div className="bg-slate-950 p-2.5 sm:p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Elegíveis</span>
                    <span className="font-mono text-base sm:text-lg font-bold text-slate-200">
                      {selectedMemberBreakdown.totalEligible}
                    </span>
                  </div>

                  <div className="bg-emerald-950/30 p-2.5 sm:p-3 rounded-xl border border-emerald-800/50 text-center">
                    <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Presenças</span>
                    <span className="font-mono text-base sm:text-lg font-bold text-emerald-300">
                      {selectedMemberBreakdown.totalAttended}
                    </span>
                  </div>

                  <div className="bg-rose-950/40 p-2.5 sm:p-3 rounded-xl border border-rose-800/80 text-center">
                    <span className="text-[10px] text-rose-400 uppercase font-bold block">Faltas</span>
                    <span className="font-mono text-base sm:text-lg font-bold text-rose-300">
                      {selectedMemberBreakdown.totalMissed}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2.5 sm:p-3 rounded-xl border border-slate-800 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Assiduidade</span>
                    <span
                      className={`font-mono text-base sm:text-lg font-bold ${
                        selectedMemberBreakdown.percentage >= 75
                          ? 'text-emerald-400'
                          : selectedMemberBreakdown.percentage >= 60
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {selectedMemberBreakdown.percentage}%
                    </span>
                  </div>
                </div>

                {/* Filtros de Visualização por Abas */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setDetailFilter('all')}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0 ${
                        detailFilter === 'all'
                          ? 'bg-slate-800 text-amber-300 font-bold border border-slate-700'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Todas ({selectedMemberBreakdown.items.length})
                    </button>

                    <button
                      type="button"
                      onClick={() => setDetailFilter('missed')}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition flex items-center space-x-1 whitespace-nowrap shrink-0 ${
                        detailFilter === 'missed'
                          ? 'bg-rose-950 text-rose-200 font-bold border border-rose-700'
                          : 'text-rose-400 hover:bg-rose-950/40'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>Faltas ({selectedMemberBreakdown.totalMissed})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDetailFilter('attended')}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition flex items-center space-x-1 whitespace-nowrap shrink-0 ${
                        detailFilter === 'attended'
                          ? 'bg-emerald-950 text-emerald-200 font-bold border border-emerald-700'
                          : 'text-emerald-400 hover:bg-emerald-950/40'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Presenças ({selectedMemberBreakdown.totalAttended})</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyMemberSummary}
                    className="w-full sm:w-auto text-xs bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition active:scale-95 shrink-0"
                    title="Copiar relatório e lista de faltas para a área de transferência"
                  >
                    {copiedSummary ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Copiado com Sucesso!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                        <span>Copiar Espelho / Faltas</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Lista Detalhada de Sessões */}
                <div className="space-y-2.5 max-h-80 sm:max-h-96 overflow-y-auto pr-1">
                {filteredBreakdownItems.length === 0 ? (
                  <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-slate-200">Nenhum registro encontrado para este filtro.</p>
                    <p className="mt-0.5 text-slate-500">
                      {detailFilter === 'missed'
                        ? 'O obreiro não possui faltas registradas!'
                        : 'Nenhuma sessão corresponde ao critério selecionado.'}
                    </p>
                  </div>
                ) : (
                  filteredBreakdownItems.map((item) => {
                    const isMissed = item.status === 'Falta';
                    const isAttended = item.status === 'Presente';

                    return (
                      <div
                        key={item.session.id}
                        className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                          isMissed
                            ? 'bg-rose-950/20 border-rose-900/60 hover:bg-rose-950/30'
                            : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-950'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-slate-100">
                              {item.session.title}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              Grau {item.session.degreeLevel} • {item.session.degree}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-amber-300/80 border border-amber-900/40">
                              {item.session.type} {item.session.subtype ? `• ${item.session.subtype}` : ''}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center space-x-1 text-slate-300 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-amber-400" />
                              <span>{item.session.date}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>{item.session.time || '20:00'}</span>
                            </span>
                            <span className="flex items-center space-x-1 text-slate-400">
                              <MapPin className="w-3.5 h-3.5 text-slate-500" />
                              <span>{item.session.location || 'Templo Principal'}</span>
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0 self-end sm:self-center">
                          {isAttended && (
                            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/80 text-xs font-bold shadow-sm">
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                              <span>PRESENÇA REGISTRADA</span>
                            </div>
                          )}

                          {isMissed && (
                            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-950 text-rose-200 border border-rose-700 font-bold text-xs shadow-sm">
                              <XCircle className="w-4 h-4 text-rose-400" />
                              <span>FALTA REGISTRADA</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Auditoria regimental oficial • A∴R∴L∴S Fraternidade de Franca
              </span>

              <button
                type="button"
                onClick={() => setSelectedMemberForDetail(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};


