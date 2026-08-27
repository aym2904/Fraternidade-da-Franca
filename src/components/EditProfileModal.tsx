import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Camera,
  Upload,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Mail,
  FileText,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Award
} from 'lucide-react';
import { Member } from '../types/masonic';
import { getMemberPhotoUrl, DEFAULT_NEUTRAL_AVATAR } from '../utils/avatarUtils';
import { compressImageFile } from '../utils/imageUtils';
import {
  cleanFullName,
  formatCPF,
  formatPhone,
  formatEmail,
  formatDisplayDate
} from '../utils/formatters';
import { isSystemAdmin } from '../utils/authUtils';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Member;
  onSave: (updatedMember: Member) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSave,
}) => {
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [joinedDate, setJoinedDate] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      setFullName(currentUser.fullName || '');
      setCpf(currentUser.cpf ? formatCPF(currentUser.cpf) : '');
      setPhone(currentUser.phone ? formatPhone(currentUser.phone) : '');
      setEmail(currentUser.email || '');
      setJoinedDate(currentUser.joinedDate || '');
      setPhotoUrl(currentUser.photoUrl || '');
      setPassword(currentUser.password || '');
      setShowPassword(false);
      setShowUrlInput(false);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingPhoto(true);
      setErrorMessage(null);
      const compressed = await compressImageFile(file, 256, 0.75);
      if (compressed) {
        setPhotoUrl(compressed);
      } else {
        setErrorMessage('Não foi possível processar a imagem selecionada.');
      }
    } catch (err) {
      setErrorMessage('Erro ao comprimir imagem. Tente outro arquivo.');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanedName = cleanFullName(fullName);
    if (!cleanedName) {
      setErrorMessage('O Nome Completo do Obreiro é obrigatório.');
      return;
    }

    const updatedMember: Member = {
      ...currentUser,
      fullName: cleanedName,
      cpf: cpf ? formatCPF(cpf) : '',
      phone: phone ? formatPhone(phone) : '',
      email: email ? formatEmail(email) : '',
      joinedDate: joinedDate || currentUser.joinedDate,
      photoUrl: photoUrl.trim() || DEFAULT_NEUTRAL_AVATAR,
      password: password.trim() ? password.trim() : (currentUser.password || '123456'),
    };

    onSave(updatedMember);
    setSuccessMessage('Dados cadastrais atualizados com sucesso!');

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const isSysAdmin = isSystemAdmin(currentUser);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative my-8 space-y-5 text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif-masonic text-lg sm:text-xl font-bold text-slate-100">
                Meu Perfil
              </h2>
              <p className="text-xs text-slate-400">
                Atualize suas informações pessoais, senha e fotografia oficial
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-300 text-xs p-3 rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs p-3 rounded-xl flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Photo Upload Section */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Camera className="w-4 h-4 text-amber-400" />
                <span>Fotografia Oficial do Obreiro</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {photoUrl && photoUrl !== DEFAULT_NEUTRAL_AVATAR ? 'Foto personalizada' : 'Silhueta padrão'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group">
                <img
                  src={getMemberPhotoUrl(photoUrl)}
                  alt="Foto do Obreiro"
                  className="w-20 h-20 rounded-full object-cover ring-2 ring-amber-500/60 shadow-lg bg-slate-900 shrink-0"
                />
                <label className="absolute inset-0 rounded-full bg-slate-950/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition text-amber-300 text-[10px] font-semibold">
                  <Camera className="w-5 h-5 mb-0.5" />
                  <span>Alterar</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
              </div>

              <div className="flex-1 space-y-2 text-center sm:text-left w-full">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <label className="cursor-pointer text-xs font-semibold px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center space-x-1.5 shadow-sm active:scale-95">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isProcessingPhoto ? 'Processando...' : 'Carregar do Dispositivo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isProcessingPhoto}
                      onChange={handlePhotoUpload}
                    />
                  </label>

                  {photoUrl && photoUrl !== DEFAULT_NEUTRAL_AVATAR && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs px-3 py-2 rounded-xl transition flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Remover</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline px-2 py-1"
                  >
                    {showUrlInput ? 'Ocultar URL' : 'Inserir Link/URL'}
                  </button>
                </div>

                {showUrlInput && (
                  <input
                    type="text"
                    placeholder="https://exemplo.com/minha-foto.jpg"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
                  />
                )}

                <p className="text-[11px] text-slate-400 leading-tight">
                  Formatos aceitos: JPG, PNG ou Câmera. A foto é automaticamente otimizada.
                </p>
              </div>
            </div>
          </div>

          {/* Regimental Information (Read-only / Badges) */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[11px] text-slate-400 block">Identificação Maçônica</span>
                <span className="font-mono font-bold text-amber-300">
                  {isSysAdmin ? 'Administrador Geral' : `CIM: ${currentUser.cim}`}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-purple-400" />
              <div>
                <span className="text-[11px] text-slate-400 block">Grau e Cargo</span>
                <span className="font-medium text-slate-200">
                  {currentUser.degree}
                  {currentUser.currentOfficerRole ? ` • ${currentUser.currentOfficerRole}` : ''}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
              Registrado na A∴R∴L∴S∴ Nº 3571
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Nome Completo */}
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-medium mb-1">
                Nome Completo <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome Completo do Obreiro"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 font-medium uppercase"
                />
              </div>
            </div>

            {/* Telefone / WhatsApp */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Telefone / WhatsApp
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                E-mail de Contato
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 lowercase"
                />
              </div>
            </div>

            {/* CPF */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                CPF
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <FileText className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Data da Iniciação Maçônica */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Data da Iniciação
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Calendar className="w-4 h-4" />
                </div>
                <input
                  type="date"
                  value={joinedDate}
                  onChange={(e) => setJoinedDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 font-mono"
                />
              </div>
            </div>

            {/* Senha de Acesso */}
            <div className="sm:col-span-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-medium flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Senha de Acesso ao Portal</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  Utilizada para login no portal
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="border-t border-slate-800 pt-4 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
