import React, { useState, useEffect } from 'react';
import {
  Member,
  WifeData,
  ChildData,
  MasonicDegree,
  LodgeOfficerRole,
  MemberStatus,
} from '../../types/masonic';
import { calculateYearsPassed, getWeddingBodaName } from '../../utils/masonicCalendarUtils';
import { isLodgeAdmin } from '../../utils/authUtils';
import {
  X,
  User,
  Heart,
  Users,
  Award,
  Search,
  Plus,
  Trash2,
  Calendar,
  CheckCircle,
  AlertCircle,
  Shield,
  Lock,
} from 'lucide-react';
import { getMemberPhotoUrl } from '../../utils/avatarUtils';

interface CalendarFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currentUser: Member;
  onSaveMember: (updatedMember: Member) => void;
  initialMember?: Member | null;
}

export const CalendarFormModal: React.FC<CalendarFormModalProps> = ({
  isOpen,
  onClose,
  members,
  currentUser,
  onSaveMember,
  initialMember,
}) => {
  const isAdmin = isLodgeAdmin(currentUser);

  const [cimInput, setCimInput] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Form states
  const [birthDate, setBirthDate] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [degree, setDegree] = useState<MasonicDegree>('Mestre');
  const [officerRole, setOfficerRole] = useState<LodgeOfficerRole | ''>('');
  const [status, setStatus] = useState<MemberStatus>('Regular');

  // Datas Maçônicas
  const [initiationDate, setInitiationDate] = useState<string>('');
  const [elevationDate, setElevationDate] = useState<string>('');
  const [exaltationDate, setExaltationDate] = useState<string>('');
  const [installationDate, setInstallationDate] = useState<string>('');
  const [philosophicalDegree, setPhilosophicalDegree] = useState<number>(3);
  const [notes, setNotes] = useState<string>('');

  // Esposa / Cunhada
  const [wifeName, setWifeName] = useState<string>('');
  const [wifeBirthDate, setWifeBirthDate] = useState<string>('');
  const [wifePhone, setWifePhone] = useState<string>('');
  const [marriageDate, setMarriageDate] = useState<string>('');

  // Filhos / Sobrinhos
  const [children, setChildren] = useState<ChildData[]>([]);

  // Novo filho temp
  const [newChildName, setNewChildName] = useState<string>('');
  const [newChildBirthDate, setNewChildBirthDate] = useState<string>('');
  const [newChildPhone, setNewChildPhone] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'irmao' | 'maconico' | 'cunhada' | 'sobrinhos'>('irmao');
  const [notification, setNotification] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inicialização e regras de acesso
  useEffect(() => {
    if (!isOpen) return;

    setNotification(null);
    setErrorMessage(null);

    if (isAdmin) {
      // Usuário gestor (Admin, Venerável, Chanceler, Secretário)
      if (initialMember) {
        loadMemberData(initialMember);
      } else {
        resetForm();
      }
    } else {
      // Demais Obreiros: abre DIRETAMENTE os dados do próprio usuário logado
      const selfInList =
        members.find(
          (m) =>
            m.id === currentUser.id ||
            (m.cim && currentUser.cim && String(m.cim).trim() === String(currentUser.cim).trim())
        ) || currentUser;

      loadMemberData(selfInList);
    }
  }, [initialMember, isOpen, currentUser, isAdmin, members]);

  const resetForm = () => {
    setSelectedMember(null);
    setCimInput('');
    setBirthDate('');
    setPhone('');
    setDegree('Mestre');
    setOfficerRole('');
    setStatus('Regular');
    setInitiationDate('');
    setElevationDate('');
    setExaltationDate('');
    setInstallationDate('');
    setPhilosophicalDegree(3);
    setNotes('');
    setWifeName('');
    setWifeBirthDate('');
    setWifePhone('');
    setMarriageDate('');
    setChildren([]);
    setNewChildName('');
    setNewChildBirthDate('');
    setNewChildPhone('');
    setActiveTab('irmao');
  };

  const loadMemberData = (member: Member) => {
    setSelectedMember(member);
    setCimInput(member.cim || '');
    setBirthDate(member.birthDate || '');
    setPhone(member.phone || '');
    setDegree(member.degree || 'Mestre');
    setOfficerRole(member.currentOfficerRole || '');
    setStatus(member.status || 'Regular');
    setInitiationDate(member.initiationDate || member.joinedDate || '');
    setElevationDate(member.elevationDate || '');
    setExaltationDate(member.exaltationDate || '');
    setInstallationDate(member.installationDate || '');
    setPhilosophicalDegree(member.philosophicalDegree || (member.degree === 'Mestre' ? 3 : 1));
    setNotes(member.notes || '');

    // Esposa
    if (member.wife) {
      setWifeName(member.wife.name || '');
      setWifeBirthDate(member.wife.birthDate || '');
      setWifePhone(member.wife.phone || '');
      setMarriageDate(member.wife.marriageDate || '');
    } else {
      setWifeName('');
      setWifeBirthDate('');
      setWifePhone('');
      setMarriageDate('');
    }

    // Filhos
    setChildren(member.children ? [...member.children] : []);
  };

  // Buscar membro por CIM digitado manualmente (Apenas para Gestores)
  const handleCimSearch = (cimValue: string) => {
    if (!isAdmin) return;

    setCimInput(cimValue);
    setNotification(null);
    setErrorMessage(null);

    const cleanCim = cimValue.trim();
    if (!cleanCim) {
      setSelectedMember(null);
      return;
    }

    const found = members.find((m) => String(m.cim || '').trim() === cleanCim);
    if (found) {
      loadMemberData(found);
      setNotification(`Irmão ${found.fullName} (CIM ${found.cim}) localizado com sucesso!`);
    } else {
      setSelectedMember(null);
      setErrorMessage(`Nenhum Irmão encontrado no quadro com o CIM "${cleanCim}".`);
    }
  };

  // Adicionar filho à lista
  const handleAddChild = () => {
    if (!newChildName.trim() || !newChildBirthDate) {
      alert('Informe ao menos o nome e a data de nascimento do(a) filho(a).');
      return;
    }

    const newChild: ChildData = {
      id: `child-${Date.now()}`,
      name: newChildName.trim(),
      birthDate: newChildBirthDate,
      phone: newChildPhone.trim() || undefined,
      motherName: wifeName || undefined,
    };

    setChildren([...children, newChild]);
    setNewChildName('');
    setNewChildBirthDate('');
    setNewChildPhone('');
  };

  // Remover filho da lista
  const handleRemoveChild = (id: string) => {
    setChildren(children.filter((c) => c.id !== id));
  };

  // Salvar tudo com validação estrita de permissões
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      alert('Nenhum Irmão carregado para salvar.');
      return;
    }

    // Validação de segurança: se não for gestor, só pode salvar o próprio perfil
    if (!isAdmin) {
      const isSelf =
        String(selectedMember.cim || '').trim() === String(currentUser.cim || '').trim() ||
        selectedMember.id === currentUser.id;

      if (!isSelf) {
        alert(
          `Acesso Negado: Você só possui permissão para editar os dados referentes ao seu próprio CIM (${currentUser.cim}).`
        );
        return;
      }
    }

    const updatedWife: WifeData | undefined = wifeName.trim()
      ? {
          name: wifeName.trim(),
          birthDate: wifeBirthDate || undefined,
          phone: wifePhone.trim() || undefined,
          marriageDate: marriageDate || undefined,
        }
      : undefined;

    const updatedMember: Member = {
      ...selectedMember,
      birthDate: birthDate || undefined,
      phone: phone || selectedMember.phone,
      degree: degree,
      currentOfficerRole: officerRole ? (officerRole as LodgeOfficerRole) : null,
      status: status,
      initiationDate: initiationDate || undefined,
      elevationDate: elevationDate || undefined,
      exaltationDate: exaltationDate || undefined,
      installationDate: installationDate || undefined,
      philosophicalDegree: philosophicalDegree || undefined,
      notes: notes || undefined,
      wife: updatedWife,
      children: children.length > 0 ? children : undefined,
    };

    onSaveMember(updatedMember);
    onClose();
  };

  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const calculatedAge = calculateYearsPassed(birthDate, currentYear);
  const calculatedMasonicYears = calculateYearsPassed(initiationDate, currentYear);
  const calculatedMarriageYears = calculateYearsPassed(marriageDate, currentYear);
  const calculatedBoda = calculatedMarriageYears !== undefined ? getWeddingBodaName(calculatedMarriageYears) : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm overflow-y-auto overscroll-contain p-2 sm:p-4">
      <div className="min-h-full flex flex-col items-center justify-start sm:justify-center py-2 sm:py-4">
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header do Modal */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-slate-900 via-slate-850 to-amber-950/40 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif-masonic text-amber-200 text-base sm:text-lg font-bold truncate">
                {isAdmin
                  ? 'Cadastro e Vínculo de Datas dos Obreiros'
                  : 'Meus Dados & Datas Comemorativas Familiares'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                {isAdmin
                  ? 'Pesquise por CIM ou selecione um obreiro para gerenciar datas e registros familiares.'
                  : `Gerencie suas datas de aniversário, marcos maçônicos, bodas e filhos (CIM: ${currentUser.cim || 'Obreiro'}).`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificação Temporária de Busca */}
        {notification && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-4 sm:px-6 py-2 flex items-center space-x-2 text-emerald-300 text-xs shrink-0">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Notificação de Erro / Restrição de Permissão */}
        {errorMessage && (
          <div className="bg-rose-500/20 border-b border-rose-500/40 px-4 sm:px-6 py-2.5 flex items-start space-x-2 text-rose-300 text-xs shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Corpo Scrollável do Formulário */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Seção Exclusiva para Gestores (Admin, Venerável, Chanceler, Secretário): Busca por CIM & Dropdown de Obreiros */}
          {isAdmin && (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
                    Buscar por C.I.M. do Irmão
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Digite a CIM do Irmão (Ex: 521257)..."
                      value={cimInput}
                      onChange={(e) => handleCimSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono text-sm rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-amber-500"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Dropdown de Obreiros exclusivo para Gestores */}
                <div className="sm:w-72">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Ou selecione da lista de obreiros
                  </label>
                  <select
                    value={selectedMember?.id || ''}
                    onChange={(e) => {
                      const m = members.find((item) => item.id === e.target.value);
                      if (m) {
                        loadMemberData(m);
                        setNotification(`Irmão ${m.fullName} (CIM ${m.cim}) carregado!`);
                        setErrorMessage(null);
                      } else {
                        resetForm();
                      }
                    }}
                    className="w-full bg-slate-900 border border-amber-500/50 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400"
                  >
                    <option value="">-- Selecione um Irmão da Loja --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        [CIM {m.cim || 'S/N'}] {m.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Aviso de Gestão */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900/60 rounded-lg border border-slate-800/80 text-[11px]">
                <div className="flex items-center space-x-2">
                  <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-slate-300">
                    <strong className="text-amber-300">Acesso de Gestão ({currentUser.currentOfficerRole || 'Admin'})</strong>:
                    Você tem autorização para consultar e editar dados e datas de todos os Irmãos do Quadro.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card Resumo do Irmão Selecionado */}
          {selectedMember ? (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border-2 border-amber-500/40 overflow-hidden shrink-0 shadow">
                  <img
                    src={getMemberPhotoUrl(selectedMember.photoUrl)}
                    alt={selectedMember.fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="font-serif-masonic text-amber-200 font-bold text-sm sm:text-base truncate">
                    {selectedMember.fullName}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    CIM: <span className="text-amber-300 font-mono font-bold">{selectedMember.cim || 'S/N'}</span> • Grau:{' '}
                    <span className="text-slate-300">{selectedMember.degree}</span> • Status:{' '}
                    <span className="text-emerald-400 font-medium">{selectedMember.status}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {calculatedAge !== undefined && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    🎂 {calculatedAge} anos de idade
                  </span>
                )}
                {calculatedMasonicYears !== undefined && calculatedMasonicYears > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    ⚜️ {calculatedMasonicYears} anos de Maçonaria
                  </span>
                )}
              </div>
            </div>
          ) : (
            isAdmin && (
              <div className="p-8 rounded-xl bg-slate-950/40 border border-dashed border-slate-800 text-center space-y-1.5">
                <Search className="w-7 h-7 text-slate-500 mx-auto mb-1" />
                <p className="text-sm text-slate-300 font-medium">Selecione ou busque um Irmão</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Utilize o seletor acima ou digite o número da C.I.M. para carregar a ficha e editar as datas.
                </p>
              </div>
            )
          )}

          {/* Abas e Campos de Edição - Exibidos quando o membro está carregado */}
          {selectedMember && (
            <>
              {/* Abas de Navegação com Rolagem Horizontal Suave */}
              <div className="border-b border-slate-800 pb-1">
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
                  <button
                    type="button"
                    onClick={() => setActiveTab('irmao')}
                    className={`py-2 px-3 sm:px-4 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
                      activeTab === 'irmao'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Dados do Irmão & Natalício</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('maconico')}
                    className={`py-2 px-3 sm:px-4 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
                      activeTab === 'maconico'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Datas Maçônicas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('cunhada')}
                    className={`py-2 px-3 sm:px-4 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
                      activeTab === 'cunhada'
                        ? 'bg-pink-500/20 text-pink-300 border border-pink-500/50 shadow'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>Cunhada & Bodas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('sobrinhos')}
                    className={`py-2 px-3 sm:px-4 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap flex items-center space-x-1.5 ${
                      activeTab === 'sobrinhos'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Sobrinhos ({children.length})</span>
                  </button>
                </div>
              </div>

              {/* CONTEÚDO DA ABA 1: DADOS DO IRMÃO */}
              {activeTab === 'irmao' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Data de Nascimento do Irmão (Natalício) *
                      </label>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                      />
                      {calculatedAge !== undefined && (
                        <p className="text-xs text-amber-400 mt-1">
                          🎂 Idade que completará no ano: <strong>{calculatedAge} anos</strong>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Telefone / WhatsApp (Para Felicitações Automáticas)
                      </label>
                      <input
                        type="text"
                        placeholder="(16) 99999-9999"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Grau Simbólico Atual</label>
                      <select
                        value={degree}
                        onChange={(e) => setDegree(e.target.value as MasonicDegree)}
                        disabled={!isAdmin}
                        className={`w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 ${
                          !isAdmin ? 'opacity-80 cursor-not-allowed bg-slate-900/50' : ''
                        }`}
                      >
                        <option value="Aprendiz">Grau 1 - Aprendiz Maçom</option>
                        <option value="Companheiro">Grau 2 - Companheiro Maçom</option>
                        <option value="Mestre">Grau 3 - Mestre Maçom</option>
                      </select>
                      {!isAdmin && (
                        <span className="text-[10px] text-slate-500 mt-0.5 block">
                          Alteração de grau simbólico restrita à administração da Loja.
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Cargo Oficial na Loja</label>
                      <select
                        value={officerRole}
                        onChange={(e) => setOfficerRole(e.target.value as LodgeOfficerRole | '')}
                        disabled={!isAdmin}
                        className={`w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 ${
                          !isAdmin ? 'opacity-80 cursor-not-allowed bg-slate-900/50' : ''
                        }`}
                      >
                        <option value="">Nenhum cargo no momento (Obreiro)</option>
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
                        <option value="Mestre de Banquetes">Mestre de Banquetes</option>
                        <option value="Arquiteto">Arquiteto</option>
                        <option value="Porta-Estandarte">Porta-Estandarte</option>
                        <option value="Porta-Espada">Porta-Espada</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Status no Quadro</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as MemberStatus)}
                        disabled={!isAdmin}
                        className={`w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 ${
                          !isAdmin ? 'opacity-80 cursor-not-allowed bg-slate-900/50' : ''
                        }`}
                      >
                        <option value="Regular">Regular</option>
                        <option value="Irregular">Irregular</option>
                        <option value="Emérito">Emérito</option>
                        <option value="Remido">Remido</option>
                        <option value="Placet">Placet</option>
                        <option value="Falecido">Falecido</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Grau Filosófico (REAA)</label>
                      <input
                        type="number"
                        min={1}
                        max={33}
                        value={philosophicalDegree}
                        onChange={(e) => setPhilosophicalDegree(parseInt(e.target.value, 10) || 3)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CONTEÚDO DA ABA 2: DATAS MAÇÔNICAS */}
              {activeTab === 'maconico' && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200">
                    💡 As datas maçônicas são utilizadas para calcular os jubileus de Iniciação, Elevação, Exaltação e Instalação no calendário.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Data de Iniciação (Grau 1 - Aprendiz)
                      </label>
                      <input
                        type="date"
                        value={initiationDate}
                        onChange={(e) => setInitiationDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Data de Elevação (Grau 2 - Companheiro)
                      </label>
                      <input
                        type="date"
                        value={elevationDate}
                        onChange={(e) => setElevationDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Data de Exaltação (Grau 3 - Mestre Maçom)
                      </label>
                      <input
                        type="date"
                        value={exaltationDate}
                        onChange={(e) => setExaltationDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Data de Instalação (Mestre Instalado - Opcional)
                      </label>
                      <input
                        type="date"
                        value={installationDate}
                        onChange={(e) => setInstallationDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Observações Maçônicas / Títulos / Condecorações
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Título de Benemérito, Cruz da Perfeição Maçônica, etc."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl p-3 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* CONTEÚDO DA ABA 3: CUNHADA & BODAS */}
              {activeTab === 'cunhada' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Nome da Esposa / Cunhada</label>
                      <input
                        type="text"
                        placeholder="Nome completo da cunhada"
                        value={wifeName}
                        onChange={(e) => setWifeName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Data de Aniversário Natalício da Cunhada
                      </label>
                      <input
                        type="date"
                        value={wifeBirthDate}
                        onChange={(e) => setWifeBirthDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Telefone / WhatsApp da Cunhada (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="(16) 99999-9999"
                        value={wifePhone}
                        onChange={(e) => setWifePhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Data do Casamento (Bodas Matrimoniais)
                      </label>
                      <input
                        type="date"
                        value={marriageDate}
                        onChange={(e) => setMarriageDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-pink-500"
                      />
                      {calculatedMarriageYears !== undefined && (
                        <p className="text-xs text-pink-400 mt-1">
                          💍 Completará <strong>{calculatedMarriageYears} anos de união ({calculatedBoda})</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CONTEÚDO DA ABA 4: FILHOS / SOBRINHOS */}
              {activeTab === 'sobrinhos' && (
                <div className="space-y-4">
                  {/* Formulário para Inserir Novo Filho */}
                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                    <h4 className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Plus className="w-4 h-4" />
                      <span>Cadastrar Sobrinho(a) / Filho(a)</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Nome do(a) Filho(a) *</label>
                        <input
                          type="text"
                          placeholder="Ex: Pedro Henrique..."
                          value={newChildName}
                          onChange={(e) => setNewChildName(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Data de Nascimento *</label>
                        <input
                          type="date"
                          value={newChildBirthDate}
                          onChange={(e) => setNewChildBirthDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Telefone / WhatsApp (Opcional)</label>
                        <input
                          type="text"
                          placeholder="(16) 99999-9999"
                          value={newChildPhone}
                          onChange={(e) => setNewChildPhone(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddChild}
                        className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1 shadow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Filho(a)</span>
                      </button>
                    </div>
                  </div>

                  {/* Lista dos Filhos Cadastrados */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Filhos Cadastrados ({children.length})
                    </h4>

                    {children.length === 0 ? (
                      <div className="py-6 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                        Nenhum filho cadastrado para este Irmão. Adicione acima.
                      </div>
                    ) : (
                      children.map((c) => {
                        const childAge = calculateYearsPassed(c.birthDate, currentYear);
                        return (
                          <div
                            key={c.id}
                            className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2 flex-wrap">
                                <span className="font-semibold text-slate-200 text-sm truncate">{c.name}</span>
                                {childAge !== undefined && (
                                  <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold">
                                    {childAge} anos
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Nascimento: {c.birthDate} {c.phone ? `• Tel: ${c.phone}` : ''}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveChild(c.id)}
                              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors shrink-0"
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </form>

        {/* Footer Fixo do Modal com Botões de Ação */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-medium rounded-xl transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedMember}
            className={`px-5 sm:px-6 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-lg flex items-center space-x-1.5 ${
              selectedMember
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Salvar Dados & Vínculos</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);
};
