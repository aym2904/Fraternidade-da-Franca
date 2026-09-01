import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  Calendar,
  QrCode,
  Camera,
  FileText,
  BarChart3,
  UserCheck,
  ShieldAlert,
  LogOut,
  User,
  ChevronDown,
  Database,
  Building2
} from 'lucide-react';
import { Member } from '../types/masonic';
import { isLodgeAdmin, isSystemAdmin, getRoleBadgeLabel } from '../utils/authUtils';
import { getMemberPhotoUrl } from '../utils/avatarUtils';
import { MasonicLogo } from './MasonicLogo';
import { SupabaseConnectionStatus } from '../lib/supabaseService';
import { AnimatedMasonicAsciiHeader } from './AnimatedMasonicAsciiHeader';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: Member;
  allMembers: Member[];
  setCurrentUser: (member: Member) => void;
  onLogout: () => void;
  inactivityAlertsCount: number;
  hasActiveSession: boolean;
  supabaseStatus?: SupabaseConnectionStatus | null;
  onOpenSupabaseModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  allMembers,
  setCurrentUser,
  onLogout,
  inactivityAlertsCount,
  hasActiveSession,
  supabaseStatus,
  onOpenSupabaseModal,
}) => {
  const isAdmin = isLodgeAdmin(currentUser);
  const isSysAdmin = isSystemAdmin(currentUser);
  const badge = getRoleBadgeLabel(currentUser);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-amber-900/40 sticky top-0 z-40 relative">
      {/* Animated Monospace ASCII / Sacred Geometry Bracket Matrix Background */}
      <AnimatedMasonicAsciiHeader intensity="medium" />

      {/* Top Bar with Lodge Emblem & Title */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 relative z-10">
        <div className="flex items-center justify-between h-16">
          {/* Lodge Branding */}
          <div
            onClick={() => setActiveTab('painel')}
            className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer group min-w-0"
          >
            <MasonicLogo size="sm" className="group-hover:scale-105 transition-transform border border-amber-400/40 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 truncate">
                <h1 className="font-serif-masonic text-xs xs:text-sm sm:text-lg font-bold text-amber-200 tracking-wider truncate">
                  Fraternidade da Franca
                </h1>
                <span className="text-[10px] sm:text-xs bg-amber-950/80 text-amber-400 border border-amber-700/50 px-1 py-0.5 rounded font-mono shrink-0">
                  Nº3571
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Oriente de Franca/SP • Sistema de Presença por Grau e Cargo
              </p>
            </div>
          </div>

          {/* User Profile & Menu (Hominho) */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Supabase Connection Quick Badge (System Admin only) */}
            {isSysAdmin && onOpenSupabaseModal && (
              <button
                type="button"
                onClick={onOpenSupabaseModal}
                title="Status do Banco de Dados Supabase (Exclusivo Administrador)"
                className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition active:scale-95 ${
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

            {/* User Menu Button ("Botão do Hominho" - includes Sair / Logout) */}
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
                        <User className="w-4 h-4 text-amber-400" />
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
                          <BarChart3 className="w-4 h-4 text-amber-400" />
                          <span>Visão Geral (Secretaria)</span>
                        </div>
                        <span className="text-[10px] text-slate-400">Loja</span>
                      </button>
                    )}
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

        {/* Navigation Tabs Bar (Filtered by Role/Degree Permissions) */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none border-t border-slate-800/80 pt-2 text-xs font-medium">
          {/* Meu Painel do Obreiro (Available for ALL brethren including Officers: Venerável Mestre, Secretário, Chanceler) */}
          <button
            onClick={() => setActiveTab('meu_painel')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition ${
              activeTab === 'meu_painel' || (!isAdmin && activeTab === 'painel')
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span>Meu Painel do Obreiro</span>
          </button>

          {/* Visão Geral da Loja / Secretaria (Admin Only) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('painel')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition ${
                activeTab === 'painel'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Visão Geral (Secretaria)</span>
            </button>
          )}

          {/* QR Code Attendance / Registrar Presença */}
          <button
            onClick={() => setActiveTab('chamada_qr')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition relative ${
              activeTab === 'chamada_qr'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {isAdmin ? (
              <QrCode className="w-4 h-4 text-amber-400" />
            ) : (
              <Camera className="w-4 h-4 text-amber-400" />
            )}
            <span>{isAdmin ? 'Projetor QR / Presença' : 'Registrar Presença'}</span>
            {hasActiveSession && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </button>

          {/* Member Roster (Admin / Secretario Only) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('membros')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition ${
                activeTab === 'membros'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Obreiros / Quadro</span>
            </button>
          )}

          {/* Lodge Sessions (Filtered inside component for non-admins) */}
          <button
            onClick={() => setActiveTab('sessoes')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition ${
              activeTab === 'sessoes'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Sessões {isAdmin ? 'da Loja' : `do ${currentUser.degree}`}</span>
          </button>

          {/* Visitors (Admin / Secretario Only) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('visitantes')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition ${
                activeTab === 'visitantes'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Visitantes</span>
            </button>
          )}

          {/* Balaústre (Minute) */}
          <button
            onClick={() => setActiveTab('balaustre')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition ${
              activeTab === 'balaustre'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Balaústre (Ata)</span>
          </button>

          {/* Reports & Intelligence / Personal Frequency */}
          <button
            onClick={() => setActiveTab('relatorios')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition relative ${
              activeTab === 'relatorios'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>{isAdmin ? 'Inteligência & Alertas' : 'Minha Frequência'}</span>
            {isAdmin && inactivityAlertsCount > 0 && (
              <span className="bg-rose-500 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                {inactivityAlertsCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
};

