import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  INITIAL_MEMBERS,
  INITIAL_SESSIONS,
  INITIAL_ATTENDANCES,
  INITIAL_VISITORS,
  INITIAL_BALAUSTRES
} from './data/mockData';
import { Member, Session, AttendanceRecord, VisitorRecord, Balaustre, CustomEvent } from './types/masonic';
import { detectInactivityAlerts, sortSessionsByCreationDesc } from './utils/masonicUtils';
import { supabaseService, SupabaseConnectionStatus } from './lib/supabaseService';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardOverview } from './components/DashboardOverview';
import { MemberManagement } from './components/MemberManagement';
import { SessionManagement } from './components/SessionManagement';
import { LiveSessionPanel } from './components/LiveSessionPanel';
import { BalaustreIntegration } from './components/BalaustreIntegration';
import { FrequencyReports } from './components/FrequencyReports';
import { MasonicCalendar } from './components/MasonicCalendar';
import { LoginScreen } from './components/LoginScreen';
import { PublicMemberRegistrationModal } from './components/PublicMemberRegistrationModal';
import { SupabaseStatusModal } from './components/SupabaseStatusModal';
import { EditProfileModal } from './components/EditProfileModal';
import { isLodgeAdmin, isSystemAdmin, SYSTEM_ADMIN_USER } from './utils/authUtils';
import { safeSetItem, safeGetItem, safeRemoveItem, safeSaveMembers } from './utils/storageUtils';

