import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Database,
  User,
  ChevronDown,
  LogOut,
  BarChart3,
  Building2,
  Calendar,
  Sparkles,
  CheckCircle2,
  Users,
  Radio,
  FileCheck2,
  FileText,
  ShieldAlert,
  QrCode,
  Camera,
  UserCheck
} from 'lucide-react';
import { Member } from '../types/masonic';
import { isLodgeAdmin, isSystemAdmin, getRoleBadgeLabel } from '../utils/authUtils';
import { getMemberPhotoUrl } from '../utils/avatarUtils';
import { SupabaseConnectionStatus } from '../lib/supabaseService';
import { MasonicLogo } from './MasonicLogo';

interface TopHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: Member;
  allMembers: Member[];
  setCurrentUser: (member: Member) => void;
  onLogout: () => void;
  hasActiveSession: boolean;
  supabaseStatus?: SupabaseConnectionStatus | null;
  onOpenSupabaseModal?: () => void;
  onOpenMobileMenu: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  allMembers,
  setCurrentUser,
  onLogout,
  hasActiveSession,
  supabaseStatus,
  onOpenSupabaseModal,
  onOpenMobileMenu,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
}) => {
  const isAdmin = isLodgeAdmin(currentUser);
  const isSysAdmin = isSystemAdmin(currentUser);
  const badge = getRoleBadgeLabel(currentUser);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'meu_painel':
        return { label: 'Meu Painel do Obreiro', icon: BarChart3, category: 'Área Pessoal' };
      case 'painel':
        return { label: 'Visão Geral (Secretaria)', icon: Building2, category: 'Gestão da Loja' };
      case 'chamada_qr':
        return { label: isAdmin ? 'Projetor QR / Presença' : 'Registrar Presença', icon: isAdmin ? QrCode : Camera, category: 'Sessão em Tempo Real' };
      case 'membros':
        return { label: 'Quadro de Obreiros', icon: Users, category: 'Administração' };
      case 'sessoes':
        return { label: isAdmin ? 'Sessões da Loja' : `Sessões do ${currentUser.degree}`, icon: Calendar, category: 'Calendário Litúrgico' };
      case 'visitantes':
        return { label: 'Registro de Visitantes', icon: UserCheck, category: 'Chancelaria' };
      case 'justificativas':
        return { label: isAdmin ? 'Central de Abonos e Justificativas' : 'Minhas Justificativas de Ausência', icon: FileCheck2, category: 'Frequência' };
      case 'balaustre':
        return { label: 'Balaústre dos Trabalhos (Ata)', icon: FileText, category: 'Secretaria' };
      case 'relatorios':
        return { label: isAdmin ? 'Inteligência, Estatísticas & Alertas' : 'Minha Frequência Litúrgica', icon: ShieldAlert, category: 'Análise' };
      default:
        return { label: 'Painel Geral', icon: BarChart3, category: 'Sistema' };
    }
  };

  const currentTabInfo = getTabTitle();
  const Icon = currentTabInfo.icon;

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-amber-900/30 sticky top-0 z-30 h-16">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        {/* Left: Mobile Menu Trigger, Masonic Logo & Active Tab Breadcrumb */}
        <div className="flex items-center space-x-3 min-w-0">
          {/* Hamburger button (Mobile only drawer trigger) */}
          <button
            data-menu-trigger="true"
            onClick={onOpenMobileMenu}
            title="Abrir Menu Principal"
            className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-amber-300 hover:bg-slate-800 bg-slate-950/70 border border-slate-800 transition active:scale-95 flex items-center justify-center shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Símbolo Maçônico do lado esquerdo */}
          <MasonicLogo
            size="sm"
            className="border border-amber-400/50 shadow-md shrink-0 ring-1 ring-amber-500/30"
          />

          {/* Current Tab Title and Context */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hidden sm:flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-amber-500/90 font-semibold hidden md:inline">
                  {currentTabInfo.category} •
                </span>
                <h2 className="text-xs sm:text-sm md:text-base font-bold text-slate-100 truncate">
                  {currentTabInfo.label}
                </h2>
              </div>
              <p className="text-[10px] text-slate-400 truncate hidden lg:block">
                A∴R∴L∴S∴ Fraternidade da Franca Nº 3571 • GOSP
              </p>
            </div>
          </div>
        </div>

        {/* Right: Active Session Indicator, Supabase Badge & User Menu */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Live Session Quick Pill */}
          {hasActiveSession && (
            <button
              onClick={() => setActiveTab('chamada_qr')}
              className="flex items-center space-x-1.5 px-2.5 py-1 sm:py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold shadow-lg shadow-emerald-950/50 transition hover:bg-emerald-900/80 animate-pulse"
              title="Clique para ir para a Sessão Ativa"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Sessão Ativa no Templo</span>
              <span className="sm:hidden">Sessão Ativa</span>
            </button>
          )}

          {/* Supabase Connection Quick Badge (System Admin 193245 only) */}
          {isSysAdmin && onOpenSupabaseModal && (
            <button
              type="button"
              onClick={onOpenSupabaseModal}
              title="Status do Banco de Dados Supabase (Exclusivo Administrador 193245)"
              className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition active:scale-95 ${
                supabaseStatus?.hasTables
                  ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/80 shadow-sm'
                  : supabaseStatus?.connected
                  ? 'bg-amber-950/70 border-amber-700/60 text-amber-300 hover:bg-amber-900/80 shadow-sm animate-pulse'
                  : 'bg-rose-950/70 border-rose-700/60 text-rose-300 hover:bg-rose-900/80 shadow-sm'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="font-mono">
                {supabaseStatus?.hasTables
                  ? 'Supabase OK'
                  : supabaseStatus?.connected
                  ? 'Supabase: Tab. Ausente'
                  : 'Supabase Offline'}
              </span>
            </button>
          )}

          {/* User Info Pill */}
          <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 px-2 sm:px-3 py-1.5 rounded-xl">
            <img
              src={getMemberPhotoUrl(currentUser.photoUrl)}
              alt={currentUser.fullName}
              className="w-7 h-7 rounded-full object-cover ring-1 ring-amber-500/50 shrink-0 bg-slate-900"
            />
            <div className="text-left hidden md:block">
              <p className="font-semibold text-slate-100 text-xs truncate max-w-[120px] lg:max-w-[160px]">
                {currentUser.fullName}
              </p>
              <div className="flex items-center space-x-1.5">
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${badge.colorClass}`}>
                  {badge.label}
                </span>
              </div>
            </div>
          </div>

          {/* User Menu Dropdown Button ("Botão do Hominho") */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              title="Perfil e Opções da Conta"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 sm:px-2.5 rounded-xl text-xs transition border border-slate-700 flex items-center space-x-1.5 shadow-md active:scale-95"
            >
              <User className="w-5 h-5 text-amber-400" />
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-150">
                {/* Current User Info Header */}
                <div className="p-3 bg-slate-950/70 rounded-xl mb-2">
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={getMemberPhotoUrl(currentUser.photoUrl)}
                      alt={currentUser.fullName}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-amber-500/50 shrink-0 bg-slate-900"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-100 text-xs truncate">
                        {currentUser.fullName}
                      </p>
                      {!isSystemAdmin(currentUser) && (
                        <p className="text-[10px] text-amber-400 font-mono">
                          CIM: {currentUser.cim}
                        </p>
                      )}
                      <span className={`inline-block text-[9px] mt-1 px-1.5 py-0.2 rounded font-mono font-bold ${badge.colorClass}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Profile Navigation Links inside menu */}
                <div className="py-1 space-y-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setActiveTab('meu_painel');
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between font-medium transition ${
                      activeTab === 'meu_painel'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-amber-400" />
                      <span>Meu Painel do Obreiro</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Pessoal</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setActiveTab('painel');
                      }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center justify-between font-medium transition ${
                        activeTab === 'painel'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-amber-400" />
                        <span>Visão Geral (Secretaria)</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Loja</span>
                    </button>
                  )}
                </div>

                {/* Quick Switch User (For testing or Officers) */}
                <div className="py-1.5">
                  <label className="block text-[10px] text-slate-400 font-medium px-2 mb-1 uppercase tracking-wider">
                    Trocar Perfil de Usuário
                  </label>
                  <select
                    value={currentUser.id}
                    onChange={(e) => {
                      const selected = allMembers.find((m) => m.id === e.target.value);
                      if (selected) {
                        setCurrentUser(selected);
                        setIsUserMenuOpen(false);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl p-2 focus:outline-none focus:border-amber-500"
                  >
                    {allMembers
                      .filter((m) => m.status !== 'Placet')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName} ({m.degree} - {m.lodgeRole || 'Membro'})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Supabase Status Button inside menu (System Admin 193245 only) */}
                {isSysAdmin && onOpenSupabaseModal && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenSupabaseModal();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/50 rounded-xl flex items-center justify-between font-semibold transition group"
                    >
                      <div className="flex items-center space-x-2">
                        <Database className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span>Status / Conexão Supabase</span>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-900/80 text-emerald-200 px-1.5 py-0.5 rounded border border-emerald-700/50">
                        {supabaseStatus?.hasTables ? 'OK' : 'Diagnóstico'}
                      </span>
                    </button>
                  </div>
                )}

                {/* Sair / Logout Button inside the menu */}
                <div className="pt-2 mt-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs text-rose-300 bg-rose-950/50 hover:bg-rose-900/80 border border-rose-800/60 rounded-xl flex items-center justify-between font-bold transition shadow-sm group"
                  >
                    <div className="flex items-center space-x-2">
                      <LogOut className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                      <span>Sair da Conta (Logout)</span>
                    </div>
                    <span className="text-[10px] font-mono bg-rose-900/80 text-rose-200 px-1.5 py-0.5 rounded">
                      Sair
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
