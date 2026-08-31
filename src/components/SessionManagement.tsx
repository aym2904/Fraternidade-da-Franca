import React, { useState, useMemo, useCallback } from 'react';
import {
  Calendar,
  Plus,
  Lock,
  Unlock,
  Users,
  Building2,
  Clock,
  ShieldAlert,
  Play,
  Square,
  X,
  Trash2,
  AlertTriangle,
  Edit3,
  CheckCircle2,
} from 'lucide-react';
import { Session, SessionType, SessionSubtype, MasonicDegree, Member, LodgeOfficerRole, Balaustre, AttendanceRecord, VisitorRecord } from '../types/masonic';
import { isLodgeAdmin, isSystemAdmin, canAccessSessionDegree } from '../utils/authUtils';
import { calculateSessionStats, sortSessionsByCreationDesc } from '../utils/masonicUtils';

interface SessionManagementProps {
  sessions: Session[];
  members: Member[];
  currentUser: Member;
  balaustres?: Balaustre[];
  attendances?: AttendanceRecord[];
  visitors?: VisitorRecord[];
  onAddSession: (session: Session) => void;
  onUpdateSession: (session: Session) => void;
  onToggleActiveSession: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onClearAllSessions?: () => void;
}

export function buildDefaultSessionTitle(
  type: SessionType,
  subtype: SessionSubtype,
  degree: MasonicDegree,
  sessionCount: number
): string {
  const sessNum = Math.floor(1486 + sessionCount);
  if (type === 'Magna') {
    if (subtype === 'Iniciação') return `Sessão Magna de Iniciação nº ${sessNum}`;
    if (subtype === 'Elevação') return `Sessão Magna de Elevação nº ${sessNum}`;
    if (subtype === 'Exaltação') return `Sessão Magna de Exaltação nº ${sessNum}`;
    if (subtype === 'Posse') return `Sessão Magna de Posse da Diretoria nº ${sessNum}`;
    if (subtype === 'Pública') return `Sessão Magna Pública nº ${sessNum}`;
    return `Sessão Magna no Grau de ${degree} nº ${sessNum}`;
  }
  if (type === 'Administrativa') {
    return `Sessão Administrativa de ${degree} nº ${sessNum}`;
  }
  return `Sessão Ordinária de ${degree} nº ${sessNum}`;
}

export const ALL_LODGE_OFFICER_ROLES: LodgeOfficerRole[] = [
  'Venerável Mestre',
  '1º Vigilante',
  '2º Vigilante',
  'Orador',
  'Secretário',
  'Tesoureiro',
  'Chanceler',
  '1º Diácono',
  '2º Diácono',
  'Mestre de Cerimônias',
  'Guarda do Templo',
  'Hospedeiro',
  'Bibliotecário',
  'Mestre de Harmonia',
];

