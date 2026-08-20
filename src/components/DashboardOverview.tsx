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
}) => {
  const isAdmin = isLodgeAdmin(currentUser);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Calculate full lodge stats for active session (if admin)
  const stats = activeSession
    ? calculateSessionStats(activeSession, members, attendances, visitors, justifications)
    : null;

  const pendingJustifications = justifications.filter((j) => j.status === 'Pendente');

  // Calculate Personal Attendance Stats for non-admin user
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

  // Render NORMAL MEMBER PERSONAL DASHBOARD
  if (!isAdmin) {
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

          {/* Action CTAs */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('chamada_qr')}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs flex items-center space-x-2 transition shadow-md shadow-amber-500/20"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Projetor QR Code / Painel do Chanceler</span>
                </button>
              )}

              {isCurrentUserCheckedIn ? (
                <div className="bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 px-4 py-2 rounded-lg text-xs flex items-center space-x-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Sua presença foi confirmada nesta sessão!</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-2 transition shadow-md shadow-amber-500/20"
                >
                  <QrCode className="w-4 h-4 text-slate-950" />
                  <span>Confirmar Minha Presença (QR Code / Token)</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setActiveTab('sessoes')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1"
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

      {/* Quick Metrics Grid for Admin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members Card */}
        <div
          onClick={() => setActiveTab('membros')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total do Quadro</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-100">{members.length}</span>
            <span className="text-xs text-slate-400 ml-2">Obreiros Cadastrados</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span>Regular: {members.filter((m) => m.status === 'Regular').length}</span>
            <span>Remido/Emérito: {members.filter((m) => m.status === 'Remido' || m.status === 'Emérito').length}</span>
          </div>
        </div>

        {/* Pending Justifications Card */}
        <div
          onClick={() => setActiveTab('justificativas')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Justificativas Pendentes</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-400">{pendingJustifications.length}</span>
            <span className="text-xs text-slate-400 ml-2">Aguardando Análise</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-500/80 flex items-center space-x-1 pt-2 border-t border-slate-800/80">
            <Clock className="w-3 h-3" />
            <span>Análise de abonos do Chanceler/Secretário</span>
          </div>
        </div>

        {/* Inactivity Alerts Card */}
        <div
          onClick={() => setActiveTab('relatorios')}
          className={`bg-slate-900 border rounded-xl p-4 transition cursor-pointer group ${
            inactivityAlerts.length > 0
              ? 'border-rose-900/80 bg-rose-950/20 hover:border-rose-600'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Alertas de Inassiduidade</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-bold ${inactivityAlerts.length > 0 ? 'text-rose-400' : 'text-slate-100'}`}>
              {inactivityAlerts.length}
            </span>
            <span className="text-xs text-slate-400 ml-2">Irmão(s) c/ 3 Faltas Seguidas</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-400/80 flex items-center space-x-1 pt-2 border-t border-slate-800/80">
            <span>Conforme Art. do Regulamento Geral</span>
          </div>
        </div>

        {/* Visitors Logged Card */}
        <div
          onClick={() => setActiveTab('visitantes')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Irmãos Visitantes</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-100">{visitors.length}</span>
            <span className="text-xs text-slate-400 ml-2">Registrados na Sessão</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span>GOSP • GOB • GLESP • GOP • CMSB • COMAB</span>
          </div>
        </div>
      </div>

      {/* Critical Regimental Alert Warning Bar (if 3 consecutive absences exist) */}
      {inactivityAlerts.length > 0 && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-rose-200 uppercase tracking-wider">
                Aviso Regimental de Frequência Crítica
              </h4>
              <p className="text-xs text-rose-300/80 mt-0.5">
                {inactivityAlerts.length} Irmão(s) atingiu 3 faltas consecutivas sem justificativa aprovada. Notificação automática sugerida à Secretaria.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('relatorios')}
            className="bg-rose-900/80 hover:bg-rose-800 text-rose-100 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition"
          >
            Ver Detalhes do Alerta
          </button>
        </div>
      )}

      {/* Recent Activity & Members Quick List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Attendance Log Snippet */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif-masonic text-base font-semibold text-amber-200">
              Registros Recentes de Presença
            </h3>
            <button
              onClick={() => setActiveTab('chamada_qr')}
              className="text-xs text-amber-400 hover:underline"
            >
              Ver Lista Completa
            </button>
          </div>

          {(() => {
            const validAttendances = attendances.filter((att) =>
              sessions.some((s) => s.id === att.sessionId)
            );

            if (validAttendances.length === 0) {
              return (
                <p className="text-xs text-slate-500 py-6 text-center">Nenhum registro de presença efetuado hoje.</p>
              );
            }

            return (
              <div className="space-y-2.5">
                {validAttendances.slice(-6).reverse().map((att) => {
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
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono ${
                          att.method === 'QR_CODE'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-blue-950 text-blue-400 border border-blue-800'
                        }`}>
                          {att.method === 'QR_CODE' ? 'QR CODE CELL' : 'CHAMADA MANUAL'}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(att.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Administration Officers Side List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="font-serif-masonic text-base font-semibold text-amber-200 mb-4">
            Administração da Loja
          </h3>

          <div className="space-y-3">
            {['Venerável Mestre', '1º Vigilante', '2º Vigilante', 'Orador', 'Secretário', 'Chanceler'].map((role) => {
              const officerMember = activeSession?.officers[role as keyof typeof activeSession.officers]
                ? members.find((m) => m.id === activeSession.officers[role as keyof typeof activeSession.officers])
                : members.find((m) => m.currentOfficerRole === role);

              return (
                <div key={role} className="flex items-center justify-between text-xs p-2 rounded bg-slate-950/40 border border-slate-800">
                  <span className="text-amber-400/90 font-medium">{role}</span>
                  <span className="text-slate-200 truncate max-w-[150px] font-mono">
                    {officerMember ? officerMember.fullName.split(' ')[0] + ' ' + officerMember.fullName.split(' ').slice(-1) : 'Vago'}
                  </span>
                </div>
              );
            })}
          </div>
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
