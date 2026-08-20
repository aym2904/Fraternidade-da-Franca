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
import { DEFAULT_NEUTRAL_AVATAR } from '../utils/avatarUtils';
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
    photoUrl: DEFAULT_NEUTRAL_AVATAR,
  });

  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredMember, setRegisteredMember] = useState<Member | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const getShareUrl = () => {
    try {
      const base = window.location.origin + window.location.pathname;
      return `${base}?cadastro=true`;
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
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
      photoUrl: formData.photoUrl || DEFAULT_NEUTRAL_AVATAR,
    };

    onAddMember(newMember);
    setRegisteredMember(newMember);
    setIsSuccess(true);
  };

  const handleReset = () => {
    setIsSuccess(false);
    setRegisteredMember(null);
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
      photoUrl: DEFAULT_NEUTRAL_AVATAR,
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
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                  A∴R∴L∴S∴ Fraternidade da Franca Nº3571
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
          {/* Share Box for Admins */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
            <span className="text-slate-400 text-[11px] text-center sm:text-left">
              Compartilhe este link com os Irmãos para preenchimento no celular:
            </span>
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleCopyLink}
                className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition border border-slate-700 text-[11px]"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition border border-emerald-800 text-[11px]"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

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
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="relative group shrink-0">
                  <img
                    src={formData.photoUrl}
                    alt="Fotografia do Obreiro"
                    className="w-20 h-20 rounded-full object-cover ring-2 ring-amber-500/60 bg-slate-900"
                  />
                  <label className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition">
                    <Camera className="w-5 h-5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="space-y-1 text-center sm:text-left flex-1">
                  <span className="text-xs font-bold text-amber-200 block">
                    Fotografia Oficial (Rosto com Traje Maçônico / Gravata)
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Selecione uma foto de rosto da galeria do seu celular ou dispositivo.
                  </p>
                  <label className="inline-flex items-center space-x-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs px-3.5 py-1.5 rounded-lg cursor-pointer transition mt-1 font-semibold">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Selecionar Foto da Galeria / Câmera</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
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
                        currentOfficerRole: deg === 'Mestre' ? formData.currentOfficerRole : undefined,
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
                  {formData.degree !== 'Mestre' ? (
                    <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400">
                      Cargos em Loja e permissões de gestão/QR Code são privativos a Mestres Maçons (3º Grau).
                    </div>
                  ) : (
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
                      <option value="Venerável Mestre">Venerável Mestre (Gestão e Exibição de QR Code)</option>
                      <option value="Secretário">Secretário (Gestão e Exibição de QR Code)</option>
                      <option value="Chanceler">Chanceler (Gestão e Exibição de QR Code)</option>
                      <option value="1º Vigilante">1º Vigilante</option>
                      <option value="2º Vigilante">2º Vigilante</option>
                      <option value="Orador">Orador</option>
                      <option value="Tesoureiro">Tesoureiro</option>
                      <option value="Mestre de Cerimônias">Mestre de Cerimônias</option>
                      <option value="Guarda do Templo">Guarda do Templo</option>
                      <option value="Hospedeiro">Hospedeiro</option>
                      <option value="Bibliotecário">Bibliotecário</option>
                      <option value="Mestre de Harmonia">Mestre de Harmonia</option>
                    </select>
                  )}
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
