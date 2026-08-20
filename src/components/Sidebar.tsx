import React, { useRef, useEffect } from 'react';
import {
  Menu,
  Users,
  Calendar,
  QrCode,
  Camera,
  FileCheck2,
  FileText,
  BarChart3,
  UserCheck,
  ShieldAlert,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ChevronRight,
  LogOut,
  User,
  ExternalLink
} from 'lucide-react';
import { Member } from '../types/masonic';
import { isLodgeAdmin, isSystemAdmin, getRoleBadgeLabel } from '../utils/authUtils';
import { getMemberPhotoUrl } from '../utils/avatarUtils';
import { MasonicLogo } from './MasonicLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: Member;
  allMembers: Member[];
  onLogout: () => void;
  pendingJustificationsCount: number;
  inactivityAlertsCount: number;
  hasActiveSession: boolean;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  pendingJustificationsCount,
  inactivityAlertsCount,
  hasActiveSession,
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed,
  setIsCollapsed,
}) => {
  const isAdmin = isLodgeAdmin(currentUser);
  const badge = getRoleBadgeLabel(currentUser);
  const sidebarRef = useRef<HTMLElement>(null);

  // Auto-retract/collapse when clicking anywhere outside the sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // Check if target is inside the sidebar
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        // Do not intercept if clicking any explicit menu toggle button
        const isTrigger = (event.target as HTMLElement)?.closest?.('[data-menu-trigger="true"]');
        if (isTrigger) return;

        // Auto collapse desktop sidebar if currently expanded
        if (!isCollapsed) {
          setIsCollapsed(true);
        }
        // Auto close mobile drawer if open
        if (isMobileOpen) {
          setIsMobileOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCollapsed, isMobileOpen, setIsCollapsed, setIsMobileOpen]);

  // Handle navigation click and auto-expand if collapsed
  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
    // If collapsed on desktop, clicking an item expands the sidebar automatically
    if (isCollapsed) {
      setIsCollapsed(false);
    }
  };

  // If sidebar is clicked while collapsed, expand it automatically
  const handleSidebarClick = (e: React.MouseEvent) => {
    if (isCollapsed && !isMobileOpen) {
      setIsCollapsed(false);
    }
  };

  const navItems = [
    {
      id: 'meu_painel',
      label: 'Meu Painel do Obreiro',
      shortLabel: 'Meu Painel',
      icon: BarChart3,
      visible: true,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'painel',
      label: 'Visão Geral (Secretaria)',
      shortLabel: 'Secretaria',
      icon: Building2,
      visible: isAdmin,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'chamada_qr',
      label: isAdmin ? 'Projetor QR / Presença' : 'Registrar Presença',
      shortLabel: 'Chamada QR',
      icon: isAdmin ? QrCode : Camera,
      visible: true,
      hasPulse: hasActiveSession,
      badge: hasActiveSession ? 'AO VIVO' : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    },
    {
      id: 'membros',
      label: 'Obreiros / Quadro',
      shortLabel: 'Obreiros',
      icon: Users,
      visible: isAdmin,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'visitantes',
      label: 'Visitantes',
      shortLabel: 'Visitantes',
      icon: UserCheck,
      visible: isAdmin,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'sessoes',
      label: isAdmin ? 'Sessões da Loja' : `Sessões (${currentUser.degree})`,
      shortLabel: 'Sessões',
      icon: Calendar,
      visible: true,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'balaustre',
      label: 'Balaústre (Ata)',
      shortLabel: 'Balaústre',
      icon: FileText,
      visible: true,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'justificativas',
      label: isAdmin ? 'Central de Abonos' : 'Minhas Justificativas',
      shortLabel: 'Abonos',
      icon: FileCheck2,
      visible: true,
      badge: isAdmin && pendingJustificationsCount > 0 ? String(pendingJustificationsCount) : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
    },
    {
      id: 'relatorios',
      label: isAdmin ? 'Inteligência & Alertas' : 'Minha Frequência',
      shortLabel: 'Alertas',
      icon: ShieldAlert,
      visible: true,
      badge: isAdmin && inactivityAlertsCount > 0 ? String(inactivityAlertsCount) : null,
      badgeColor: 'bg-rose-500 text-white font-bold',
    },
  ];

  const visibleNavItems = navItems.filter((item) => item.visible);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        ref={sidebarRef}
        onClick={handleSidebarClick}
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-30 h-screen bg-slate-900 border-r border-amber-900/30 flex flex-col transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none ${
          // Width based on collapsed state on desktop
          isCollapsed ? 'lg:w-20 cursor-pointer' : 'lg:w-64'
        } ${
          // Slide in/out on mobile
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header: 3-Lines Menu Button & Lodge Branding */}
        <div className="h-16 px-3.5 flex items-center justify-between border-b border-slate-800/80 shrink-0 bg-slate-900/95">
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed((prev) => !prev);
            }}
            title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
            className={`flex items-center space-x-2.5 cursor-pointer group min-w-0 overflow-hidden ${
              isCollapsed && !isMobileOpen ? 'justify-center w-full' : ''
            }`}
          >
            {/* 3-lines Menu Icon Button */}
            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 group-hover:text-amber-300 group-hover:border-amber-500/50 group-hover:bg-slate-800 transition shrink-0 flex items-center justify-center shadow-md">
              <Menu className="w-5 h-5 text-amber-400" />
            </div>

            {/* Menu Label (Visible when expanded or on mobile) */}
            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5 truncate">
                  <h1 className="text-sm font-bold text-slate-100 tracking-wide truncate group-hover:text-amber-300 transition-colors">
                    Menu Principal
                  </h1>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  Navegação do Sistema
                </p>
              </div>
            )}
          </div>

          {/* Close button for Mobile Drawer */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileOpen(false);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 lg:hidden transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (!isAdmin && item.id === 'meu_painel' && activeTab === 'painel');

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                title={isCollapsed && !isMobileOpen ? item.label : undefined}
                className={`w-full group flex items-center rounded-xl transition-all duration-150 relative ${
                  isCollapsed && !isMobileOpen
                    ? 'justify-center p-3'
                    : 'px-3 py-2.5 justify-between'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/10 text-amber-300 border border-amber-500/50 shadow-md shadow-amber-950/40 font-semibold'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/70 border border-transparent font-medium'
                }`}
              >
                <div
                  className={`flex items-center ${
                    isCollapsed && !isMobileOpen ? 'space-x-0' : 'space-x-3 min-w-0'
                  }`}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    <Icon
                      className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-amber-300'
                      }`}
                    />
                    {item.hasPulse && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                    )}
                  </div>

                  {/* Nav Label */}
                  {(!isCollapsed || isMobileOpen) && (
                    <span className="text-xs truncate text-left">
                      {item.label}
                    </span>
                  )}
                </div>

                {/* Badge Indicator */}
                {(!isCollapsed || isMobileOpen) && item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ml-2 shadow-sm ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Dot for collapsed mode when badge exists */}
                {isCollapsed && !isMobileOpen && item.badge && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer: Collapse Toggle & User Profile */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/90 space-y-2 shrink-0">
          {/* Expand / Collapse Button (Desktop Only) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed((prev) => !prev);
            }}
            title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            className={`hidden lg:flex items-center rounded-xl text-xs text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 p-2 w-full transition ${
              isCollapsed ? 'justify-center' : 'justify-between px-3'
            }`}
          >
            <div className="flex items-center space-x-2">
              {isCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-amber-400" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-amber-400" />
              )}
              {!isCollapsed && <span className="font-medium text-[11px]">Recolher Menu Lateral</span>}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] text-slate-500 font-mono">Retrair</span>
            )}
          </button>

          {/* User Quick Info */}
          <div
            className={`flex items-center rounded-xl bg-slate-950/80 border border-slate-800/80 p-2 ${
              isCollapsed && !isMobileOpen ? 'justify-center' : 'space-x-2.5'
            }`}
          >
            <img
              src={getMemberPhotoUrl(currentUser.photoUrl)}
              alt={currentUser.fullName}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-amber-500/50 shrink-0 bg-slate-900"
            />

            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-100 text-xs truncate">
                  {currentUser.fullName}
                </p>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${badge.colorClass}`}>
                    {badge.label}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
