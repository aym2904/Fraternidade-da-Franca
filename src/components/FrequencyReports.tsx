import React, { useState } from 'react';
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
  Check
} from 'lucide-react';
import { Member, Session, AttendanceRecord, Justification, InactivityAlert } from '../types/masonic';
import { calculateMemberAttendance, detectInactivityAlerts } from '../utils/masonicUtils';
import { isLodgeAdmin } from '../utils/authUtils';

interface FrequencyReportsProps {
  members: Member[];
  sessions: Session[];
  attendances: AttendanceRecord[];
  justifications: Justification[];
  inactivityAlerts: InactivityAlert[];
  currentUser: Member;
}

export const FrequencyReports: React.FC<FrequencyReportsProps> = ({
  members = [],
  sessions = [],
  attendances = [],
  justifications = [],
  inactivityAlerts = [],
  currentUser,
}) => {
  const isAdmin = isLodgeAdmin(currentUser);
  const [activeTab, setActiveTab] = useState<'assiduidade' | 'alertas'>('assiduidade');
  const [searchTerm, setSearchTerm] = useState('');
  const [notifiedMembers, setNotifiedMembers] = useState<Record<string, boolean>>({});

  // Non-admin users see ONLY their own attendance data
  const visibleMembers = isAdmin ? members : members.filter((m) => m.id === currentUser.id);

  const filteredMembers = visibleMembers.filter((m) =>
    m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || m.cim.includes(searchTerm)
  );

  const handleSendNotification = (memberId: string) => {
    setNotifiedMembers((prev) => ({ ...prev, [memberId]: true }));
  };

  const exportToCSV = () => {
    const headers = ['Nome Completo', 'CIM', 'Grau', 'Status', 'Sessoes Elegiveis', 'Presencas', 'Justificadas', 'Assiduidade %'];
    const rows = visibleMembers.map((m) => {
      const stats = calculateMemberAttendance(m, sessions, attendances, justifications);
      return [
        `"${m.fullName}"`,
        m.cim,
        m.degree,
        m.status,
        stats.totalEligible,
        stats.totalAttended,
        stats.totalJustified,
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
              ? 'Cálculo automático de assiduidade para elegibilidade de voto, cargos e alertas de 3 faltas consecutivas.'
              : 'Detalhamento do seu histórico de assiduidade para verificação de elegibilidade a votos e funções.'}
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
            <h3 className="font-serif-masonic text-base font-bold text-amber-200">
              {isAdmin ? 'Assiduidade Individual dos Obreiros' : 'Seu Relatório de Frequência'}
            </h3>

            {isAdmin && (
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar obreiro..."
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
                  <th className="py-3 px-2">Presentes</th>
                  <th className="py-3 px-2">Justificadas</th>
                  <th className="py-3 px-2">Frequência %</th>
                  <th className="py-3 px-2 text-right">Direito a Voto / Cargo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMembers.map((m) => {
                  const stats = calculateMemberAttendance(m, sessions, attendances, justifications);
                  const isElegibleForVote = stats.percentage >= 75;

                  return (
                    <tr key={m.id} className="hover:bg-slate-950/60 transition">
                      <td className="py-3 px-2 flex items-center space-x-2">
                        <img src={m.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700" />
                        <span className="font-semibold text-slate-200">{m.fullName}</span>
                      </td>
                      <td className="py-3 px-2 font-mono text-slate-300">{m.cim}</td>
                      <td className="py-3 px-2 text-amber-400">{m.degree}</td>
                      <td className="py-3 px-2 font-mono">{stats.totalEligible}</td>
                      <td className="py-3 px-2 text-emerald-400 font-mono font-bold">{stats.totalAttended}</td>
                      <td className="py-3 px-2 text-amber-400 font-mono">{stats.totalJustified}</td>
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
                        {isElegibleForVote ? (
                          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                            APTO A VOTO
                          </span>
                        ) : (
                          <span className="bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                            ASSIDUIDADE INSUFICIENTE
                          </span>
                        )}
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
              Conforme o Regulamento Geral da Ordem, Irmãos com 3 faltas consecutivas não justificadas recebem aviso da administração para regularização.
            </p>
          </div>

          {inactivityAlerts.length === 0 ? (
            <div className="bg-slate-950 p-8 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-200">Nenhum Obreiro em Alerta Crítico</p>
              <p className="mt-1">Todos os Irmãos possuem frequência regular ou faltas justificadas.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inactivityAlerts.map((alert) => {
                const member = members.find((m) => m.id === alert.memberId);
                const isNotified = notifiedMembers[alert.memberId];

                return (
                  <div
                    key={alert.memberId}
                    className="bg-rose-950/30 border border-rose-800/80 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center space-x-4">
                      {member && (
                        <img
                          src={member.photoUrl}
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
                          Atingiu <strong className="text-rose-400">{alert.consecutiveAbsences} faltas consecutivas</strong> sem justificativa aprovada.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendNotification(alert.memberId)}
                      disabled={isNotified}
                      className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition ${
                        isNotified
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 cursor-default'
                          : 'bg-rose-800 hover:bg-rose-700 text-rose-100 shadow-md shadow-rose-900/30'
                      }`}
                    >
                      {isNotified ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span>Notificação Enviada à Secretaria</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Notificar Irmão e Secretaria</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