export default function App() {
  // Purge obsolete mock test keys if present
  useEffect(() => {
    try {
      const savedMembers = safeGetItem('masonic_members');
      if (
        savedMembers &&
        (savedMembers.includes('m1') ||
          savedMembers.includes('Joaquim Silva') ||
          savedMembers.includes('admin-1'))
      ) {
        safeRemoveItem('masonic_members');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // State with LocalStorage & Supabase fallback
  const [members, setMembers] = useState<Member[]>(() => {
    const saved = safeGetItem('masonic_members');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter(
            (m) =>
              m.id !== 'm1' &&
              m.id !== 'admin-1' &&
              m.fullName !== 'Administrador do Sistema'
          );
          if (cleaned.length > 0) return cleaned;
        }
      } catch (e) {
        // Fallback
      }
    }
    return INITIAL_MEMBERS;
  });

  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = safeGetItem('masonic_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return sortSessionsByCreationDesc(parsed);
      } catch (e) {}
    }
    return sortSessionsByCreationDesc(INITIAL_SESSIONS);
  });

  const [attendances, setAttendances] = useState<AttendanceRecord[]>(() => {
    const saved = safeGetItem('masonic_attendances');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_ATTENDANCES;
  });

  const [visitors, setVisitors] = useState<VisitorRecord[]>(() => {
    const saved = safeGetItem('masonic_visitors');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return INITIAL_VISITORS;
  });

  const [balaustres, setBalaustres] = useState<Balaustre[]>(() => {
    const saved = safeGetItem('masonic_balaustres');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return INITIAL_BALAUSTRES;
  });

  // Custom Events for Lodge Calendar
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>(() => {
    const saved = safeGetItem('masonic_custom_events');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const handleSaveCustomEvent = useCallback((newEvent: CustomEvent) => {
    setCustomEvents((prev) => {
      const existing = prev.some((e) => e.id === newEvent.id);
      const updated = existing
        ? prev.map((e) => (e.id === newEvent.id ? newEvent : e))
        : [newEvent, ...prev];
      safeSetItem('masonic_custom_events', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleDeleteCustomEvent = useCallback((id: string) => {
    setCustomEvents((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      safeSetItem('masonic_custom_events', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Logged-in member state (restored from LocalStorage if active)
  const [currentUser, setCurrentUser] = useState<Member | null>(() => {
    try {
      const saved = safeGetItem('masonic_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      }
    } catch (e) {
      console.error('Error restoring session:', e);
    }
    return null;
  });

  // Impersonation state (when Admin 193245 logs into another member's profile for testing)
  const [isImpersonating, setIsImpersonating] = useState<boolean>(() => {
    try {
      return safeGetItem('masonic_impersonated_by_admin') === 'true';
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) return tabParam;
      const savedTab = safeGetItem('masonic_active_tab');
      if (savedTab) return savedTab;
    } catch (e) {}
    return 'meu_painel';
  });

  useEffect(() => {
    safeSetItem('masonic_active_tab', activeTab);
  }, [activeTab]);

  // Public Self-Registration Modal state (auto-opens if URL has ?cadastro=true, #cadastro, /cadastro or button click)
  const [isPublicRegistrationOpen, setIsPublicRegistrationOpen] = useState<boolean>(() => {
    try {
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      return (
        search.includes('cadastro') ||
        search.includes('inscricao') ||
        search.includes('registro') ||
        hash.includes('cadastro') ||
        hash.includes('inscricao') ||
        path.includes('cadastro') ||
        path.includes('inscricao')
      );
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleUrlCheck = () => {
      try {
        const search = window.location.search.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        const path = window.location.pathname.toLowerCase();
        if (
          search.includes('cadastro') ||
          search.includes('inscricao') ||
          search.includes('registro') ||
          hash.includes('cadastro') ||
          hash.includes('inscricao') ||
          path.includes('cadastro') ||
          path.includes('inscricao')
        ) {
          setIsPublicRegistrationOpen(true);
        }
      } catch {}
    };

    handleUrlCheck();
    window.addEventListener('popstate', handleUrlCheck);
    window.addEventListener('hashchange', handleUrlCheck);
    return () => {
      window.removeEventListener('popstate', handleUrlCheck);
      window.removeEventListener('hashchange', handleUrlCheck);
    };
  }, []);

  const handleClosePublicRegistration = useCallback(() => {
    setIsPublicRegistrationOpen(false);
    try {
      if (
        window.location.search.includes('cadastro') ||
        window.location.search.includes('inscricao') ||
        window.location.hash.includes('cadastro') ||
        window.location.hash.includes('inscricao')
      ) {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch {}
  }, []);

  // Lateral sidebar state (expanded / collapsed, saved in localStorage)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return safeGetItem('masonic_sidebar_collapsed') === 'true';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    safeSetItem('masonic_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Supabase diagnostic and connection status state
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseConnectionStatus | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);

  const refreshSupabaseStatus = useCallback(async () => {
    try {
      const status = await supabaseService.checkConnection();
      setSupabaseStatus(status);
    } catch (e) {
      console.error('Supabase diagnostic check failed:', e);
    }
  }, []);

  const handleOpenSupabaseModal = useCallback(() => {
    setIsSupabaseModalOpen(true);
    refreshSupabaseStatus();
  }, [refreshSupabaseStatus]);

  // Supabase initial sync & highly optimized realtime delta subscriber (Zero extra REST egress)
  useEffect(() => {
    let isMounted = true;

    async function initialSyncFromSupabase() {
      try {
        refreshSupabaseStatus();

        const [
          remoteMembers,
          remoteSessions,
          remoteAttendances,
          remoteVisitors,
          remoteBalaustres,
        ] = await Promise.all([
          supabaseService.getMembers(),
          supabaseService.getSessions(),
          supabaseService.getAttendances(),
          supabaseService.getVisitors(),
          supabaseService.getBalaustres(),
        ]);

        if (!isMounted) return;

        if (remoteMembers && remoteMembers.length > 0) {
          setMembers(remoteMembers);
        }
        if (remoteSessions && remoteSessions.length > 0) {
          setSessions(sortSessionsByCreationDesc(remoteSessions));
        }
        if (remoteAttendances && remoteAttendances.length > 0) {
          setAttendances(remoteAttendances);
        }
        if (remoteVisitors && remoteVisitors.length > 0) {
          setVisitors(remoteVisitors);
        }
        if (remoteBalaustres && remoteBalaustres.length > 0) {
          setBalaustres(remoteBalaustres);
        }
      } catch (err) {
        console.warn('Initial Supabase sync fallback to local:', err);
      }
    }

    initialSyncFromSupabase();

    // Granular Realtime delta subscription (mutations applied in-memory without extra REST queries)
    const unsubscribeRealtime = supabaseService.subscribeToRealtimeDeltas({
      onAttendanceChange: (payload) => {
        if (!isMounted) return;
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const item = payload.new;
          if (item && item.id) {
            setAttendances((prev) => {
              const matchIdx = prev.findIndex(
                (a) =>
                  a.id === item.id ||
                  (a.sessionId === item.sessionId && a.memberId === item.memberId)
              );
              if (matchIdx >= 0) {
                const next = [...prev];
                next[matchIdx] = item;
                return next;
              }
              return [item, ...prev];
            });
          }
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old;
          if (old) {
            setAttendances((prev) =>
              prev.filter(
                (a) =>
                  a.id !== old.id &&
                  !(
                    old.sessionId &&
                    old.memberId &&
                    a.sessionId === old.sessionId &&
                    a.memberId === old.memberId
                  )
              )
            );
          }
        }
      },
      onVisitorChange: (payload) => {
        if (!isMounted) return;
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const item = payload.new;
          if (item && item.id) {
            setVisitors((prev) => {
              const matchIdx = prev.findIndex((v) => v.id === item.id);
              if (matchIdx >= 0) {
                const next = [...prev];
                next[matchIdx] = item;
                return next;
              }
              return [item, ...prev];
            });
          }
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old;
          if (old && old.id) {
            setVisitors((prev) => prev.filter((v) => v.id !== old.id));
          }
        }
      },
      onSessionChange: (payload) => {
        if (!isMounted) return;
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const item = payload.new;
          if (item && item.id) {
            setSessions((prev) => {
              const matchIdx = prev.findIndex((s) => s.id === item.id);
              let next: Session[];
              if (matchIdx >= 0) {
                next = [...prev];
                next[matchIdx] = item;
              } else {
                next = [item, ...prev];
              }
              return sortSessionsByCreationDesc(next);
            });
          }
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old;
          if (old && old.id) {
            setSessions((prev) => prev.filter((s) => s.id !== old.id));
          }
        }
      },
      onMemberChange: (payload) => {
        if (!isMounted) return;
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const item = payload.new;
          if (item && item.id && item.id !== 'admin-1' && item.id !== 'admin_sys') {
            setMembers((prev) => {
              const matchIdx = prev.findIndex((m) => m.id === item.id);
              if (matchIdx >= 0) {
                const next = [...prev];
                next[matchIdx] = item;
                return next;
              }
              return [item, ...prev];
            });
          }
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old;
          if (old && old.id) {
            setMembers((prev) => prev.filter((m) => m.id !== old.id));
          }
        }
      },
      onBalaustreChange: (payload) => {
        if (!isMounted) return;
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const item = payload.new;
          if (item && item.id) {
            setBalaustres((prev) => {
              const matchIdx = prev.findIndex((b) => b.id === item.id);
              if (matchIdx >= 0) {
                const next = [...prev];
                next[matchIdx] = item;
                return next;
              }
              return [item, ...prev];
            });
          }
        } else if (payload.eventType === 'DELETE') {
          const old = payload.old;
          if (old && old.id) {
            setBalaustres((prev) => prev.filter((b) => b.id !== old.id));
          }
        }
      },
    });

    return () => {
      isMounted = false;
      unsubscribeRealtime();
    };
  }, []);

  // Persistence side effects
  useEffect(() => {
    safeSaveMembers(members);
  }, [members]);

  useEffect(() => {
    safeSetItem('masonic_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    safeSetItem('masonic_attendances', JSON.stringify(attendances));
  }, [attendances]);

  useEffect(() => {
    safeSetItem('masonic_visitors', JSON.stringify(visitors));
  }, [visitors]);

  useEffect(() => {
    safeSetItem('masonic_balaustres', JSON.stringify(balaustres));
  }, [balaustres]);

  useEffect(() => {
    if (currentUser) {
      safeSetItem('masonic_auth_user', JSON.stringify(currentUser));
    } else {
      safeRemoveItem('masonic_auth_user');
    }
  }, [currentUser]);

  // Keep logged in user object updated when members list changes
  useEffect(() => {
    if (currentUser && !isSystemAdmin(currentUser)) {
      const updatedUser = members.find((m) => m.id === currentUser.id);
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(updatedUser);
      }
    }
  }, [members]);

  // Handlers with Supabase sync
  const handleAddMember = useCallback((newMem: Member) => {
    setMembers((prev) => [newMem, ...prev]);
    supabaseService.upsertMember(newMem);
  }, []);

  const handleLogout = useCallback(() => {
    setIsImpersonating(false);
    safeRemoveItem('masonic_impersonated_by_admin');
    setCurrentUser(null);
    safeRemoveItem('masonic_auth_user');
    safeRemoveItem('masonic_active_tab');
    setActiveTab('meu_painel');
  }, []);

  const handleImpersonateMember = useCallback((targetMember: Member) => {
    setIsImpersonating(true);
    safeSetItem('masonic_impersonated_by_admin', 'true');
    setCurrentUser(targetMember);
    safeSetItem('masonic_auth_user', JSON.stringify(targetMember));
    const targetIsAdmin = isLodgeAdmin(targetMember);
    setActiveTab(targetIsAdmin ? 'painel' : 'meu_painel');
  }, []);

  const handleExitImpersonation = useCallback(() => {
    setIsImpersonating(false);
    safeRemoveItem('masonic_impersonated_by_admin');
    setCurrentUser(SYSTEM_ADMIN_USER);
    safeSetItem('masonic_auth_user', JSON.stringify(SYSTEM_ADMIN_USER));
    setActiveTab('membros');
  }, []);

  const handleSelectUser = useCallback((m: Member) => {
    setCurrentUser(m);
    safeSetItem('masonic_auth_user', JSON.stringify(m));
  }, []);

  const activeSession = useMemo(() => sessions.find((s) => s.active), [sessions]);

  // Inactivity Alerts computation (memoized to avoid expensive recalcs on unrelated state changes)
  const inactivityAlerts = useMemo(
    () => detectInactivityAlerts(members, sessions, attendances),
    [members, sessions, attendances]
  );

  const handleUpdateMember = useCallback((updatedMem: Member) => {
    setMembers((prev) => prev.map((m) => (m.id === updatedMem.id ? updatedMem : m)));
    supabaseService.upsertMember(updatedMem);
    setCurrentUser((prevUser) => {
      if (prevUser && prevUser.id === updatedMem.id) {
        safeSetItem('masonic_auth_user', JSON.stringify(updatedMem));
        return updatedMem;
      }
      return prevUser;
    });
  }, []);

  const handleDeleteMember = useCallback((memberId: string) => {
    if (!isSystemAdmin(currentUser)) {
      console.warn('Operação restrita exclusivamente ao Administrador do Sistema (User 193245).');
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setAttendances((prev) => prev.filter((a) => a.memberId !== memberId));
    supabaseService.deleteMember(memberId);
  }, [currentUser]);

  const handleAddSession = useCallback((newSess: Session) => {
    setSessions((prev) => sortSessionsByCreationDesc([newSess, ...prev]));
    supabaseService.upsertSession(newSess);
  }, []);

  const handleUpdateSession = useCallback((updatedSess: Session) => {
    const isApproved = balaustres.some((b) => b.sessionId === updatedSess.id && b.status === 'Aprovado');
    if (isApproved) {
      console.warn('Não é permitido editar uma sessão cujo Balaústre já foi aprovado.');
      return;
    }
    setSessions((prev) => sortSessionsByCreationDesc(prev.map((s) => (s.id === updatedSess.id ? updatedSess : s))));
    supabaseService.upsertSession(updatedSess);
  }, [balaustres]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    if (!isSystemAdmin(currentUser)) {
      console.warn('Operação restrita ao Administrador do Sistema (User 193245).');
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setAttendances((prev) => prev.filter((a) => a.sessionId !== sessionId));
    setVisitors((prev) => prev.filter((v) => v.sessionId !== sessionId));
    setBalaustres((prev) => prev.filter((b) => b.sessionId !== sessionId));
    supabaseService.deleteSession(sessionId);
  }, [currentUser]);

  const handleClearAllSessions = useCallback(() => {
    if (!isSystemAdmin(currentUser)) {
      console.warn('Operação restrita ao Administrador do Sistema (User 193245).');
      return;
    }
    setSessions([]);
    setAttendances([]);
    setVisitors([]);
    setBalaustres([]);
    safeRemoveItem('masonic_sessions');
    safeRemoveItem('masonic_attendances');
    safeRemoveItem('masonic_visitors');
    safeRemoveItem('masonic_balaustres');
    supabaseService.clearAllSessions();
  }, [currentUser]);

  const handleToggleActiveSession = useCallback((sessionId: string) => {
    const targetSession = sessions.find((s) => s.id === sessionId);
    const isApproved = balaustres.some((b) => b.sessionId === sessionId && b.status === 'Aprovado');
    
    // If activating a session whose Balaustre is approved, block it
    if (!targetSession?.active && isApproved) {
      console.warn('Esta sessão não pode ser ativada pois o seu Balaústre já foi aprovado.');
      return;
    }

    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id === sessionId) {
          const sess = { ...s, active: !s.active };
          supabaseService.upsertSession(sess);
          return sess;
        }
        const sess = { ...s, active: false };
        supabaseService.upsertSession(sess);
        return sess;
      });
      return updated;
    });
  }, [sessions, balaustres]);

  const handleRecordAttendance = useCallback((memberId: string, method: 'QR_CODE' | 'MANUAL') => {
    if (!activeSession) return;

    // Check if already recorded
    const existing = attendances.find((a) => a.sessionId === activeSession.id && a.memberId === memberId);
    if (existing) return;

    const newAtt: AttendanceRecord = {
      id: 'att-' + Date.now(),
      sessionId: activeSession.id,
      memberId,
      timestamp: new Date().toISOString(),
      method,
      confirmedBy: method === 'MANUAL' ? currentUser.fullName : undefined,
    };

    setAttendances((prev) => [...prev, newAtt]);
    supabaseService.insertAttendance(newAtt);
  }, [activeSession, attendances, currentUser]);

  const handleRemoveAttendance = useCallback((memberId: string) => {
    if (!activeSession) return;
    setAttendances((prev) => prev.filter((a) => !(a.sessionId === activeSession.id && a.memberId === memberId)));
    supabaseService.deleteAttendance(activeSession.id, memberId);
  }, [activeSession]);

  const handleAddVisitor = useCallback((visitor: VisitorRecord) => {
    setVisitors((prev) => [...prev, visitor]);
    supabaseService.insertVisitor(visitor);
  }, []);

  const handleAddBalaustre = useCallback((balaustre: Balaustre) => {
    setBalaustres((prev) => {
      const exists = prev.some((b) => b.id === balaustre.id);
      if (exists) {
        return prev.map((b) => (b.id === balaustre.id ? balaustre : b));
      }
      return [balaustre, ...prev];
    });
    supabaseService.upsertBalaustre(balaustre);
  }, []);

  const isCurrentUserCheckedIn = useMemo(() => {
    return activeSession && currentUser
      ? attendances.some((a) => a.sessionId === activeSession.id && a.memberId === currentUser.id)
      : false;
  }, [activeSession, attendances, currentUser]);

  const isAdmin = useMemo(() => isLodgeAdmin(currentUser), [currentUser]);

  // Auth check gate (placed unconditionally after all component hooks)
  if (!currentUser) {
    return (
      <>
        <LoginScreen
          members={members}
          onLogin={(user) => {
            setCurrentUser(user);
            setActiveTab('meu_painel');
          }}
          onRegisterMember={handleAddMember}
          onOpenRegistration={() => setIsPublicRegistrationOpen(true)}
        />

        <PublicMemberRegistrationModal
          isOpen={isPublicRegistrationOpen}
          onClose={handleClosePublicRegistration}
          onAddMember={handleAddMember}
          onSuccessLogin={(m) => {
            setCurrentUser(m);
            setActiveTab('meu_painel');
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      {/* Lateral Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        allMembers={members}
        onLogout={handleLogout}
        inactivityAlertsCount={inactivityAlerts.length}
        hasActiveSession={Boolean(activeSession)}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isImpersonating={isImpersonating}
        onExitImpersonation={handleExitImpersonation}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Master Impersonation Warning Banner */}
        {isImpersonating && currentUser && (
          <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 px-4 py-2 sm:py-2.5 shadow-xl border-b border-amber-600/50 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="p-1 px-1.5 rounded bg-slate-950 text-amber-400 font-mono font-bold text-[10px] sm:text-xs shrink-0">
                  MASTER ADMIN
                </span>
                <p className="text-xs sm:text-sm font-medium truncate">
                  <strong className="font-bold">Modo de Simulação de Obreiro:</strong> Conectado como{' '}
                  <strong className="underline underline-offset-2 font-bold">{currentUser.fullName}</strong>{' '}
                  <span className="opacity-90 hidden sm:inline">
                    (CIM: {currentUser.cim} • Grau {currentUser.degreeLevel}: {currentUser.degree}
                    {currentUser.currentOfficerRole ? ` • ${currentUser.currentOfficerRole}` : ''})
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleExitImpersonation}
                className="bg-slate-950 hover:bg-slate-900 text-amber-300 hover:text-amber-200 border border-slate-800 px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-md active:scale-95 shrink-0 ml-auto"
                title="Encerrar visualização deste obreiro e retornar ao Administrador Master"
              >
                <span>Voltar ao Admin Master</span>
              </button>
            </div>
          </div>
        )}

        {/* Top Header Bar */}
        <TopHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          allMembers={members}
          setCurrentUser={handleSelectUser}
          onLogout={handleLogout}
          hasActiveSession={Boolean(activeSession)}
          supabaseStatus={supabaseStatus}
          onOpenSupabaseModal={handleOpenSupabaseModal}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          isImpersonating={isImpersonating}
          onExitImpersonation={handleExitImpersonation}
          onUpdateMember={handleUpdateMember}
          onOpenEditProfile={() => setIsEditProfileOpen(true)}
        />

        {/* Main Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {(activeTab === 'painel' || activeTab === 'meu_painel' || (!isAdmin && (activeTab === 'membros' || activeTab === 'visitantes'))) && (
          <DashboardOverview
            activeSession={activeSession}
            sessions={sessions}
            members={members}
            attendances={attendances}
            visitors={visitors}
            inactivityAlerts={inactivityAlerts}
            currentUser={currentUser}
            setActiveTab={setActiveTab}
            onQuickCheckIn={() => handleRecordAttendance(currentUser.id, 'QR_CODE')}
            isCurrentUserCheckedIn={isCurrentUserCheckedIn}
            forcePersonalView={activeTab === 'meu_painel' || !isAdmin}
            onUpdateMember={handleUpdateMember}
            onOpenEditProfile={() => setIsEditProfileOpen(true)}
          />
        )}

        {activeTab === 'membros' && isAdmin && (
          <MemberManagement
            members={members}
            currentUser={currentUser}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
            onDeleteMember={handleDeleteMember}
            onImpersonate={handleImpersonateMember}
            sessions={sessions}
            attendances={attendances}
          />
        )}

        {activeTab === 'sessoes' && (
          <SessionManagement
            sessions={sessions}
            members={members}
            currentUser={currentUser}
            balaustres={balaustres}
            attendances={attendances}
            visitors={visitors}
            onAddSession={handleAddSession}
            onUpdateSession={handleUpdateSession}
            onToggleActiveSession={handleToggleActiveSession}
            onDeleteSession={handleDeleteSession}
            onClearAllSessions={handleClearAllSessions}
          />
        )}

        {activeTab === 'chamada_qr' && (
          <LiveSessionPanel
            activeSession={activeSession}
            members={members}
            attendances={attendances}
            visitors={visitors}
            currentUser={currentUser}
            onRecordAttendance={handleRecordAttendance}
            onRemoveAttendance={handleRemoveAttendance}
            onAddVisitor={handleAddVisitor}
            initialTab="qr_projector"
            isVisitorsOnlyTab={false}
          />
        )}

        {activeTab === 'visitantes' && isAdmin && (
          <LiveSessionPanel
            activeSession={activeSession}
            members={members}
            attendances={attendances}
            visitors={visitors}
            currentUser={currentUser}
            onRecordAttendance={handleRecordAttendance}
            onRemoveAttendance={handleRemoveAttendance}
            onAddVisitor={handleAddVisitor}
            initialTab="visitor_form"
            isVisitorsOnlyTab={true}
          />
        )}

        {activeTab === 'balaustre' && (
          <BalaustreIntegration
            balaustres={balaustres}
            sessions={sessions}
            members={members}
            attendances={attendances}
            visitors={visitors}
            currentUser={currentUser}
            onAddBalaustre={handleAddBalaustre}
          />
        )}

        {activeTab === 'calendario' && (
          <MasonicCalendar
            members={members}
            sessions={sessions}
            currentUser={currentUser}
            onUpdateMember={handleUpdateMember}
            customEvents={customEvents}
            onSaveCustomEvent={handleSaveCustomEvent}
            onDeleteCustomEvent={handleDeleteCustomEvent}
          />
        )}

        {activeTab === 'relatorios' && (
          <FrequencyReports
            members={members}
            sessions={sessions}
            attendances={attendances}
            inactivityAlerts={inactivityAlerts}
            currentUser={currentUser}
          />
        )}
      </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500 mt-auto">
          <p className="font-serif-masonic text-amber-500/80 tracking-wider">
            A∴R∴L∴S∴ Fraternidade da Franca Nº3571
          </p>
          <p className="mt-1 text-[11px] text-slate-600">
            Sistema de Controle de Presença, Chanceler e Secretaria
          </p>
        </footer>
      </div>

      {/* Supabase Status and Setup Modal (System Admin 193245 only) */}
      {isSystemAdmin(currentUser) && (
        <SupabaseStatusModal
          isOpen={isSupabaseModalOpen}
          onClose={() => setIsSupabaseModalOpen(false)}
          status={supabaseStatus}
          onRefreshStatus={refreshSupabaseStatus}
          currentData={{
            members,
            sessions,
            attendances,
            visitors,
            balaustres,
          }}
          onDataSynced={() => {
            refreshSupabaseStatus();
          }}
        />
      )}
      {/* Public/Admin Member Registration Modal */}
      <PublicMemberRegistrationModal
        isOpen={isPublicRegistrationOpen}
        onClose={handleClosePublicRegistration}
        onAddMember={handleAddMember}
      />

      {/* Obreiro Edit Profile Modal (Meu Perfil) */}
      {currentUser && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          currentUser={currentUser}
          onSave={handleUpdateMember}
        />
      )}
    </div>
  );
}
