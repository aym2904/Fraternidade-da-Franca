import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Users,
  Search,
  UserPlus,
  ShieldAlert,
  Building2,
  Calendar,
  Clock,
  Sparkles,
  Camera,
  Check,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { Session, Member, AttendanceRecord, VisitorRecord } from '../types/masonic';
import { calculateSessionStats, canDegreeAttend } from '../utils/masonicUtils';
import { isLodgeAdmin, isSystemAdmin } from '../utils/authUtils';
import { getMemberPhotoUrl } from '../utils/avatarUtils';
import { QrCodeScannerModal } from './QrCodeScannerModal';
import { SessionVisitorsModal } from './SessionVisitorsModal';

interface LiveSessionPanelProps {
  activeSession: Session | undefined;
  members: Member[];
  attendances: AttendanceRecord[];
  visitors: VisitorRecord[];
  currentUser: Member;
  onRecordAttendance: (memberId: string, method: 'QR_CODE' | 'MANUAL') => void;
  onRemoveAttendance: (memberId: string) => void;
  onAddVisitor: (visitor: VisitorRecord) => void;
  onDeleteVisitor?: (visitorId: string) => void;
  initialTab?: 'qr_projector' | 'manual_call' | 'visitor_form';
  isVisitorsOnlyTab?: boolean;
}

