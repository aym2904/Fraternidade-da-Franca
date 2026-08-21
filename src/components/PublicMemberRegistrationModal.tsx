import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Camera,
  CheckCircle2,
  AlertCircle,
  Upload,
  Sparkles,
  ShieldCheck,
  Building2,
  Copy,
  Check,
  Share2,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import { Member, MasonicDegree, MemberStatus, LodgeOfficerRole } from '../types/masonic';
import { DEFAULT_NEUTRAL_AVATAR, getMemberPhotoUrl } from '../utils/avatarUtils';
import { compressImageFile } from '../utils/imageUtils';
import { formatFullName, cleanFullName, formatCIM, formatCPF, formatPhone, formatEmail } from '../utils/formatters';

interface PublicMemberRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (member: Member) => void;
  onSuccessLogin?: (member: Member) => void;
}

export const PublicMemberRegistrationModal: React.FC<PublicMemberRegistrationModalProps> = ({
  isOpen,
  onClose,
  onAddMember,
  onSuccessLogin,
}) => {
  const [formData, setFormData] = useState<Partial<Member>>({
    fullName: '',
    cpf: '',
    email: '',
    cim: '',
    degree: 'Aprendiz',
    degreeLevel: 1,
    status: 'Regular',
    currentOfficerRole: undefined,
    joinedDate: new Date().toISOString().split('T')[0],
    phone: '',
    password: '',
    photoUrl: '',
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredMember, setRegisteredMember] = useState<Member | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const getShareUrl = () => {
    try {
      return `${window.location.origin}/?cadastro=true`;
    } catch {
      return 'https://.../?cadastro=true';
    }
  };

  const handleCopyLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const url = getShareUrl();
    const text = encodeURIComponent(
      `🏛️ *A∴R∴L∴S Fraternidade da Franca N°3571 - Inscrição e Cadastro de Obreiros*\n\nMeus Queridos Irmãos, favor realizar o preenchimento dos dados cadastrais (incluindo fotografia oficial de rosto) no link abaixo para integração imediata ao quadro:\n\n🔗 ${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressedDataUrl = await compressImageFile(file, 256, 0.75);
      if (compressedDataUrl) {
        setFormData((prev) => ({ ...prev, photoUrl: compressedDataUrl }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const formattedFullName = cleanFullName(formData.fullName || '');
    const formattedCim = formatCIM(formData.cim || '');

    if (!formattedFullName || !formattedCim) {
      setErrorMessage('Por favor, preencha o Nome Completo e o CIM do Obreiro.');
      return;
    }

    if (!formData.photoUrl || formData.photoUrl === DEFAULT_NEUTRAL_AVATAR || !formData.photoUrl.trim()) {
      setErrorMessage('A fotografia oficial do Obreiro (rosto com traje maçônico / gravata) é obrigatória para efetivação do cadastro.');
      return;
    }

    const newMember: Member = {
      id: `mem-${Date.now()}`,
      fullName: formattedFullName,
      cpf: formData.cpf ? formatCPF(formData.cpf) : '',
      email: formData.email ? formatEmail(formData.email) : '',
      cim: formattedCim,
      degree: formData.degree || 'Aprendiz',
      degreeLevel: formData.degree === 'Mestre' ? 3 : formData.degree === 'Companheiro' ? 2 : 1,
      status: formData.status || 'Regular',
      currentOfficerRole: formData.currentOfficerRole || undefined,
      joinedDate: formData.joinedDate || new Date().toISOString().split('T')[0],
      phone: formData.phone ? formatPhone(formData.phone) : '',
      password: formData.password?.trim() || '123456',
      photoUrl: formData.photoUrl,
    };

    onAddMember(newMember);
    setRegisteredMember(newMember);
    setIsSuccess(true);
  };

  const handleReset = () => {
    setIsSuccess(false);
    setRegisteredMember(null);
    setErrorMessage(null);
    setFormData({
      fullName: '',
      cpf: '',
      email: '',
      cim: '',
      degree: 'Aprendiz',
      degreeLevel: 1,
      status: 'Regular',
      currentOfficerRole: undefined,
      joinedDate: new Date().toISOString().split('T')[0],
      phone: '',
      password: '',
      photoUrl: '',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full text-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-900/95 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60 whitespace-nowrap">
                  A∴R∴L∴S∴ Fraternidade da Franca Nº 3571
                </span>
              </div>
              <h3 className="font-serif-masonic text-base sm:text-lg font-bold text-slate-100 mt-1">
                Formulário Oficial de Inscrição e Cadastro de Obreiro
              </h3>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 min-h-0 overscroll-contain">
          {isSuccess && registeredMember ? (
            <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto ring-4 ring-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-serif-masonic text-xl font-bold text-emerald-300">
                  Inscrição e Cadastro Realizado com Sucesso!
                </h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  O Irmão <strong>{registeredMember.fullName}</strong> (CIM: {registeredMember.cim}) foi cadastrado automaticamente no sistema e inserido como novo usuário ativo da Loja.
                </p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 max-w-sm mx-auto text-left text-xs space-y-1.5 font-mono">
                <div className="text-slate-400 text-[11px]">Dados de Acesso Criados:</div>
                <div className="text-slate-200"><strong>Usuário / CIM:</strong> {registeredMember.cim}</div>
                <div className="text-slate-200"><strong>Senha:</strong> {registeredMember.password || '123456'}</div>
                <div className="text-slate-200"><strong>Grau:</strong> {registeredMember.degree}</div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {onSuccessLogin && (
                  <button
                    onClick={() => {
                      onSuccessLogin(registeredMember);
                      handleReset();
                    }}
                    className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl transition shadow-lg flex items-center justify-center space-x-2"
                  >
                    <span>Acessar Portal Agora</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-6 py-2.5 rounded-xl transition border border-slate-700"
                >
                  Concluir e Fechar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="bg-rose-950/80 border border-rose-800 text-rose-300 text-xs p-3 rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Photo Upload Section */}
              <div className={`bg-slate-950 border rounded-xl p-4 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 transition ${
                formData.photoUrl && formData.photoUrl !== DEFAULT_NEUTRAL_AVATAR
                  ? 'border-emerald-700/60 bg-emerald-950/20'
                  : errorMessage && !formData.photoUrl
                  ? 'border-rose-500/80 bg-rose-950/20 ring-1 ring-rose-500/40'
                  : 'border-amber-500/40'
              }`}>
                <div className="relative group shrink-0">
                  <img
                    src={getMemberPhotoUrl(formData.photoUrl)}
                    alt="Fotografia do Obreiro"
                    className={`w-20 h-20 rounded-full object-cover bg-slate-900 shadow-md ${
                      formData.photoUrl && formData.photoUrl !== DEFAULT_NEUTRAL_AVATAR
                        ? 'ring-2 ring-emerald-400'
                        : 'ring-2 ring-amber-500/70 border border-dashed border-amber-400/80'
                    }`}
                  />
                  <label className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition">
                    <Camera className="w-6 h-6 text-amber-300" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="space-y-1.5 text-center sm:text-left flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs font-bold text-slate-100">
                      Fotografia Oficial (Rosto com Traje Maçônico / Gravata)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-wider bg-rose-950 text-rose-300 border border-rose-700/80">
                      * Obrigatório
                    </span>
                  </div>

                  {formData.photoUrl && formData.photoUrl !== DEFAULT_NEUTRAL_AVATAR ? (
                    <p className="text-[11px] text-emerald-400 flex items-center justify-center sm:justify-start space-x-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Fotografia anexada e pronta para o cadastro!</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-300/90">
                      Anexe uma foto nítida de rosto com terno e gravata (da galeria do celular ou câmera).
                    </p>
                  )}

                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                    <label className={`inline-flex items-center space-x-1.5 text-xs px-3.5 py-1.5 rounded-lg cursor-pointer transition font-semibold shadow-sm ${
                      formData.photoUrl && formData.photoUrl !== DEFAULT_NEUTRAL_AVATAR
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    }`}>
                      {formData.photoUrl && formData.photoUrl !== DEFAULT_NEUTRAL_AVATAR ? (
                        <>
                          <Camera className="w-3.5 h-3.5 text-slate-300" />
                          <span>Alterar Foto Selecionada</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-slate-950" />
                          <span>Selecionar Foto da Galeria / Câmera *</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>

                    {formData.photoUrl && formData.photoUrl !== DEFAULT_NEUTRAL_AVATAR && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, photoUrl: '' }))}
                        className="text-[11px] text-rose-400 hover:text-rose-300 bg-rose-950/60 border border-rose-800/60 px-2.5 py-1.5 rounded-lg transition"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Grid of Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Nome Completo * <span className="text-[10px] text-amber-400 font-normal">(EM MAIÚSCULO)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: formatFullName(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 uppercase font-semibold tracking-wide"
                    placeholder="JOÃO DA SILVA"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    CIM (Cédula de Identidade Maçônica) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cim}
                    onChange={(e) => setFormData({ ...formData, cim: formatCIM(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono font-bold"
                    placeholder="193245"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">CPF</label>
                  <input
                    type="text"
                    maxLength={14}
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">E-mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase().trim() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 lowercase"
                    placeholder="obreiro@loja.org.br"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    placeholder="(16) 99999-9999"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Data de Iniciação / Filiação</label>
                  <input
                    type="date"
                    value={formData.joinedDate}
                    onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Grau Maçônico *</label>
                  <select
                    value={formData.degree}
                    onChange={(e) => {
                      const deg = e.target.value as MasonicDegree;
                      setFormData({
                        ...formData,
                        degree: deg,
                        degreeLevel: deg === 'Mestre' ? 3 : deg === 'Companheiro' ? 2 : 1,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Aprendiz">Aprendiz (1º Grau)</option>
                    <option value="Companheiro">Companheiro (2º Grau)</option>
                    <option value="Mestre">Mestre Maçom (3º Grau)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Situação / Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as MemberStatus })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Regular">Regular</option>
                    <option value="Remido">Remido</option>
                    <option value="Emérito">Emérito</option>
                    <option value="Licenciado">Licenciado</option>
                    <option value="Placet">Placet (Adormecido)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">
                    Cargo Atual na Administração (se houver)
                  </label>
                  <select
                    value={formData.currentOfficerRole || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currentOfficerRole: (e.target.value as LodgeOfficerRole) || undefined,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Nenhum (Membro do Quadro)</option>
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
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
                    <span>Senha Individual de Acesso ao Sistema *</span>
                    <span className="text-[10px] text-slate-400">Para login individual no Portal</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Defina sua senha pessoal de acesso (ex: 6 dígitos)"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-10 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 p-0.5"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20 flex items-center space-x-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Concluir Inscrição e Cadastrar no Sistema</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
