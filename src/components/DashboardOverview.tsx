import React, { useState } from 'react';
import {
  Users,
  QrCode,
  AlertTriangle,
  FileCheck2,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  ArrowRight,
  UserPlus,
  Lock,
  Award,
  FileText,
  User,
  XCircle,
  PlusCircle,
  Camera
} from 'lucide-react';
import { Member, Session, AttendanceRecord, VisitorRecord, Justification, InactivityAlert } from '../types/masonic';
import { calculateSessionStats, calculateMemberAttendance } from '../utils/masonicUtils';
import { isLodgeAdmin, isSystemAdmin, getRoleBadgeLabel, canAccessSessionDegree } from '../utils/authUtils';
import { QrCodeScannerModal } from './QrCodeScannerModal';

interface DashboardOverviewProps {
  activeSession: Session | undefined;
  sessions: Session[];
  members: Member[];
  attendances: AttendanceRecord[];
  visitors: VisitorRecord[];
  justifications: Justification[];
  inactivityAlerts: InactivityAlert[];
  currentUser: Member;
  setActiveTab: (tab: string) => void;
  onQuickCheckIn: () => void;
  isCurrentUserCheckedIn: boolean;
  forcePersonalView?: boolean;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  activeSession,
  sessions = [],
  members = [],
  attendances = [],
  visitors = [],
  justifications = [],
  inactivityAlerts = [],
  currentUser,
  setActiveTab,
  onQuickCheckIn,
  isCurrentUserCheckedIn,
  forcePersonalView = false,
}) => {
  const isAdmin = isLodgeAdmin(currentUser);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Calculate data STRICTLY for the active session (if any)
  const activeSessionAttendances = activeSession
    ? attendances.filter((att) => att.sessionId === activeSession.id)
    : [];

  const activeSessionVisitors = activeSession
    ? visitors.filter((v) => v.sessionId === activeSession.id)
    : [];

  const activeSessionJustifications = activeSession
    ? justifications.filter((j) => j.sessionId === activeSession.id)
    : [];

  const activeSessionPendingJustifications = activeSessionJustifications.filter(
    (j) => j.status === 'Pendente'
  );

  // Calculate full lodge stats strictly for active session
  const stats = activeSession
    ? calculateSessionStats(activeSession, members, attendances, visitors, justifications)
    : null;

  // Calculate Personal Attendance Stats for user (applicable to all brethren including officers)
  const personalAttendance = calculateMemberAttendance(
    currentUser,
    sessions,
    attendances,
    justifications
  );

  const personalJustifications = justifications.filter((j) => j.memberId === currentUser.id);

  // Sessions accessible to current user
  const eligibleSessions = sessions.filter((s) => canAccessSessionDegree(currentUser, s.degreeLevel));

  // Check if active session is accessible to user's degree
  const isActiveSessionAccessible = activeSession
    ? canAccessSessionDegree(currentUser, activeSession.degreeLevel)
    : false;

  // Decide if we should render Personal View (forced or if user is non-admin)
  const isPersonalView = forcePersonalView || !isAdmin;

  // Render MEMBER PERSONAL DASHBOARD ("Meu Painel do Obreiro")
  if (isPersonalView) {
    return (
      <div className="space-y-6">
        {/* Member Profile Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center space-x-4">
              <img
                src={currentUser.photoUrl}
                alt={currentUser.fullName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-2 ring-amber-500/60 shadow-lg"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {isSystemAdmin(currentUser) ? (
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">
                      Usuário Reservado ao Desenvolvedor / Manutenção
                    </span>
                  ) : (
                    <>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">
                        CIM: {currentUser.cim}
                      </span>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                        Grau: {currentUser.degree} ({currentUser.degreeLevel}º Grau)
                      </span>
                      {currentUser.currentOfficerRole && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                          Cargo: {currentUser.currentOfficerRole}
                        </span>
                      )}
                    </>
                  )}
                </div>

                <h2 className="font-serif-masonic text-xl sm:text-2xl font-bold text-slate-100">
                  {currentUser.fullName}
                </h2>

                <p className="text-xs text-slate-400 mt-1">
                  Status Regimental: <strong className="text-emerald-400">{currentUser.status}</strong> •
                  Membro desde: {new Date(currentUser.joinedDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {/* Attendance Percentage Meter */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center space-x-5 shrink-0">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-800"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={
                      personalAttendance.percentage >= 75
                        ? 'text-emerald-400'
                        : personalAttendance.percentage >= 50
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }
                    strokeDasharray={`${personalAttendance.percentage}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-base font-bold text-slate-100">{personalAttendance.percentage}%</span>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <p className="font-semibold text-amber-200">Sua Frequência Regimental</p>
                <p className="text-[11px] text-slate-400">
                  {personalAttendance.totalAttended} Presenças / {personalAttendance.totalEligible} Sessões Elegíveis
                </p>
                <div className="pt-1">
                  {personalAttendance.percentage >= 75 ? (
                    <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Apto a Voto e Elevação/Aumento</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-[10px] text-rose-400 bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Abaixo dos 75% Exigidos</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Session Status & Access Gate */}
        {activeSession ? (
          isActiveSessionAccessible ? (
            <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Sessão em Andamento</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-amber-950 text-amber-300 border border-amber-800">
                      Grau de {activeSession.degree} (Acesso Permitido)
                    </span>
                  </div>

                  <h3 className="font-serif-masonic text-lg font-bold text-slate-100">
                    {activeSession.title}
                  </h3>

                  <p className="text-xs text-slate-400 mt-1 flex items-center space-x-4">
                    <span>Data: {activeSession.date.split('-').reverse().join('/')} às {activeSession.time}h</span>
                    <span>• Local: {activeSession.location}</span>
                  </p>
                </div>

                <div>
                  {isCurrentUserCheckedIn ? (
                    <div className="bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 px-4 py-2 rounded-xl text-xs flex items-center space-x-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Sua Presença Está Registrada!</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsScannerOpen(true)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-amber-500/20"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Escanear QR Code para Registrar Presença</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-rose-950/30 border border-rose-800/60 rounded-2xl p-6">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-rose-900/50 rounded-xl text-rose-400 border border-rose-700 shrink-0">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif-masonic text-base font-bold text-rose-200">
                    Sessão em Andamento — Acesso Restrito ao Grau de {activeSession.degree}
                  </h3>
                  <p className="text-xs text-rose-300/80 mt-1">
                    Trabalhos de Grau Superior ({activeSession.degree}). Como {currentUser.degree} (Grau {currentUser.degreeLevel}), você não tem permissão para participar ou assinar a presença nesta reunião específica.
                  </p>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-slate-500" />
              <div>
                <p className="text-xs font-semibold text-slate-200">Nenhuma Sessão Ativa em Loja</p>
                <p className="text-[11px] text-slate-400">Consulte abaixo suas próximas reuniões permitidas do {currentUser.degree}.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('sessoes')}
              className="text-xs text-amber-400 hover:underline font-medium"
            >
              Ver Minhas Sessões →
            </button>
          </div>
        )}

        {/* Personal Grid: Eligible Sessions & My Justifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Accessible Sessions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-masonic text-base font-bold text-amber-200 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Sessões do Meu Grau ({currentUser.degree})</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                {eligibleSessions.length} Reuniões Registradas
              </span>
            </div>

            <div className="space-y-2.5">
              {eligibleSessions.slice(-4).reverse().map((s) => {
                const attended = attendances.some((a) => a.sessionId === s.id && a.memberId === currentUser.id);
                const justified = justifications.some((j) => j.sessionId === s.id && j.memberId === currentUser.id && j.status === 'Aprovado');

                return (
                  <div
                    key={s.id}
                    className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-200">{s.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {s.date.split('-').reverse().join('/')} • Grau: {s.degree} ({s.type})
                      </p>
                    </div>

                    <div>
                      {attended ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>PRESENTE</span>
                        </span>
                      ) : justified ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                          <Clock className="w-3 h-3" />
                          <span>JUSTIFICADO</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-1 rounded text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-900">
                          <XCircle className="w-3 h-3" />
                          <span>AUSENTE</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* My Justifications Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-masonic text-base font-bold text-amber-200 flex items-center space-x-2">
                <FileCheck2 className="w-4 h-4 text-amber-400" />
                <span>Minhas Justificativas de Ausência</span>
              </h3>
              <button
                onClick={() => setActiveTab('justificativas')}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs px-2.5 py-1 rounded-lg flex items-center space-x-1 transition font-medium"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Submeter Atestado</span>
              </button>
            </div>

            {personalJustifications.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <FileCheck2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p>Nenhuma justificativa enviada por você até o momento.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {personalJustifications.map((j) => (
                  <div
                    key={j.id}
                    className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">Data: {j.date.split('-').reverse().join('/')}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          j.status === 'Aprovado'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : j.status === 'Rejeitado'
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        {j.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{j.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Camera QR Code Scanner Modal */}
        <QrCodeScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          activeSession={activeSession}
          currentUser={currentUser}
          onSuccessCheckIn={(memberId) => {
            onQuickCheckIn();
          }}
        />
      </div>
    );
  }

  // Render ADMIN / SECRETARIO FULL DASHBOARD
  return (
    <div className="space-y-6">
      {/* Top Banner - Active Session Highlight */}
      {activeSession ? (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>SESSÃO EM ANDAMENTO</span>
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono bg-amber-950/80 text-amber-300 border border-amber-700/50">
                  Grau: {activeSession.degree} ({activeSession.type})
                </span>
              </div>

              <h2 className="font-serif-masonic text-xl sm:text-2xl font-bold text-slate-100">
                {activeSession.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Data: {activeSession.date.split('-').reverse().join('/')} às {activeSession.time}h</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>{activeSession.location}</span>
                </span>
              </p>
            </div>

            {/* Attendance Stat Meter */}
            {stats && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center space-x-6 min-w-[300px]">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3.8"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-amber-400 transition-all duration-1000 ease-out"
                      strokeDasharray={`${stats.percentagePresent}, 100`}
                      strokeWidth="3.8"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-amber-300">{stats.percentagePresent}%</span>
                    <span className="text-[9px] text-slate-400 font-mono">PRESENÇA</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between space-x-4">
                    <span className="text-slate-400">Presentes do Quadro:</span>
                    <span className="font-bold text-emerald-400">{stats.totalPresentMembers} de {stats.totalEligible}</span>
                  </div>
                  <div className="flex items-center justify-between space-x-4">
                    <span className="text-slate-400">Visitantes:</span>
                    <span className="font-bold text-blue-400">{stats.totalVisitors}</span>
                  </div>
                  <div className="flex items-center justify-between space-x-4">
                    <span className="text-slate-400">Faltas Justificadas:</span>
                    <span className="font-bold text-amber-400">{stats.totalJustified}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              {isCurrentUserCheckedIn ? (
                <div className="inline-flex items-center space-x-1.5 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Sua presença foi confirmada nesta sessão</span>
                </div>
              ) : (
                <div className="inline-flex items-center space-x-1.5 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Sessão em andamento no Templo</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveTab('sessoes')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1 transition"
            >
              <span>Gerenciar Cargos e Detalhes da Sessão</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-slate-200">Nenhuma Sessão Ativa no Momento</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Inicie ou agende uma sessão no painel do Secretário / Chanceler para habilitar o check-in automatizado por QR Code.
          </p>
          <button
            onClick={() => setActiveTab('sessoes')}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold px-4 py-2 rounded-lg transition"
          >
            Ver Todas / Iniciar Nova Sessão
          </button>
        </div>
      )}

      {/* Quick Metrics Grid for Active Session */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Present Members in Active Session Card */}
        <div
          onClick={() => {
            if (activeSession) setActiveTab('chamada_qr');
            else setActiveTab('sessoes');
          }}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Presentes do Quadro</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-100">
              {activeSession ? (stats?.totalPresentMembers || 0) : 0}
            </span>
            <span className="text-xs text-slate-400 ml-2">
              {activeSession ? `de ${stats?.totalEligible || 0} no Grau` : 'Sem Sessão Ativa'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span>{activeSession ? `${stats?.percentagePresent || 0}% de Quórum` : 'Nenhum registro ativo'}</span>
            <span className="text-emerald-400 font-medium">
              {activeSession ? `${activeSession.degree}` : '—'}
            </span>
          </div>
        </div>

        {/* Absences for Active Session Card */}
        <div
          onClick={() => {
            if (activeSession) setActiveTab('chamada_qr');
            else setActiveTab('sessoes');
          }}
          className="bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-xl p-4 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Ausentes na Sessão</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-100">
              {activeSession ? (stats?.totalAbsent || 0) : 0}
            </span>
            <span className="text-xs text-slate-400 ml-2">
              {activeSession ? 'Obreiro(s) não registrado(s)' : 'Sem Sessão Ativa'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span>
              {activeSession
                ? `Faltas s/ justificativa: ${Math.max(0, (stats?.totalAbsent || 0) - (stats?.totalJustified || 0))}`
                : 'Sem sessão ativa'}
            </span>
          </div>
        </div>

        {/* Pending Justifications for Active Session Card */}
        <div
          onClick={() => setActiveTab('justificativas')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Justificativas na Sessão</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-400">
              {activeSession ? activeSessionJustifications.length : 0}
            </span>
            <span className="text-xs text-slate-400 ml-2">
              {activeSession
                ? `${activeSessionPendingJustifications.length} Pendente(s)`
                : 'Sem Sessão Ativa'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-amber-500/80 flex items-center space-x-1 pt-2 border-t border-slate-800/80">
            <Clock className="w-3 h-3" />
            <span>{activeSession ? 'Abonos desta sessão' : 'Aguardando sessão'}</span>
          </div>
        </div>

        {/* Visitors Logged in Active Session Card */}
        <div
          onClick={() => {
            if (activeSession) setActiveTab('visitantes');
            else setActiveTab('sessoes');
          }}
          className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-xl p-4 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Visitantes na Sessão</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-100">
              {activeSession ? activeSessionVisitors.length : 0}
            </span>
            <span className="text-xs text-slate-400 ml-2">
              {activeSession ? 'Registrados nesta Sessão' : 'Sem Sessão Ativa'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/80 truncate">
            <span>
              {activeSession && activeSessionVisitors.length > 0
                ? activeSessionVisitors.map((v) => v.homeLodge || v.potencia).slice(0, 2).join(' • ')
                : 'GOSP • GOB • GLESP • GOP'}
            </span>
          </div>
        </div>
      </div>

      {/* Active Session Activity & Administration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Attendance Log Snippet (STRICTLY ACTIVE SESSION) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h3 className="font-serif-masonic text-base font-semibold text-amber-200">
                Registros de Presença da Sessão Ativa
              </h3>
              {activeSession && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {activeSessionAttendances.length} Confirmados
                </span>
              )}
            </div>
            {activeSession && (
              <button
                onClick={() => setActiveTab('chamada_qr')}
                className="text-xs text-amber-400 hover:underline flex items-center space-x-1"
              >
                <span>Projetor / Chamada</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {!activeSession ? (
            <div className="py-10 text-center space-y-2 border border-dashed border-slate-800/80 rounded-xl bg-slate-950/30">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-medium text-slate-400">Nenhuma sessão ativa no momento.</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Inicie ou agende uma reunião para acompanhar os registros e o quórum em tempo real.
              </p>
              <button
                onClick={() => setActiveTab('sessoes')}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold mt-1 inline-block"
              >
                Ir para Sessões da Loja →
              </button>
            </div>
          ) : activeSessionAttendances.length === 0 ? (
            <div className="py-10 text-center space-y-2 border border-dashed border-slate-800/80 rounded-xl bg-slate-950/30">
              <QrCode className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-medium text-slate-400">Nenhum registro de presença efetuado nesta sessão até o momento.</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Exiba o QR Code no projetor do Templo ou realize a chamada manual dos obreiros presentes.
              </p>
              <button
                onClick={() => setActiveTab('chamada_qr')}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold px-3 py-1.5 rounded-lg transition mt-2 inline-flex items-center space-x-1"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Abrir Projetor QR Code</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {activeSessionAttendances
                .slice()
                .reverse()
                .map((att) => {
                  const member = members.find((m) => m.id === att.memberId);
                  return (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        {member && (
                          <img
                            src={member.photoUrl}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
                          />
                        )}
                        <div>
                          <p className="font-medium text-slate-200">{member?.fullName || 'Obreiro'}</p>
                          <p className="text-[10px] text-slate-400">
                            CIM: {member?.cim} • Grau: {member?.degree}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono ${
                            att.method === 'QR_CODE'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-blue-950 text-blue-400 border border-blue-800'
                          }`}
                        >
                          {att.method === 'QR_CODE' ? 'QR CODE CELL' : 'CHAMADA MANUAL'}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(att.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Administration Officers of Active Session */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif-masonic text-base font-semibold text-amber-200">
              Administração da Sessão
            </h3>
            {activeSession && (
              <span className="text-[10px] font-mono text-slate-400">
                {activeSession.type}
              </span>
            )}
          </div>

          {!activeSession ? (
            <div className="py-10 text-center space-y-2 border border-dashed border-slate-800/80 rounded-xl bg-slate-950/30">
              <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">Nenhuma sessão ativa.</p>
              <p className="text-[11px] text-slate-500">
                Os cargos de administração são designados na abertura de cada sessão.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                'Venerável Mestre',
                '1º Vigilante',
                '2º Vigilante',
                'Orador',
                'Secretário',
                'Chanceler',
              ].map((role) => {
                const officerId = activeSession.officers[role as keyof typeof activeSession.officers];
                const officerMember = officerId
                  ? members.find((m) => m.id === officerId)
                  : members.find((m) => m.currentOfficerRole === role);

                return (
                  <div
                    key={role}
                    className="flex items-center justify-between text-xs p-2 rounded bg-slate-950/40 border border-slate-800"
                  >
                    <span className="text-amber-400/90 font-medium">{role}</span>
                    <span className="text-slate-200 truncate max-w-[150px] font-mono">
                      {officerMember
                        ? officerMember.fullName.split(' ')[0] +
                          ' ' +
                          officerMember.fullName.split(' ').slice(-1)
                        : 'Vago / Não escalado'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Camera QR Code Scanner Modal */}
      <QrCodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        activeSession={activeSession}
        currentUser={currentUser}
        onSuccessCheckIn={(memberId) => {
          onQuickCheckIn();
        }}
      />
    </div>
  );
};