export const SessionManagement: React.FC<SessionManagementProps> = ({
  sessions = [],
  members = [],
  currentUser,
  balaustres = [],
  attendances = [],
  visitors = [],
  onAddSession,
  onUpdateSession,
  onToggleActiveSession,
  onDeleteSession,
  onClearAllSessions,
}) => {
  const isAdmin = isLodgeAdmin(currentUser);
  const isSysAdmin = isSystemAdmin(currentUser);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  // Filter sessions according to user's degree and administrative permissions, ordered by creation (newest on top)
  const visibleSessions = useMemo(() => {
    return sortSessionsByCreationDesc(
      sessions.filter((s) => canAccessSessionDegree(currentUser, s.degreeLevel))
    );
  }, [sessions, currentUser]);

  // Memoize session stats map to avoid heavy recalculations during renders
  const sessionStatsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateSessionStats>>();
    for (const s of visibleSessions) {
      map.set(s.id, calculateSessionStats(s, members, attendances, visitors));
    }
    return map;
  }, [visibleSessions, members, attendances, visitors]);

  const [formData, setFormData] = useState<Partial<Session>>({
    title: '',
    type: 'Ordinária',
    subtype: 'Trabalho de Instrução',
    degree: 'Aprendiz',
    degreeLevel: 1,
    date: new Date().toISOString().split('T')[0],
    time: '20:00',
    location: 'Templo da Loja - Oriente de Franca/SP',
    officers: {},
    notes: '',
  });

  const handleOpenAddModal = () => {
    setEditingSession(null);

    // Default officers from member current roles
    const defaultOfficers: Partial<Record<LodgeOfficerRole, string>> = {};
    members.forEach((m) => {
      if (m.currentOfficerRole) {
        defaultOfficers[m.currentOfficerRole] = m.id;
      }
    });

    const initialTitle = buildDefaultSessionTitle('Ordinária', 'Trabalho de Instrução', 'Aprendiz', sessions.length);

    setFormData({
      title: initialTitle,
      type: 'Ordinária',
      subtype: 'Trabalho de Instrução',
      degree: 'Aprendiz',
      degreeLevel: 1,
      date: new Date().toISOString().split('T')[0],
      time: '20:00',
      location: 'Templo da Loja - Oriente de Franca/SP',
      officers: defaultOfficers,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sess: Session) => {
    const isApproved = balaustres.some((b) => b.sessionId === sess.id && b.status === 'Aprovado');
    if (isApproved) {
      alert('Não é possível editar esta sessão pois o seu Balaústre já foi aprovado em Loja.');
      return;
    }

    setEditingSession(sess);
    setFormData({
      title: sess.title,
      type: sess.type,
      subtype: sess.subtype || 'Trabalho de Instrução',
      degree: sess.degree,
      degreeLevel: sess.degreeLevel,
      date: sess.date,
      time: sess.time,
      location: sess.location,
      officers: { ...sess.officers },
      notes: sess.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDegreeChange = (deg: MasonicDegree) => {
    let level: 1 | 2 | 3 = 1;
    if (deg === 'Companheiro') level = 2;
    if (deg === 'Mestre') level = 3;

    const currentType = (formData.type as SessionType) || 'Ordinária';
    let currentSubtype = (formData.subtype as SessionSubtype) || 'Trabalho de Instrução';

    // Auto-adjust subtype if Magna is selected
    if (currentType === 'Magna') {
      if (deg === 'Aprendiz') currentSubtype = 'Iniciação';
      else if (deg === 'Companheiro') currentSubtype = 'Elevação';
      else if (deg === 'Mestre') currentSubtype = 'Exaltação';
    }

    const newTitle = buildDefaultSessionTitle(currentType, currentSubtype, deg, sessions.length);

    setFormData({
      ...formData,
      degree: deg,
      degreeLevel: level,
      subtype: currentSubtype,
      title: newTitle,
    });
  };

  const handleTypeChange = (newType: SessionType) => {
    let newSubtype = (formData.subtype as SessionSubtype) || 'Trabalho de Instrução';
    const currentDeg = (formData.degree as MasonicDegree) || 'Aprendiz';

    if (newType === 'Magna') {
      if (currentDeg === 'Aprendiz') newSubtype = 'Iniciação';
      else if (currentDeg === 'Companheiro') newSubtype = 'Elevação';
      else if (currentDeg === 'Mestre') newSubtype = 'Exaltação';
    } else if (newType === 'Ordinária' && ['Iniciação', 'Elevação', 'Exaltação'].includes(newSubtype)) {
      newSubtype = 'Trabalho de Instrução';
    }

    const newTitle = buildDefaultSessionTitle(newType, newSubtype, currentDeg, sessions.length);

    setFormData({
      ...formData,
      type: newType,
      subtype: newSubtype,
      title: newTitle,
    });
  };

  const handleSubtypeChange = (newSubtype: SessionSubtype) => {
    let newDegree = (formData.degree as MasonicDegree) || 'Aprendiz';
    let newLevel: 1 | 2 | 3 = formData.degreeLevel || 1;
    let newType = (formData.type as SessionType) || 'Ordinária';

    if (newSubtype === 'Iniciação') {
      newDegree = 'Aprendiz';
      newLevel = 1;
      newType = 'Magna';
    } else if (newSubtype === 'Elevação') {
      newDegree = 'Companheiro';
      newLevel = 2;
      newType = 'Magna';
    } else if (newSubtype === 'Exaltação') {
      newDegree = 'Mestre';
      newLevel = 3;
      newType = 'Magna';
    }

    const newTitle = buildDefaultSessionTitle(newType, newSubtype, newDegree, sessions.length);

    setFormData({
      ...formData,
      type: newType,
      subtype: newSubtype,
      degree: newDegree,
      degreeLevel: newLevel,
      title: newTitle,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date) return;

    if (editingSession) {
      const isApproved = balaustres.some((b) => b.sessionId === editingSession.id && b.status === 'Aprovado');
      if (isApproved) {
        alert('Não é possível salvar alterações pois o Balaústre desta sessão já foi aprovado em Loja.');
        return;
      }

      onUpdateSession({
        ...editingSession,
        ...(formData as Session),
      });
    } else {
      const now = new Date();
      const newSess: Session = {
        id: 's-' + now.getTime(),
        title: formData.title || 'Nova Sessão Maçônica',
        type: (formData.type as SessionType) || 'Ordinária',
        subtype: formData.subtype as SessionSubtype,
        degree: (formData.degree as MasonicDegree) || 'Aprendiz',
        degreeLevel: formData.degreeLevel || 1,
        date: formData.date || now.toISOString().split('T')[0],
        time: formData.time || '20:00',
        location: formData.location || 'Templo da Loja - Oriente de Franca/SP',
        qrCodeToken: `QR-${formData.degree?.[0]}${Math.floor(1000 + Math.random() * 9000)}-FRATERNIDADE3571-${now.getTime()}`,
        active: false,
        officers: formData.officers || {},
        notes: formData.notes,
        createdAt: now.toISOString(),
      };
      onAddSession(newSess);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="font-serif-masonic text-xl font-bold text-amber-200">
            {isAdmin ? 'Gerenciamento e Controle de Sessões' : `Sessões Permitidas ao Grau de ${currentUser.degree}`}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin
              ? 'Configuração do Grau, trava de segurança regimental e cargos da administração da reunião.'
              : `Exibindo apenas sessões compatíveis com a sua graduação (${currentUser.degree} — ${currentUser.degreeLevel}º Grau).`}
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            {isSysAdmin && sessions.length > 0 && (
              <button
                onClick={() => setIsClearAllModalOpen(true)}
                className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center space-x-2 transition"
                title="Apenas Administrador do Sistema (Master)"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Apagar Todas as Sessões (Admin Master)</span>
              </button>
            )}

            <button
              onClick={handleOpenAddModal}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center space-x-2 transition shadow-md shadow-amber-500/10"
            >
              <Plus className="w-4 h-4" />
              <span>Criar / Agendar Nova Sessão</span>
            </button>
          </div>
        )}
      </div>

      {/* Sessions List Grid */}
      <div className="space-y-4">
        {visibleSessions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
            Nenhuma sessão cadastrada para o seu nível de acesso.
          </div>
        ) : (
          visibleSessions.map((s) => {
            const sessionBalaustre = balaustres.find((b) => b.sessionId === s.id);
            const isBalaustreApproved = sessionBalaustre?.status === 'Aprovado';
            const sessionStats = sessionStatsMap.get(s.id) || calculateSessionStats(s, members, attendances, visitors);

            return (
              <div
                key={s.id}
                className={`bg-slate-900 border rounded-2xl p-5 transition relative ${
                  s.active
                    ? 'border-emerald-500/80 bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 shadow-lg shadow-emerald-950/30'
                    : isBalaustreApproved
                    ? 'border-emerald-900/40 bg-slate-900/90'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top Badge & Sutil Indicator Row */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 pb-3 border-b border-slate-800/60">
                  <div className="flex flex-wrap items-center gap-2">
                    {s.active ? (
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>SESSÃO ATIVA AGORA</span>
                      </span>
                    ) : isBalaustreApproved ? (
                      <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1 shadow-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Balaústre Aprovado • Sessão Imutável</span>
                      </span>
                    ) : (
                      <span className="bg-slate-800 text-slate-400 text-[11px] px-2.5 py-0.5 rounded-full border border-slate-700">
                        Sessão Registrada
                      </span>
                    )}

                    <span className="bg-amber-950 text-amber-300 border border-amber-800/80 text-[11px] px-2.5 py-0.5 rounded font-mono font-semibold">
                      Grau: {s.degree} ({s.degreeLevel}º Grau)
                    </span>

                    <span className="bg-slate-800 text-slate-300 text-[11px] px-2.5 py-0.5 rounded">
                      Tipo: {s.type} {s.subtype ? `• ${s.subtype}` : ''}
                    </span>
                  </div>

                  {/* Canto Superior Direito: Presença do Quadro e Visitantes (Sutil) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-950/80 border border-slate-800/90 text-[11px] text-slate-300 shadow-sm"
                      title={`Presença do Quadro da Loja: ${sessionStats.totalPresentMembers} de ${sessionStats.totalEligible} irmãos do grau presentes (${sessionStats.percentagePresent}%)`}
                    >
                      <Users className="w-3.5 h-3.5 text-amber-400/90" />
                      <span>
                        <strong className="text-amber-300 font-semibold">{sessionStats.percentagePresent}%</strong> presentes
                        <span className="text-slate-400 ml-1">({sessionStats.totalPresentMembers}/{sessionStats.totalEligible})</span>
                      </span>
                    </span>

                    <span
                      className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-950/80 border border-slate-800/90 text-[11px] text-slate-300 shadow-sm"
                      title={`Irmãos Visitantes registrados nesta sessão: ${sessionStats.totalVisitors}`}
                    >
                      <Building2 className="w-3.5 h-3.5 text-cyan-400/90" />
                      <span>
                        <strong className="text-cyan-300 font-semibold">{sessionStats.totalVisitors}</strong> {sessionStats.totalVisitors === 1 ? 'visitante' : 'visitantes'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="font-serif-masonic text-lg font-bold text-slate-100">
                      {s.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>Data: {(s.date || '').split('-').reverse().join('/')} às {s.time}h</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Building2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>{s.location}</span>
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons (Admin Only) */}
                  {isAdmin && (
                    <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                      {/* Botão de Editar Sessão */}
                      {isBalaustreApproved ? (
                        <button
                          disabled
                          title="Edição bloqueada: O Balaústre desta sessão já foi aprovado em Loja."
                          className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-slate-950/70 border border-slate-800 text-slate-500 cursor-not-allowed opacity-60"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Edição Bloqueada</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenEditModal(s)}
                          className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/40 transition active:scale-95 shadow-sm"
                          title="Editar número da sessão, data, horário e cargos exercidos"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Editar Sessão</span>
                        </button>
                      )}

                      {/* Botão de Ativar / Iniciar Sessão */}
                      {isBalaustreApproved ? (
                        <button
                          disabled
                          title="Esta sessão não pode mais ser ativada ou iniciada pois o seu Balaústre já foi aprovado em Loja."
                          className="px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-slate-950/70 border border-slate-800 text-slate-500 cursor-not-allowed opacity-60"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Sessão Finalizada</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onToggleActiveSession(s.id)}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition ${
                            s.active
                              ? 'bg-rose-900/80 hover:bg-rose-800 text-rose-100 border border-rose-700'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-600/20'
                          }`}
                        >
                          {s.active ? (
                            <>
                              <Square className="w-4 h-4" />
                              <span>Encerrar / Desativar Sessão</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 fill-current" />
                              <span>Ativar / Iniciar Chamada QR</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Delete button: strictly reserved for System Administrator */}
                      {isSysAdmin && (
                        <button
                          onClick={() => setSessionToDelete(s)}
                          className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-800 hover:bg-rose-950/30 transition"
                          title="Apagar esta sessão (Exclusivo Administrador Master)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Officers Matrix Row */}
                <div className="mt-4 pt-4 border-t border-slate-800/80">
                  <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Cargos Exercidos na Sessão:
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px]">
                    {['Venerável Mestre', '1º Vigilante', '2º Vigilante', 'Orador', 'Secretário', 'Chanceler'].map((role) => {
                      const officersMap = s.officers || {};
                      const memberId = (officersMap as any)[role];
                      const officer = members.find((m) => m.id === memberId);

                      return (
                        <div key={role} className="bg-slate-950 p-2 rounded border border-slate-800">
                          <p className="text-[10px] text-amber-400 font-medium truncate">{role}</p>
                          <p className="text-slate-200 font-mono truncate mt-0.5">
                            {officer ? (officer.fullName || '').split(' ')[0] + ' ' + (officer.fullName || '').split(' ').slice(-1) : 'Vago'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add / Edit Session (Admin Only) */}
      {isModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full my-auto text-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-900/95">
              <div>
                <h3 className="font-serif-masonic text-base sm:text-lg font-bold text-amber-200">
                  {editingSession ? 'Editar Sessão Maçônica' : 'Agendar / Criar Nova Sessão'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {editingSession
                    ? `Alteração de dados, número e cargos da ${editingSession.title}`
                    : 'Preencha os dados e atribuições de oficiais para agendar a reunião.'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Número e Título da Sessão <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Sessão Ordinária de Aprendiz nº 1.486"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Tipo de Sessão</label>
                    <select
                      value={formData.type || 'Ordinária'}
                      onChange={(e) => handleTypeChange(e.target.value as SessionType)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Ordinária">Ordinária</option>
                      <option value="Magna">Magna (Pública / Iniciação / Elevação / Exaltação / Posse)</option>
                      <option value="Administrativa">Administrativa (Finanças / Eleições)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Subtipo / Caráter</label>
                    <select
                      value={formData.subtype || 'Trabalho de Instrução'}
                      onChange={(e) => handleSubtypeChange(e.target.value as SessionSubtype)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Trabalho de Instrução">Trabalho de Instrução</option>
                      <option value="Iniciação">Iniciação (Grau 1)</option>
                      <option value="Elevação">Elevação (Grau 2)</option>
                      <option value="Exaltação">Exaltação (Grau 3)</option>
                      <option value="Posse">Posse da Diretoria</option>
                      <option value="Pública">Sessão Pública</option>
                      <option value="Sessão de Finanças">Sessão de Finanças</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1 font-semibold text-amber-300">
                    Grau Exigido na Sessão (Trava de Acesso e Presença)
                  </label>
                  <select
                    value={formData.degree || 'Aprendiz'}
                    onChange={(e) => handleDegreeChange(e.target.value as MasonicDegree)}
                    className="w-full bg-amber-950/40 border border-amber-700/60 rounded-lg p-2.5 text-amber-200 focus:outline-none font-medium"
                  >
                    <option value="Aprendiz">Grau 1 - Aprendiz (Acesso Livre a Todos do Quadro)</option>
                    <option value="Companheiro">Grau 2 - Companheiro (Apenas Companheiros e Mestres)</option>
                    <option value="Mestre">Grau 3 - Mestre / Câmara do Meio (Apenas Mestres)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Data da Reunião</label>
                    <input
                      type="date"
                      required
                      value={formData.date || ''}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Horário de Início</label>
                    <input
                      type="time"
                      required
                      value={formData.time || '20:00'}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Local / Templo</label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ex: Templo da Loja - Oriente de Franca/SP"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Officers Selection */}
                <div className="pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                      Atribuição de Cargos e Oficiais da Sessão
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Restrito a Mestres Maçons (3º Grau)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                    {ALL_LODGE_OFFICER_ROLES.map((role) => (
                      <div key={role} className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
                        <label className="block text-[10px] text-amber-400 font-medium mb-1 truncate">
                          {role}
                        </label>
                        <select
                          value={formData.officers?.[role] || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              officers: {
                                ...formData.officers,
                                [role]: e.target.value,
                              },
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                        >
                          <option value="">(Vago / Não atribuído)</option>
                          {members
                            .filter((m) => m.degree === 'Mestre' && m.status !== 'Placet')
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.fullName}
                              </option>
                            ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-slate-300 font-medium mb-1">
                    Observações / Ordens do Dia (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Instruções para os Obreiros, pauta especial, prancha a ser lida..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div className="pt-4 flex justify-end space-x-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-4 py-2.5 rounded-xl text-xs transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-amber-500/20 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>{editingSession ? 'Salvar Alterações da Sessão' : 'Criar e Agendar Sessão'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Single Session Delete (Admin 193245 Only) */}
      {sessionToDelete && isSysAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="bg-slate-900 border border-rose-900/60 rounded-2xl max-w-lg w-full my-auto text-slate-200 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 bg-rose-950/50 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60">
                    Exclusão Restrita — Admin Master
                  </span>
                  <h3 className="font-serif-masonic text-base sm:text-lg font-bold text-slate-100 mt-0.5">
                    Confirmar Exclusão de Sessão
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSessionToDelete(null)}
                className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 overscroll-contain">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <div className="text-[11px] font-mono text-amber-400 uppercase font-semibold">
                  Sessão Selecionada:
                </div>
                <div className="text-sm font-bold text-slate-100 font-serif-masonic">
                  {sessionToDelete.title}
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 pt-1">
                  <span>Data: {sessionToDelete.date.split('-').reverse().join('/')} às {sessionToDelete.time}h</span>
                  <span>•</span>
                  <span>Grau: {sessionToDelete.degree}</span>
                  <span>•</span>
                  <span>Tipo: {sessionToDelete.type} ({sessionToDelete.subtype})</span>
                </div>
              </div>

              {/* Cascade Warning Box */}
              <div className="bg-rose-950/30 border border-rose-800/60 rounded-xl p-4 space-y-2 text-rose-200">
                <div className="flex items-center space-x-2 font-bold text-xs text-rose-300">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Exclusão em Cascata de Todos os Registros Vinculados:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-200/90">
                  Ao confirmar esta ação, o sistema apagará permanentemente do banco de dados e da nuvem:
                </p>
                <ul className="text-[11px] space-y-1 list-disc list-inside text-rose-200/80 pl-1 font-medium">
                  <li><strong>Toda a frequência</strong> e check-ins dos Obreiros do Quadro nesta sessão;</li>
                  <li><strong>Todos os registros de Visitantes</strong> anotados para esta data;</li>
                  <li><strong>O Balaústre / Ata</strong> lavrado para esta sessão.</li>
                </ul>
              </div>

              <p className="text-[11px] text-slate-400">
                Esta ação é irrevogável e foi autorizada para o seu usuário (Administrador Master).
              </p>
            </div>

            {/* Pinned Action Buttons Footer */}
            <div className="p-3.5 sm:p-4 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-4 py-2.5 rounded-xl text-xs transition active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (sessionToDelete) {
                    onDeleteSession?.(sessionToDelete.id);
                    setSessionToDelete(null);
                  }
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-rose-600/20 transition active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Excluir Sessão e Registros</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clear All Sessions (Admin 193245 Only) */}
      {isClearAllModalOpen && isSysAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="bg-slate-900 border border-rose-900/60 rounded-2xl max-w-lg w-full my-auto text-slate-200 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 bg-rose-950/50 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60">
                    Ação Global — Admin Master
                  </span>
                  <h3 className="font-serif-masonic text-base sm:text-lg font-bold text-slate-100 mt-0.5">
                    Apagar Todas as Sessões e Histórico
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsClearAllModalOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1 overscroll-contain">
              <div className="bg-rose-950/30 border border-rose-800/60 rounded-xl p-4 space-y-2 text-rose-200">
                <div className="flex items-center space-x-2 font-bold text-xs text-rose-300">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Limpeza Completa do Módulo de Reuniões:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-200/90">
                  Esta operação apagará <strong>todas as sessões cadastradas ({sessions.length})</strong> e removerá integralmente todos os registros de presença, visitantes e atas do sistema e do Supabase.
                </p>
              </div>

              <p className="text-[11px] text-slate-400">
                Esta ação é irreversível. Deseja prosseguir com a exclusão total?
              </p>
            </div>

            {/* Pinned Actions */}
            <div className="p-3.5 sm:p-4 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-4 py-2.5 rounded-xl text-xs transition active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAllSessions?.();
                  setIsClearAllModalOpen(false);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-rose-600/20 transition active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Limpar Todas as Sessões</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