export const LiveSessionPanel: React.FC<LiveSessionPanelProps> = ({
  activeSession,
  members = [],
  attendances = [],
  visitors = [],
  currentUser,
  onRecordAttendance,
  onRemoveAttendance,
  onAddVisitor,
  onDeleteVisitor,
  initialTab,
  isVisitorsOnlyTab = false,
}) => {
  const [activeTab, setActiveTab] = useState<'qr_projector' | 'manual_call' | 'visitor_form'>(
    initialTab || (isVisitorsOnlyTab ? 'visitor_form' : 'qr_projector')
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [scannerFeedback, setScannerFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isVisitorsModalOpen, setIsVisitorsModalOpen] = useState(false);
  const [deletingVisitorId, setDeletingVisitorId] = useState<string | null>(null);

  const isAdmin = isLodgeAdmin(currentUser);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (isVisitorsOnlyTab) {
      setActiveTab('visitor_form');
    }
  }, [initialTab, isVisitorsOnlyTab]);

  // Guarantee non-admins cannot stay on admin-only tabs
  useEffect(() => {
    if (!isAdmin && (activeTab === 'manual_call' || activeTab === 'visitor_form')) {
      setActiveTab('qr_projector');
    }
  }, [isAdmin, activeTab]);

  // Visitor Form state
  const [visitorForm, setVisitorForm] = useState({
    fullName: '',
    cim: '',
    homeLodge: '',
    potencia: 'GOSP',
    degree: 'Mestre' as any,
  });

  const stats = useMemo(
    () => (activeSession ? calculateSessionStats(activeSession, members, attendances, visitors) : null),
    [activeSession, members, attendances, visitors]
  );

  const sessionAttendances = useMemo(
    () => (activeSession ? attendances.filter((a) => a.sessionId === activeSession.id) : []),
    [attendances, activeSession?.id]
  );

  const presentMemberIds = useMemo(
    () => new Set(sessionAttendances.map((a) => a.memberId)),
    [sessionAttendances]
  );

  const currentSessionVisitors = useMemo(
    () => (activeSession ? visitors.filter((v) => v.sessionId === activeSession.id) : []),
    [visitors, activeSession?.id]
  );

  const formatCheckInTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  const checkedInMembersList = useMemo(() => {
    const memberMap = new Map(members.map((m) => [m.id, m]));
    return sessionAttendances
      .map((att) => ({
        attendance: att,
        member: memberMap.get(att.memberId),
      }))
      .filter((item): item is { attendance: AttendanceRecord; member: Member } => item.member !== undefined)
      .sort((a, b) => new Date(b.attendance.timestamp).getTime() - new Date(a.attendance.timestamp).getTime());
  }, [sessionAttendances, members]);

  // Degree Lock check for current logged-in user
  const userCanAttend = useMemo(
    () => (activeSession ? canDegreeAttend(currentUser.degreeLevel, activeSession.degreeLevel) : false),
    [currentUser.degreeLevel, activeSession?.degreeLevel]
  );

  const isUserCheckedIn = useMemo(
    () => presentMemberIds.has(currentUser.id),
    [presentMemberIds, currentUser.id]
  );

  const filteredMembers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return members;
    return members.filter((m) => {
      return (
        m.fullName.toLowerCase().includes(term) ||
        m.cim.includes(term)
      );
    });
  }, [members, searchTerm]);

  if (!activeSession || !stats) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4">
        <QrCode className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="font-serif-masonic text-xl font-bold text-slate-200">
          Nenhuma Sessão Ativa no Momento
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Para realizar a chamada automatizada via QR Code ou registro manual pelo Chanceler/Secretário, ative uma sessão no menu "Sessões da Loja".
        </p>
      </div>
    );
  }

  const handleSelfQrCheckIn = () => {
    setScannerFeedback(null);

    if (!userCanAttend) {
      setScannerFeedback({
        success: false,
        message: `TRAVA REGIMENTAL: Irmão ${currentUser.fullName} (Grau ${currentUser.degreeLevel} - ${currentUser.degree}) não possui autorização para a Sessão no Grau ${activeSession.degreeLevel} (${activeSession.degree}).`,
      });
      return;
    }

    setIsScannerOpen(true);
  };

  const handleAddVisitorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!visitorForm.fullName || !visitorForm.cim || !visitorForm.homeLodge) return;

    let degreeLevel: 1 | 2 | 3 = 1;
    if (visitorForm.degree === 'Companheiro') degreeLevel = 2;
    if (visitorForm.degree === 'Mestre') degreeLevel = 3;

    const newVis: VisitorRecord = {
      id: 'v-' + Date.now(),
      sessionId: activeSession.id,
      fullName: visitorForm.fullName,
      cim: visitorForm.cim,
      homeLodge: visitorForm.homeLodge,
      potencia: visitorForm.potencia,
      degree: visitorForm.degree,
      degreeLevel,
      timestamp: new Date().toISOString(),
    };

    onAddVisitor(newVis);
    setVisitorForm({
      fullName: '',
      cim: '',
      homeLodge: '',
      potencia: 'GOSP',
      degree: 'Mestre',
    });
  };

  return (
    <div className="space-y-6">
      {/* Real-time Session Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-amber-500/40 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{isAdmin ? 'MÓDULO DO CHANCELER / SECRETÁRIO AO VIVO' : 'SESSÃO AO VIVO EM ANDAMENTO'}</span>
              </span>
              <span className="bg-amber-950 text-amber-300 border border-amber-700/60 text-xs px-2.5 py-0.5 rounded font-mono font-bold">
                Grau Exigido: {activeSession.degree}
              </span>
            </div>

            <h2 className="font-serif-masonic text-xl sm:text-2xl font-bold text-slate-100 mt-2">
              {activeSession.title}
            </h2>

            <p className="text-xs text-slate-300 mt-1 flex items-center space-x-4">
              <span>Data: {activeSession.date.split('-').reverse().join('/')} às {activeSession.time}h</span>
              <span>•</span>
              <span>{activeSession.location}</span>
            </p>
          </div>

          {/* Real-time % Meter Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center space-x-5 min-w-[280px]">
            <div className="text-center">
              <p className="text-3xl font-extrabold text-amber-300 font-mono">
                {stats.percentagePresent}%
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Frequência do Quadro
              </p>
            </div>

            <div className="h-10 w-px bg-slate-800" />

            <div className="text-xs space-y-1">
              <p className="text-slate-300">
                Presentes: <strong className="text-emerald-400 font-mono">{stats.totalPresentMembers}</strong> / {stats.totalEligible}
              </p>
              <button
                type="button"
                onClick={() => setIsVisitorsModalOpen(true)}
                className="text-slate-300 hover:text-cyan-300 flex items-center space-x-1.5 transition group cursor-pointer text-left"
                title="Clique para ver os detalhes dos visitantes da sessão ao vivo"
              >
                <span>Visitantes:</span>
                <strong className="text-blue-400 group-hover:text-cyan-300 group-hover:underline font-mono">
                  {stats.totalVisitors}
                </strong>
                <span className="text-[10px] text-slate-500 group-hover:text-cyan-400">🔍</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Controls - Restrict Session Management Tabs to Secretário, Chanceler & Venerável Mestre */}
        {isAdmin && (
          <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap gap-2 text-xs font-semibold">
            {!isVisitorsOnlyTab && (
              <>
                <button
                  onClick={() => setActiveTab('qr_projector')}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition ${
                    activeTab === 'qr_projector'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>QR Code da Reunião (Projetor / Entrada)</span>
                </button>

                <button
                  onClick={() => setActiveTab('manual_call')}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition ${
                    activeTab === 'manual_call'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Chamada Manual (Secretário / Chanceler / VM)</span>
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab('visitor_form')}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition ${
                activeTab === 'visitor_form'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrar Irmão Visitante ({currentSessionVisitors.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Admin Tab: QR Code Projector for Temple Display */}
      {isAdmin && activeTab === 'qr_projector' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: QR Code Display & Quick Self Check-in (Admin Only) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center space-y-4 shadow-xl">
            <div className="bg-slate-950 border border-amber-500/40 p-3 rounded-lg flex items-center space-x-2 text-xs text-amber-300 w-full justify-center">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>QR Code Oficial de Entrada para a Reunião</span>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-2xl ring-4 ring-amber-500/20 my-2">
              <QRCodeSVG
                value={activeSession.qrCodeToken}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            {/* Token Highlight Card under QR Code */}
            <div className="w-full bg-slate-950 border border-amber-500/40 rounded-xl p-3 text-center space-y-1">
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                Token para Inserção Direta / Manual:
              </p>
              <p className="font-mono text-xs sm:text-sm font-extrabold text-amber-300 tracking-wider bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 select-all">
                {activeSession.qrCodeToken}
              </p>
            </div>

            {/* Logged in member badge & Check-in Action */}
            <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-3 text-left">
              <div className="flex items-center space-x-3 text-xs">
                <img
                  src={getMemberPhotoUrl(currentUser.photoUrl)}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-500/50 bg-slate-900 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-200 truncate">{currentUser.fullName}</p>
                  <p className="text-[11px] text-amber-400 font-mono truncate">
                    {isSystemAdmin(currentUser)
                      ? 'Usuário Reservado ao Desenvolvedor'
                      : `CIM: ${currentUser.cim} • ${currentUser.degree}`}
                  </p>
                </div>
              </div>

              {/* Degree Enforcement Alert Banner */}
              {!userCanAttend && (
                <div className="bg-rose-950/80 border border-rose-600/80 rounded-lg p-2.5 flex items-start space-x-2 text-xs text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    Acesso Regimental Bloqueado. A sessão é de Grau {activeSession.degreeLevel}º.
                  </p>
                </div>
              )}

              {/* Scanner Feedback Message */}
              {scannerFeedback && (
                <div
                  className={`p-2.5 rounded-lg border text-xs font-medium flex items-center space-x-2 ${
                    scannerFeedback.success
                      ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-200'
                      : 'bg-rose-950/80 border-rose-600/80 text-rose-200'
                  }`}
                >
                  {scannerFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{scannerFeedback.message}</span>
                </div>
              )}

              <button
                onClick={handleSelfQrCheckIn}
                disabled={isUserCheckedIn}
                className={`w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition ${
                  isUserCheckedIn
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 cursor-not-allowed'
                    : !userCanAttend
                    ? 'bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>
                  {isUserCheckedIn
                    ? 'Presença Já Confirmada!'
                    : 'Ler QR Code e Confirmar Minha Presença'}
                </span>
              </button>
            </div>
          </div>

          {/* Right Column: Real-time Check-ins List Panel (Ao Lado do QR Code) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-amber-400 shrink-0" />
                  <h3 className="font-serif-masonic text-base font-bold text-amber-200 flex items-center">
                    <span>Últimos Irmãos que Fizeram Check-in (Ao Vivo)</span>
                    <span className="flex h-2.5 w-2.5 relative ml-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  </h3>
                </div>

                <div className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-300 shrink-0">
                  <span className="text-emerald-400 font-bold">{checkedInMembersList.length}</span>
                  <span className="text-slate-500"> / {stats.totalEligible}</span>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Atualização automática em tempo real a cada check-in realizado por QR Code ou chamada manual.
              </p>

              {checkedInMembersList.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <QrCode className="w-12 h-12 text-slate-700 mx-auto animate-pulse" />
                  <p className="text-xs text-slate-400 font-medium">Nenhum check-in registrado ainda nesta sessão.</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Assim que um irmão realizar o check-in, seu nome aparecerá nesta lista automaticamente.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {checkedInMembersList.map(({ attendance, member }, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div
                        key={attendance.id || member.id}
                        className={`p-3 rounded-xl border flex items-center space-x-3 transition ${
                          isLatest
                            ? 'bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/30'
                            : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <img
                          src={getMemberPhotoUrl(member.photoUrl)}
                          alt={member.fullName}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500/30 bg-slate-900 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-200 truncate">{member.fullName}</p>
                            {isLatest && (
                              <span className="bg-amber-500 text-slate-950 font-extrabold text-[9px] px-1.5 py-0.5 rounded tracking-wider uppercase ml-1 shrink-0">
                                Novo
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono truncate">
                            CIM: {member.cim} • {member.degree}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                            <span className="flex items-center space-x-1 text-emerald-400 font-medium">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>{attendance.method === 'QR_CODE' ? 'QR Code' : 'Manual'}</span>
                            </span>
                            <span className="font-mono text-slate-400">
                              {formatCheckInTime(attendance.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Non-Admin Member View: Clean Presence Interface without exposing QR SVG or Token */}
      {!isAdmin && (
        <div className="space-y-6">
          {!userCanAttend ? (
            /* TRAVA REGIMENTAL - GRAU SUPERIOR */
            <div className="bg-rose-950/40 border border-rose-800/80 rounded-2xl p-8 shadow-2xl space-y-5 text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-rose-900/60 border border-rose-600 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
                <ShieldAlert className="w-9 h-9" />
              </div>

              <div>
                <h3 className="font-serif-masonic text-xl font-bold text-rose-200">
                  Acesso Regimental Bloqueado — Trabalhos no Grau de {activeSession.degree}
                </h3>
                <p className="text-xs text-rose-300/90 mt-2 leading-relaxed">
                  Esta sessão dos trabalhos é reservada estritamente aos Irmãos do Grau de <strong>{activeSession.degree} ({activeSession.degreeLevel}º Grau)</strong>.
                </p>
              </div>

              <div className="bg-slate-950/90 border border-rose-900/60 rounded-xl p-4 text-left space-y-2 text-xs">
                <div className="flex items-center space-x-3">
                  <img
                    src={getMemberPhotoUrl(currentUser.photoUrl)}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-rose-500/40 bg-slate-900 shrink-0"
                  />
                  <div>
                    <p className="font-bold text-slate-200">{currentUser.fullName}</p>
                    <p className="text-[11px] text-amber-400 font-mono">
                      CIM: {currentUser.cim} • Grau Atual: {currentUser.degree} ({currentUser.degreeLevel}º Grau)
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800 text-[11px] text-rose-300/80 leading-relaxed">
                  Conforme a legislação maçônica e a liturgia dos Graus Simbólicos, obreiros do Grau de {currentUser.degree} não têm ingresso à Câmara nem podem assinar o livro de presenças desta reunião.
                </div>
              </div>
            </div>
          ) : (
            /* REGULAR MEMBER PERSONAL CHECK-IN (ELIGIBLE DEGREE) */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Personal Presence Action */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center space-y-5 shadow-xl">
                <div className="w-full bg-slate-950 border border-amber-500/40 p-4 rounded-xl flex items-center space-x-3 text-left">
                  <img
                    src={getMemberPhotoUrl(currentUser.photoUrl)}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-500/50 bg-slate-900 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-100 truncate text-sm">{currentUser.fullName}</p>
                    <p className="text-xs text-amber-400 font-mono truncate">
                      CIM: {currentUser.cim} • Grau: {currentUser.degree} ({currentUser.degreeLevel}º Grau)
                    </p>
                    <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                      ✓ Acesso Autorizado aos Trabalhos
                    </p>
                  </div>
                </div>

                {/* Scanner Feedback Message */}
                {scannerFeedback && (
                  <div
                    className={`w-full p-2.5 rounded-lg border text-xs font-medium flex items-center space-x-2 ${
                      scannerFeedback.success
                        ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-200'
                        : 'bg-rose-950/80 border-rose-600/80 text-rose-200'
                    }`}
                  >
                    {scannerFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{scannerFeedback.message}</span>
                  </div>
                )}

                {isUserCheckedIn ? (
                  <div className="w-full bg-emerald-950/70 border border-emerald-500/50 rounded-2xl p-6 text-center space-y-3 shadow-lg">
                    <div className="w-14 h-14 bg-emerald-900/60 rounded-full border border-emerald-500/60 flex items-center justify-center mx-auto text-emerald-300">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-serif-masonic text-base font-bold text-emerald-200">
                        Presença Registrada com Sucesso!
                      </h4>
                      <p className="text-xs text-emerald-300/80 mt-1">
                        Seu registro de presença já foi confirmado no Livro de Presença da Loja para esta sessão.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
                    <div className="w-14 h-14 bg-amber-500/10 rounded-full border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                      <Camera className="w-7 h-7" />
                    </div>

                    <div>
                      <h4 className="font-serif-masonic text-base font-bold text-amber-200">
                        Registrar Minha Presença
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Aponte a câmera do seu celular para o QR Code oficial projetado no Templo (ou exibido pelo Chanceler) para registrar sua presença.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsScannerOpen(true)}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-amber-500/20"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Abrir Câmera para Escanear QR Code</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Brethren Checked-in */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-serif-masonic text-base font-bold text-amber-200 flex items-center space-x-2">
                    <Users className="w-5 h-5 text-amber-400" />
                    <span>Irmãos Presentes nesta Reunião</span>
                  </h3>
                  <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-xs font-mono text-emerald-400 font-bold">
                    {checkedInMembersList.length} presentes
                  </span>
                </div>

                {checkedInMembersList.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <Users className="w-10 h-10 text-slate-700 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">Nenhum check-in registrado ainda nesta sessão.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {checkedInMembersList.map(({ attendance, member }) => (
                      <div
                        key={attendance.id || member.id}
                        className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center space-x-3"
                      >
                        <img
                          src={getMemberPhotoUrl(member.photoUrl)}
                          alt={member.fullName}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-amber-500/30 bg-slate-900 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">{member.fullName}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {member.degree} • {formatCheckInTime(attendance.timestamp)}
                          </p>
                        </div>
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Call Tab (Admin Only) */}
      {activeTab === 'manual_call' && isAdmin && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-serif-masonic text-lg font-bold text-amber-200">
                Lista de Chamada Manual do Quadro
              </h3>
              <p className="text-xs text-slate-400">
                O Secretário/Chanceler pode marcar ou desmarcar a presença de cada Irmão manualmente.
              </p>
            </div>

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
          </div>

          <div className="divide-y divide-slate-800/80 max-h-[500px] overflow-y-auto pr-1">
            {filteredMembers.map((m) => {
              const isPresent = presentMemberIds.has(m.id);
              const attRecord = sessionAttendances.find((a) => a.memberId === m.id);
              const canAttend = canDegreeAttend(m.degreeLevel, activeSession.degreeLevel);

              return (
                <div
                  key={m.id}
                  className={`py-3 flex items-center justify-between transition px-2 rounded-lg ${
                    !canAttend ? 'opacity-50 bg-rose-950/10' : 'hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <img src={getMemberPhotoUrl(m.photoUrl)} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-700" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs font-semibold text-slate-200">{m.fullName}</p>
                        {!canAttend && (
                          <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.2 rounded">
                            Grau Incompatível ({m.degree})
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        CIM: {m.cim} • Grau: {m.degree} • Status: {m.status}
                      </p>
                    </div>
                  </div>

                  <div>
                    {canAttend ? (
                      isPresent ? (
                        <div className="bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm select-none">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>
                            Presente {attRecord?.method === 'QR_CODE' ? '(QR Code)' : '(Manual)'}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => onRecordAttendance(m.id, 'MANUAL')}
                          className="bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition"
                        >
                          <span>Marcar Presença</span>
                        </button>
                      )
                    ) : (
                      <span className="text-[10px] text-rose-400/80 italic font-mono">Bloqueado por Grau</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visitor Registration Tab (Admin Only) */}
      {activeTab === 'visitor_form' && isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-serif-masonic text-base font-bold text-amber-200 flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <span>Registrar Irmão Visitante de Outra Loja</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Registro oficial de visitantes com Coleta de Nome, CIM, Loja e Potência.
              </p>
            </div>

            <form onSubmit={handleAddVisitorSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Nome Completo do Visitante</label>
                <input
                  type="text"
                  required
                  value={visitorForm.fullName}
                  onChange={(e) => setVisitorForm({ ...visitorForm, fullName: e.target.value })}
                  placeholder="Ex: Waldemar de Moraes Lins"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">CIM (Registro Maçônico)</label>
                  <input
                    type="text"
                    required
                    value={visitorForm.cim}
                    onChange={(e) => setVisitorForm({ ...visitorForm, cim: e.target.value })}
                    placeholder="Ex: 158291"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Grau do Visitante</label>
                  <select
                    value={visitorForm.degree}
                    onChange={(e) => setVisitorForm({ ...visitorForm, degree: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Mestre">Mestre (3º Grau)</option>
                    <option value="Companheiro">Companheiro (2º Grau)</option>
                    <option value="Aprendiz">Aprendiz (1º Grau)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Loja de Origem e Número</label>
                  <input
                    type="text"
                    required
                    value={visitorForm.homeLodge}
                    onChange={(e) => setVisitorForm({ ...visitorForm, homeLodge: e.target.value })}
                    placeholder="Ex: A.R.L.S. União nº 48"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Potência Maçônica</label>
                  <select
                    value={visitorForm.potencia}
                    onChange={(e) => setVisitorForm({ ...visitorForm, potencia: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="GOSP">GOSP (Grande Oriente de São Paulo)</option>
                    <option value="GOB">GOB (Grande Oriente do Brasil)</option>
                    <option value="GLESP">GLESP (Grande Loja Maçônica do Estado de SP)</option>
                    <option value="GOP">GOP (Grande Oriente Paulista)</option>
                    <option value="CMSB">CMSB (Confederação da Maçonaria Simbólica do Brasil)</option>
                    <option value="COMAB">COMAB (Confederação Maçônica do Brasil)</option>
                    <option value="Internacional">Internacional / Outra</option>
                  </select>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-lg transition"
                >
                  Confirmar e Registrar Visitante
                </button>
              </div>
            </form>
          </div>

          {/* Current Session Visitors List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-serif-masonic text-base font-bold text-amber-200 border-b border-slate-800 pb-3">
              Visitantes Registrados na Sessão Atual ({currentSessionVisitors.length})
            </h3>

            {currentSessionVisitors.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">Nenhum visitante registrado ainda.</p>
            ) : (
              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {currentSessionVisitors.map((vis) => {
                  const isDeleting = deletingVisitorId === vis.id;

                  return (
                    <div
                      key={vis.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-200">{vis.fullName}</p>
                        <span className="bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded text-[10px] font-mono">
                          {vis.potencia}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        Loja: <strong className="text-slate-300">{vis.homeLodge}</strong> • CIM: {vis.cim}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <p className="text-[10px] text-slate-500">
                          Grau: {vis.degree} • Registrado às {new Date(vis.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>

                        {isAdmin && onDeleteVisitor && (
                          <div>
                            {isDeleting ? (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => {
                                    onDeleteVisitor(vis.id);
                                    setDeletingVisitorId(null);
                                  }}
                                  className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold"
                                >
                                  Excluir
                                </button>
                                <button
                                  onClick={() => setDeletingVisitorId(null)}
                                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px]"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingVisitorId(vis.id)}
                                className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-900 transition opacity-80 group-hover:opacity-100"
                                title="Excluir este visitante"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera QR Code Scanner Modal */}
      <QrCodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        activeSession={activeSession}
        currentUser={currentUser}
        onSuccessCheckIn={(memberId) => {
          onRecordAttendance(memberId, 'QR_CODE');
          setScannerFeedback({
            success: true,
            message: `Presença de ${currentUser.fullName} registrada com sucesso via QR Code da Reunião!`,
          });
        }}
      />

      {/* Session Visitors Modal */}
      <SessionVisitorsModal
        isOpen={isVisitorsModalOpen}
        onClose={() => setIsVisitorsModalOpen(false)}
        session={activeSession || null}
        visitors={visitors}
        currentUser={currentUser}
        onDeleteVisitor={onDeleteVisitor}
      />
    </div>
  );
};
