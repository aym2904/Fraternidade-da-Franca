import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit2,
  FileText,
  Phone,
  Mail,
  ShieldCheck,
  Award,
  X,
  CheckCircle,
  AlertCircle,
  Upload,
  Camera,
  Trash2,
  QrCode,
  Lock,
  Sparkles
} from 'lucide-react';
import { Member, MasonicDegree, MemberStatus, LodgeOfficerRole, Session, AttendanceRecord, Justification } from '../types/masonic';
import { calculateMemberAttendance } from '../utils/masonicUtils';
import { generateAttendanceCertificatePDF } from '../utils/pdfGenerator';
import { DEFAULT_NEUTRAL_AVATAR, getMemberPhotoUrl } from '../utils/avatarUtils';
import { compressImageFile } from '../utils/imageUtils';
import { OFFICER_PERMISSIONS_MAP, ADMIN_OFFICER_ROLES, getOfficerPermissions, isSystemAdmin } from '../utils/authUtils';
import { PublicMemberRegistrationModal } from './PublicMemberRegistrationModal';
import { Share2, UserPlus, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { formatFullName, cleanFullName, formatCIM, formatCPF, formatPhone, formatEmail } from '../utils/formatters';

interface MemberManagementProps {
  members: Member[];
  onAddMember: (member: Member) => void;
  onUpdateMember: (member: Member) => void;
  onDeleteMember?: (memberId: string) => void;
  sessions: Session[];
  attendances: AttendanceRecord[];
  justifications: Justification[];
  currentUser?: Member | null;
}

export const MemberManagement: React.FC<MemberManagementProps> = ({
  members = [],
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  sessions = [],
  attendances = [],
  justifications = [],
  currentUser,
}) => {
  const isSysAdmin = isSystemAdmin(currentUser);
  const [searchTerm, setSearchTerm] = useState('');
  const [degreeFilter, setDegreeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPublicRegistrationModalOpen, setIsPublicRegistrationModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [showPasswordInModal, setShowPasswordInModal] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Member>>({
    fullName: '',
    cpf: '',
    email: '',
    cim: '',
    degree: 'Aprendiz',
    degreeLevel: 1,
    status: 'Regular',
    phone: '',
    photoUrl: DEFAULT_NEUTRAL_AVATAR,
  });

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.cim.includes(searchTerm) ||
      m.cpf.includes(searchTerm);
    const matchesDegree = degreeFilter === 'ALL' || m.degree === degreeFilter;
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    return matchesSearch && matchesDegree && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setEditingMember(null);
    setShowPasswordInModal(false);
    setFormError(null);
    setFormData({
      fullName: '',
      cpf: '',
      email: '',
      cim: String(Math.floor(100000 + Math.random() * 900000)),
      degree: 'Aprendiz',
      degreeLevel: 1,
      status: 'Regular',
      phone: '',
      photoUrl: '',
      password: '123456',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (m: Member, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMember(m);
    setShowPasswordInModal(false);
    setFormError(null);
    setFormData({ ...m });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const formattedFullName = cleanFullName(formData.fullName || '');
    const formattedCim = formatCIM(formData.cim || '');
    if (!formattedFullName || !formattedCim) {
      setFormError('Por favor, preencha o Nome Completo e o CIM do Obreiro.');
      return;
    }

    if (!formData.photoUrl || formData.photoUrl === DEFAULT_NEUTRAL_AVATAR || !formData.photoUrl.trim()) {
      setFormError('A fotografia oficial do Obreiro é obrigatória para o cadastro.');
      return;
    }

    let level: 1 | 2 | 3 = 1;
    if (formData.degree === 'Companheiro') level = 2;
    if (formData.degree === 'Mestre') level = 3;

    if (editingMember) {
      const updated: Member = {
        ...editingMember,
        ...(formData as Member),
        fullName: formattedFullName,
        cim: formattedCim,
        cpf: formData.cpf ? formatCPF(formData.cpf) : '',
        email: formData.email ? formatEmail(formData.email) : '',
        phone: formData.phone ? formatPhone(formData.phone) : '',
        degreeLevel: level,
        photoUrl: formData.photoUrl,
        password: isSysAdmin
          ? (formData.password?.trim() || editingMember.password || '123456')
          : (editingMember.password || '123456'),
      };
      onUpdateMember(updated);
    } else {
      const newMem: Member = {
        id: 'm-' + Date.now(),
        fullName: formattedFullName,
        cpf: formData.cpf ? formatCPF(formData.cpf) : '000.000.000-00',
        email: formData.email ? formatEmail(formData.email) : '',
        cim: formattedCim,
        degree: (formData.degree as MasonicDegree) || 'Aprendiz',
        degreeLevel: level,
        status: (formData.status as MemberStatus) || 'Regular',
        currentOfficerRole: formData.currentOfficerRole,
        joinedDate: formData.joinedDate || new Date().toISOString().split('T')[0],
        phone: formData.phone ? formatPhone(formData.phone) : '',
        photoUrl: formData.photoUrl,
        password: isSysAdmin ? (formData.password?.trim() || '123456') : '123456',
      };
      onAddMember(newMem);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-serif-masonic text-xl font-bold text-amber-200">
              Cadastro e Quadro de Obreiros
            </h2>
            <span className="text-xs font-mono font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full shadow-sm">
              {members.length} {members.length === 1 ? 'obreiro cadastrado' : 'obreiros cadastrados'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestão estruturada de Irmãos: dados de identificação, CIM, Grau e Status Regimental.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-stretch sm:self-auto">
          {isSysAdmin ? (
            <>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/?cadastro=true`;
                  navigator.clipboard.writeText(url);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 3000);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center space-x-2 transition shadow-md"
                title="Copiar link oficial do formulário de inscrição"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
              </button>

              <button
                onClick={() => {
                  const url = `${window.location.origin}/?cadastro=true`;
                  const text = encodeURIComponent(
                    `🏛️ *A∴R∴L∴S Fraternidade da Franca N°3571 - Formulário de Inscrição e Cadastro de Obreiros*\n\nMeus Queridos Irmãos, favor preencher seus dados cadastrais e anexar sua fotografia oficial no link oficial abaixo:\n\n🔗 ${url}`
                  );
                  window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                }}
                className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center space-x-2 transition shadow-md shadow-emerald-950/30"
                title="Compartilhar link do formulário no grupo do WhatsApp da Loja"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>Compartilhar Link (WhatsApp)</span>
              </button>

              <button
                onClick={() => setIsPublicRegistrationModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-lg flex items-center space-x-2 transition shadow-md shadow-amber-500/20"
                title="Abrir o Formulário Oficial de Inscrição e Cadastro de Obreiros"
              >
                <UserPlus className="w-4 h-4 text-slate-950" />
                <span>Formulário de Inscrição de Obreiro</span>
              </button>
            </>
          ) : null}

          <button
            onClick={handleOpenAddModal}
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold text-xs px-3.5 py-2.5 rounded-lg flex items-center space-x-2 transition"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Cadastrar Obreiro</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/80 border border-slate-800 p-3 rounded-xl text-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por Nome, CIM ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>

        <div>
          <select
            value={degreeFilter}
            onChange={(e) => setDegreeFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/60"
          >
            <option value="ALL">Todos os Graus</option>
            <option value="Aprendiz">Aprendiz (1º Grau)</option>
            <option value="Companheiro">Companheiro (2º Grau)</option>
            <option value="Mestre">Mestre (3º Grau)</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500/60"
          >
            <option value="ALL">Todos os Status</option>
            <option value="Regular">Regular</option>
            <option value="Remido">Remido</option>
            <option value="Emérito">Emérito</option>
            <option value="Licenciado">Licenciado</option>
            <option value="Placet">Placet (Adormecido)</option>
          </select>
        </div>
      </div>

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((m) => {
          const attStats = calculateMemberAttendance(m, sessions, attendances, justifications);

          return (
            <div
              key={m.id}
              onClick={() => setSelectedMember(m)}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 transition cursor-pointer relative group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <img
                      src={getMemberPhotoUrl(m.photoUrl)}
                      alt={m.fullName}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-700 group-hover:ring-amber-500/50 transition"
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100 group-hover:text-amber-300 transition line-clamp-1">
                        {m.fullName}
                      </h3>
                      <p className="text-[11px] text-amber-400/90 font-mono">
                        CIM: {m.cim}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => handleOpenEditModal(m, e)}
                      className="text-slate-500 hover:text-amber-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                      title="Editar Obreiro"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {isSysAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMemberToDelete(m);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/40 transition"
                        title="Excluir Obreiro (Exclusivo Administrador 193245)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Badges: Degree & Status */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                  {/* Degree Badge */}
                  <span
                    className={`px-2 py-0.5 rounded border ${
                      m.degree === 'Mestre'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                        : m.degree === 'Companheiro'
                        ? 'bg-blue-950/80 text-blue-300 border-blue-700/60'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                    }`}
                  >
                    {m.degree} (Grau {m.degreeLevel})
                  </span>

                  {/* Status Badge */}
                  <span
                    className={`px-2 py-0.5 rounded border ${
                      m.status === 'Regular'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : m.status === 'Licenciado'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                    }`}
                  >
                    {m.status}
                  </span>

                  {m.currentOfficerRole && (
                    <span
                      className={`px-2 py-0.5 rounded border text-[11px] font-semibold flex items-center space-x-1 ${
                        ADMIN_OFFICER_ROLES.includes(m.currentOfficerRole)
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {ADMIN_OFFICER_ROLES.includes(m.currentOfficerRole) && (
                        <Sparkles className="w-3 h-3 text-amber-400 shrink-0 inline mr-1" />
                      )}
                      <span>{m.currentOfficerRole}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Frequency Bar */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Frequência Regimental:</span>
                <span
                  className={`font-bold font-mono ${
                    attStats.percentage >= 75
                      ? 'text-emerald-400'
                      : attStats.percentage >= 60
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {attStats.percentage}% ({attStats.totalAttended}/{attStats.totalEligible})
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Member Profile Drawer / Detailed Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full my-auto text-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-900/95">
              <h3 className="font-serif-masonic text-base sm:text-lg font-bold text-amber-200">
                Prancha Cadastral do Obreiro
              </h3>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 overscroll-contain">
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 border-b border-slate-800 pb-5 text-center sm:text-left">
                <img
                  src={getMemberPhotoUrl(selectedMember.photoUrl)}
                  alt={selectedMember.fullName}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-amber-500/60 bg-slate-900 shrink-0"
                />
                <div>
                  <h3 className="font-serif-masonic text-lg sm:text-xl font-bold text-amber-200">
                    {selectedMember.fullName}
                  </h3>
                  <p className="text-xs text-slate-400 flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                    <span>CIM: <strong className="text-slate-200">{selectedMember.cim}</strong></span>
                    <span>•</span>
                    <span>CPF: <strong className="text-slate-200">{selectedMember.cpf}</strong></span>
                    {selectedMember.joinedDate && (
                      <>
                        <span>•</span>
                        <span>Membro Desde: <strong className="text-amber-300">{selectedMember.joinedDate.split('-').reverse().join('/')}</strong></span>
                      </>
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-2 text-xs">
                    <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2.5 py-0.5 rounded font-medium">
                      {selectedMember.degree} (Grau {selectedMember.degreeLevel})
                    </span>
                    <span className="bg-slate-800 text-slate-200 px-2.5 py-0.5 rounded border border-slate-700">
                      Status: {selectedMember.status}
                    </span>
                    {selectedMember.currentOfficerRole && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded">
                        Cargo: {selectedMember.currentOfficerRole}
                      </span>
                    )}
                  </div>
                </div>
              </div>

            {/* Attendance & Frequency Summary */}
            {(() => {
              const attStats = calculateMemberAttendance(selectedMember, sessions, attendances, justifications);
              const memberAttendances = attendances.filter((a) => a.memberId === selectedMember.id);

              return (
                <div className="py-5 space-y-5">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Sessões Elegíveis</span>
                      <p className="text-xl font-bold text-slate-100">{attStats.totalEligible}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Presenças</span>
                      <p className="text-xl font-bold text-emerald-400">{attStats.totalAttended}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Justificadas</span>
                      <p className="text-xl font-bold text-amber-400">{attStats.totalJustified}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Assiduidade %</span>
                      <p className="text-xl font-bold text-amber-300">{attStats.percentage}%</p>
                    </div>
                  </div>

                  {/* Attendance History */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                      Histórico de Chamadas do Irmão
                    </h4>

                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {sessions.map((s) => {
                        const attended = memberAttendances.find((a) => a.sessionId === s.id);
                        const justified = justifications.find(
                          (j) => j.sessionId === s.id && j.memberId === selectedMember.id && j.status === 'Aprovado'
                        );

                        return (
                          <div
                            key={s.id}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
                          >
                            <div>
                              <p className="font-medium text-slate-200">{s.title}</p>
                              <p className="text-[10px] text-slate-400">
                                {s.date.split('-').reverse().join('/')} • Grau {s.degree}
                              </p>
                            </div>

                            <div>
                              {attended ? (
                                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono">
                                  PRESENTE ({attended.method})
                                </span>
                              ) : justified ? (
                                <span className="bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded text-[10px] font-mono">
                                  JUSTIFICADO
                                </span>
                              ) : (
                                <span className="bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded text-[10px] font-mono">
                                  AUSENTE
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Certificate Export & Admin Delete Button */}
                  <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    {isSysAdmin ? (
                      <button
                        onClick={() => {
                          const target = selectedMember;
                          setSelectedMember(null);
                          setMemberToDelete(target);
                        }}
                        className="bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/80 font-semibold text-xs px-3.5 py-2 rounded-lg flex items-center space-x-1.5 transition"
                        title="Excluir Obreiro (Exclusivo Administrador 193245)"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <span>Excluir Obreiro</span>
                      </button>
                    ) : <div />}

                    <button
                      onClick={() => {
                        const lastSession = sessions[0];
                        if (lastSession) {
                          generateAttendanceCertificatePDF(selectedMember, lastSession, 'Placet de Frequência');
                        }
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs px-4 py-2 rounded-lg flex items-center space-x-2 transition"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Emitir Placet de Frequência (PDF)</span>
                    </button>
                  </div>
                </div>
              );
            })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Member Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full text-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto">
            {/* Pinned Header */}
            <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-900/95 z-10">
              <h3 className="font-serif-masonic text-base sm:text-lg font-bold text-amber-200">
                {editingMember ? 'Editar Obreiro' : 'Cadastrar Novo Obreiro'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form with Scrollable Body and Pinned Footer */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-4 text-xs overscroll-contain">
                {formError && (
                  <div className="bg-rose-950/80 border border-rose-800 text-rose-300 text-xs p-3 rounded-xl flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Nome Completo * <span className="text-[10px] text-amber-400 font-normal">(EM MAIÚSCULO)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName || ''}
                    onChange={(e) => setFormData({ ...formData, fullName: formatFullName(e.target.value) })}
                    placeholder="JOAQUIM SILVA DE OLIVEIRA"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 uppercase font-semibold tracking-wide"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">CIM (Nº Maçônico) *</label>
                    <input
                      type="text"
                      required
                      value={formData.cim || ''}
                      onChange={(e) => setFormData({ ...formData, cim: formatCIM(e.target.value) })}
                      placeholder="184920"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">CPF</label>
                    <input
                      type="text"
                      maxLength={14}
                      value={formData.cpf || ''}
                      onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Grau Atual</label>
                    <select
                      value={formData.degree || 'Aprendiz'}
                      onChange={(e) => {
                        const deg = e.target.value as MasonicDegree;
                        setFormData({
                          ...formData,
                          degree: deg,
                          degreeLevel: deg === 'Mestre' ? 3 : deg === 'Companheiro' ? 2 : 1,
                          currentOfficerRole: deg === 'Mestre' ? formData.currentOfficerRole : undefined,
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Aprendiz">Aprendiz (1º)</option>
                      <option value="Companheiro">Companheiro (2º)</option>
                      <option value="Mestre">Mestre (3º)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Status do Obreiro</label>
                    <select
                      value={formData.status || 'Regular'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as MemberStatus })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="Regular">Regular</option>
                      <option value="Remido">Remido</option>
                      <option value="Emérito">Emérito</option>
                      <option value="Licenciado">Licenciado</option>
                      <option value="Placet">Placet (Adormecido)</option>
                    </select>
                  </div>
                </div>

                {!isSysAdmin && (
                  <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-lg text-[11px] text-slate-400 leading-relaxed flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-amber-300">Regimento Maçônico:</strong> Não existe "ex-maçom". Obreiros não podem ser apagados do sistema, apenas ter seu status modificado (ex: Placet, Licenciado, Remido, Emérito). A exclusão técnica de cadastros é prerrogativa exclusiva da Administração Geral.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">E-mail</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase().trim() })}
                      placeholder="obreiro@loja.org.br"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 lowercase"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      maxLength={15}
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                      placeholder="(16) 99999-9999"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Membro Desde (Iniciação)</label>
                  <input
                    type="date"
                    value={formData.joinedDate || ''}
                    onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Cargo na Loja (Opcional)</label>
                  {formData.degree !== 'Mestre' ? (
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-400">
                      Cargos em Loja e permissões de gestão/QR Code são privativos a Mestres Maçons (3º Grau).
                    </div>
                  ) : (
                    <select
                      value={formData.currentOfficerRole || ''}
                      onChange={(e) => setFormData({ ...formData, currentOfficerRole: (e.target.value as LodgeOfficerRole) || undefined })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Nenhum / Obreiro do Quadro</option>
                      <option value="Venerável Mestre">Venerável Mestre</option>
                      <option value="1º Vigilante">1º Vigilante</option>
                      <option value="2º Vigilante">2º Vigilante</option>
                      <option value="Orador">Orador</option>
                      <option value="Secretário">Secretário</option>
                      <option value="Tesoureiro">Tesoureiro</option>
                      <option value="Chanceler">Chanceler</option>
                      <option value="1º Diácono">1º Diácono</option>
                      <option value="2º Diácono">2º Diácono</option>
                      <option value="Mestre de Cerimônias">Mestre de Cerimônias</option>
                      <option value="Guarda do Templo">Guarda do Templo</option>
                      <option value="Hospedeiro">Hospedeiro</option>
                      <option value="Bibliotecário">Bibliotecário</option>
                      <option value="Mestre de Harmonia">Mestre de Harmonia</option>
                    </select>
                  )}

                  {/* Dynamic Officer Role Permissions Card */}
                  {formData.degree === 'Mestre' && formData.currentOfficerRole && (
                    <div className={`mt-2.5 rounded-xl p-3.5 border space-y-2 text-xs transition ${
                      ADMIN_OFFICER_ROLES.includes(formData.currentOfficerRole)
                        ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}>
                      <div className="flex items-center space-x-2 font-bold text-xs">
                        <ShieldCheck className={`w-4 h-4 ${ADMIN_OFFICER_ROLES.includes(formData.currentOfficerRole) ? 'text-amber-400' : 'text-slate-400'}`} />
                        <span>
                          {ADMIN_OFFICER_ROLES.includes(formData.currentOfficerRole)
                            ? `Permissões de Gestão Herdados: ${formData.currentOfficerRole}`
                            : `Cargo Regimental: ${formData.currentOfficerRole}`}
                        </span>
                      </div>

                      {ADMIN_OFFICER_ROLES.includes(formData.currentOfficerRole) ? (
                        <div className="space-y-1.5 text-[11px] leading-relaxed pt-1">
                          <p className="text-amber-300 font-semibold">
                            {OFFICER_PERMISSIONS_MAP[formData.currentOfficerRole]?.description}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-emerald-300 font-medium">
                            <span className="flex items-center space-x-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>Abertura / Início de Novas Sessões</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <QrCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Projeção de QR Code e Token no Templo</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>Chamada Manual e Registro de Visitantes</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>Abonos e Aprovação de Justificativas</span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Responsabilidades ritualísticas no Templo durante os Trabalhos. Acesso a sessões e atas vinculado ao Grau Maçônico ({formData.degree || 'Aprendiz'}).
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Foto do Obreiro */}
                <div className={`bg-slate-950/80 border rounded-xl p-3.5 space-y-2.5 transition ${
                  formData.photoUrl && formData.photoUrl !== DEFAULT_NEUTRAL_AVATAR
                    ? 'border-emerald-700/60 bg-emerald-950/20'
                    : formError && !formData.photoUrl
                    ? 'border-rose-500/80 bg-rose-950/20 ring-1 ring-rose-500/40'
                    : 'border-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-semibold text-xs flex items-center space-x-1.5">
                      <span>Fotografia Oficial do Obreiro</span>
                      <span className="text-[10px] font-bold text-rose-400 bg-rose-950 border border-rose-800/80 px-1.5 py-0.2 rounded uppercase font-mono">
                        * Obrigatória
                      </span>
                    </label>
                    {formData.photoUrl && formData.photoUrl !== DEFAULT_NEUTRAL_AVATAR ? (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span>Foto anexada</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-normal">
                        Rosto com terno/gravata
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <img
                      src={getMemberPhotoUrl(formData.photoUrl)}
                      alt="Foto do Obreiro"
                      className={`w-14 h-14 rounded-full object-cover bg-slate-900 shrink-0 ${
                        formData.photoUrl && formData.photoUrl !== DEFAULT_NEUTRAL_AVATAR
                          ? 'ring-2 ring-emerald-400'
                          : 'ring-2 ring-amber-500/60 border border-dashed border-amber-400/80'
                      }`}
                    />

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <label className={`cursor-pointer text-[11px] font-semibold px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 shadow-sm active:scale-95 ${
                          formData.photoUrl && formData.photoUrl !== DEFAULT_NEUTRAL_AVATAR
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                        }`}>
                          {formData.photoUrl && formData.photoUrl !== DEFAULT_NEUTRAL_AVATAR ? (
                            <>
                              <Camera className="w-3.5 h-3.5 text-slate-300" />
                              <span>Alterar Foto</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5 text-slate-950" />
                              <span>Carregar do Dispositivo *</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const compressed = await compressImageFile(file, 256, 0.75);
                                if (compressed) {
                                  setFormData({ ...formData, photoUrl: compressed });
                                }
                              }
                            }}
                          />
                        </label>

                        {formData.photoUrl && formData.photoUrl !== DEFAULT_NEUTRAL_AVATAR && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, photoUrl: '' })}
                            className="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-[11px] px-2.5 py-1.5 rounded-lg transition flex items-center space-x-1"
                            title="Remover foto"
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                            <span>Remover</span>
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={formData.photoUrl || ''}
                        onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                        placeholder="Ou cole a URL da imagem (https://...)"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {isSysAdmin && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-300 font-medium">
                        Senha de Acesso do Obreiro
                      </label>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded flex items-center space-x-1">
                        <Lock className="w-3 h-3 text-amber-400" />
                        <span>Visível somente ao Administrador 193245</span>
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showPasswordInModal ? 'text' : 'password'}
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Senha de acesso ao portal (Padrão: 123456)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 pr-10 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                        title={showPasswordInModal ? 'Ocultar senha' : 'Exibir senha'}
                      >
                        {showPasswordInModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Pinned Action Buttons Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-800 shrink-0 bg-slate-900/95 flex items-center justify-between space-x-3 z-10">
                {isSysAdmin && editingMember ? (
                  <button
                    type="button"
                    onClick={() => {
                      const target = editingMember;
                      setIsModalOpen(false);
                      setMemberToDelete(target);
                    }}
                    className="bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/80 font-semibold px-3.5 py-2 rounded-lg flex items-center space-x-1.5 transition text-xs"
                    title="Excluir Obreiro (Exclusivo Administrador 193245)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Excluir</span>
                  </button>
                ) : <div />}

                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-4 py-2 rounded-lg text-xs transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2 rounded-lg shadow-md shadow-amber-500/20 text-xs transition flex items-center space-x-1.5"
                  >
                    <span>Salvar Obreiro</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Permanent Member Deletion (Exclusive to Admin 193245) */}
      {memberToDelete && isSysAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="bg-slate-900 border border-rose-800/80 rounded-2xl max-w-md w-full my-auto text-slate-200 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center space-x-3 text-rose-400 border-b border-slate-800 p-4 sm:p-5 bg-rose-950/50 shrink-0">
              <div className="p-2 bg-rose-950/80 border border-rose-700/60 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif-masonic text-base font-bold text-slate-100 truncate">
                  Exclusão Definitiva de Obreiro
                </h3>
                <p className="text-[10px] text-amber-400 font-mono">
                  Prerrogativa exclusiva do Administrador 193245
                </p>
              </div>
              <button
                onClick={() => setMemberToDelete(null)}
                className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 sm:p-6 space-y-3 text-xs overflow-y-auto flex-1 overscroll-contain">
              <p className="text-slate-300">
                Você está prestes a excluir permanentemente o cadastro do irmão:
              </p>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center space-x-3">
                <img
                  src={getMemberPhotoUrl(memberToDelete.photoUrl)}
                  alt={memberToDelete.fullName}
                  className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-100 truncate">{memberToDelete.fullName}</h4>
                  <p className="text-[11px] text-amber-400/90 font-mono truncate">
                    CIM: {memberToDelete.cim} • Grau: {memberToDelete.degree}
                  </p>
                </div>
              </div>
              <p className="text-rose-300/90 text-[11px] leading-relaxed bg-rose-950/30 p-2.5 rounded-lg border border-rose-900/50">
                ⚠️ Esta ação removerá o obreiro de forma definitiva do banco de dados na nuvem, juntamente com seus registros de chamadas e justificativas vinculadas.
              </p>
            </div>

            {/* Pinned Footer Actions */}
            <div className="p-3.5 sm:p-4 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-4 py-2.5 rounded-xl text-xs transition active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteMember && memberToDelete) {
                    onDeleteMember(memberToDelete.id);
                  }
                  setMemberToDelete(null);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-rose-900/40 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Excluir Obreiro</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Active Official Self-Registration Modal with Photo Capture */}
      <PublicMemberRegistrationModal
        isOpen={isPublicRegistrationModalOpen}
        onClose={() => setIsPublicRegistrationModalOpen(false)}
        onAddMember={onAddMember}
      />
    </div>
  );
};
