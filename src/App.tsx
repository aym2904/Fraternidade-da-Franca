import React, { useState, useEffect } from 'react';
import {
  INITIAL_MEMBERS,
  INITIAL_SESSIONS,
  INITIAL_ATTENDANCES,
  INITIAL_VISITORS,
  INITIAL_JUSTIFICATIONS,
  INITIAL_BALAUSTRES
} from './data/mockData';
import { Member, Session, AttendanceRecord, VisitorRecord, Justification, Balaustre } from './types/masonic';
import { detectInactivityAlerts, sortSessionsByCreationDesc } from './utils/masonicUtils';
import { supabaseService, SupabaseConnectionStatus } from './lib/supabaseService';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardOverview } from './components/DashboardOverview';
import { MemberManagement } from './components/MemberManagement';
import { SessionManagement } from './components/SessionManagement';
import { LiveSessionPanel } from './components/LiveSessionPanel';
import { JustificationsManager } from './components/JustificationsManager';
import { BalaustreIntegration } from './components/BalaustreIntegration';
import { FrequencyReports } from './components/FrequencyReports';
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

  const [justifications, setJustifications] = useState<Justification[]>(() => {
    const saved = safeGetItem('masonic_justifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return INITIAL_JUSTIFICATIONS;
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

  const handleClosePublicRegistration = () => {
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
  };

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

  const refreshSupabaseStatus = async () => {
    try {
      const status = await supabaseService.checkConnection();
      setSupabaseStatus(status);
    } catch (e) {
      console.error('Supabase diagnostic check failed:', e);
    }
  };

  // Supabase initial sync & realtime subscription
  useEffect(() => {
    async function syncDataFromSupabase() {
      try {
        await refreshSupabaseStatus();

        const remoteMembers = await supabaseService.getMembers();
        if (remoteMembers && remoteMembers.length > 0) {
          setMembers(remoteMembers);
        }
        const remoteSessions = await supabaseService.getSessions();
        if (remoteSessions && remoteSessions.length > 0) {
          setSessions(sortSessionsByCreationDesc(remoteSessions));
        }

        const remoteAttendances = await supabaseService.getAttendances();
        if (remoteAttendances && remoteAttendances.length > 0) {
          setAttendances(remoteAttendances);
        }

        const remoteVisitors = await supabaseService.getVisitors();
        if (remoteVisitors && remoteVisitors.length > 0) {
          setVisitors(remoteVisitors);
        }

        const remoteJustifications = await supabaseService.getJustifications();
        if (remoteJustifications && remoteJustifications.length > 0) {
          setJustifications(remoteJustifications);
        }

        const remoteBalaustres = await supabaseService.getBalaustres();
        if (remoteBalaustres && remoteBalaustres.length > 0) {
          setBalaustres(remoteBalaustres);
        }
      } catch (err) {
        console.warn('Initial Supabase sync fallback to local:', err);
      }
    }

    syncDataFromSupabase();

    // Realtime channel subscription
    const unsubscribeRealtime = supabaseService.subscribeToAll(() => {
      syncDataFromSupabase();
    });

    // Auto-polling connection re-check & attendance sync every 10s
    const interval = setInterval(() => {
      refreshSupabaseStatus();
      supabaseService.getAttendances().then((remoteAttendances) => {
        if (remoteAttendances && remoteAttendances.length > 0) {
          setAttendances(remoteAttendances);
        }
      }).catch(() => {});
    }, 10000);

    return () => {
      unsubscribeRealtime();
      clearInterval(interval);
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
    safeSetItem('masonic_justifications', JSON.stringify(justifications));
  }, [justifications]);

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
  const handleAddMember = (newMem: Member) => {
    setMembers((prev) => [newMem, ...prev]);
    supabaseService.upsertMember(newMem);
  };

  // Auth check gate
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

  const handleLogout = () => {
    setIsImpersonating(false);
    safeRemoveItem('masonic_impersonated_by_admin');
    setCurrentUser(null);
    safeRemoveItem('masonic_auth_user');
    safeRemoveItem('masonic_active_tab');
    setActiveTab('meu_painel');
  };

  const handleImpersonateMember = (targetMember: Member) => {
    setIsImpersonating(true);
    safeSetItem('masonic_impersonated_by_admin', 'true');
    setCurrentUser(targetMember);
    safeSetItem('masonic_auth_user', JSON.stringify(targetMember));
    const targetIsAdmin = isLodgeAdmin(targetMember);
    setActiveTab(targetIsAdmin ? 'painel' : 'meu_painel');
  };

  const handleExitImpersonation = () => {
    setIsImpersonating(false);
    safeRemoveItem('masonic_impersonated_by_admin');
    setCurrentUser(SYSTEM_ADMIN_USER);
    safeSetItem('masonic_auth_user', JSON.stringify(SYSTEM_ADMIN_USER));
    setActiveTab('membros');
  };

  const handleSelectUser = (m: Member) => {
    setCurrentUser(m);
    safeSetItem('masonic_auth_user', JSON.stringify(m));
  };

  const activeSession = sessions.find((s) => s.active);

  // Inactivity Alerts computation
  const inactivityAlerts = detectInactivityAlerts(members, sessions, attendances, justifications);
  const pendingJustificationsCount = justifications.filter((j) => j.status === 'Pendente').length;

  const handleUpdateMember = (updatedMem: Member) => {
    setMembers((prev) => prev.map((m) => (m.id === updatedMem.id ? updatedMem : m)));
    supabaseService.upsertMember(updatedMem);
    if (currentUser && currentUser.id === updatedMem.id) {
      setCurrentUser(updatedMem);
      safeSetItem('masonic_auth_user', JSON.stringify(updatedMem));
    }
  };

  const handleDeleteMember = (memberId: string) => {
    if (!isSystemAdmin(currentUser)) {
      console.warn('Operação restrita exclusivamente ao Administrador do Sistema (User 193245).');
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setAttendances((prev) => prev.filter((a) => a.memberId !== memberId));
    setJustifications((prev) => prev.filter((j) => j.memberId !== memberId));
    supabaseService.deleteMember(memberId);
  };

  const handleAddSession = (newSess: Session) => {
    setSessions((prev) => sortSessionsByCreationDesc([newSess, ...prev]));
    supabaseService.upsertSession(newSess);
  };

  const handleUpdateSession = (updatedSess: Session) => {
    const isApproved = balaustres.some((b) => b.sessionId === updatedSess.id && b.status === 'Aprovado');
    if (isApproved) {
      console.warn('Não é permitido editar uma sessão cujo Balaústre já foi aprovado.');
      return;
    }
    setSessions((prev) => sortSessionsByCreationDesc(prev.map((s) => (s.id === updatedSess.id ? updatedSess : s))));
    supabaseService.upsertSession(updatedSess);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!isSystemAdmin(currentUser)) {
      console.warn('Operação restrita ao Administrador do Sistema (User 193245).');
      return;
    }
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setAttendances((prev) => prev.filter((a) => a.sessionId !== sessionId));
    setVisitors((prev) => prev.filter((v) => v.sessionId !== sessionId));
    setJustifications((prev) => prev.filter((j) => j.sessionId !== sessionId));
    setBalaustres((prev) => prev.filter((b) => b.sessionId !== sessionId));
    supabaseService.deleteSession(sessionId);
  };

  const handleClearAllSessions = () => {
    if (!isSystemAdmin(currentUser)) {
      console.warn('Operação restrita ao Administrador do Sistema (User 193245).');
      return;
    }
    setSessions([]);
    setAttendances([]);
    setVisitors([]);
    setJustifications([]);
    setBalaustres([]);
    safeRemoveItem('masonic_sessions');
    safeRemoveItem('masonic_attendances');
    safeRemoveItem('masonic_visitors');
    safeRemoveItem('masonic_justifications');
    safeRemoveItem('masonic_balaustres');
    supabaseService.clearAllSessions();
  };

  const handleToggleActiveSession = (sessionId: string) => {
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
  };

  const handleRecordAttendance = (memberId: string, method: 'QR_CODE' | 'MANUAL') => {
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
  };

  const handleRemoveAttendance = (memberId: string) => {
    if (!activeSession) return;
    setAttendances((prev) => prev.filter((a) => !(a.sessionId === activeSession.id && a.memberId === memberId)));
    supabaseService.deleteAttendance(activeSession.id, memberId);
  };

  const handleAddVisitor = (visitor: VisitorRecord) => {
    setVisitors((prev) => [...prev, visitor]);
    supabaseService.insertVisitor(visitor);
  };

  const handleAddJustification = (justification: Justification) => {
    setJustifications((prev) => [justification, ...prev]);
    supabaseService.upsertJustification(justification);
  };

  const handleReviewJustification = (id: string, status: 'Aprovado' | 'Rejeitado', reviewerNotes?: string) => {
    setJustifications((prev) =>
      prev.map((j) => {
        if (j.id === id) {
          const updated = {
            ...j,
            status,
            reviewerNotes,
            reviewedAt: new Date().toISOString(),
          };
          supabaseService.upsertJustification(updated);
          return updated;
        }
        return j;
      })
    );
  };

  const handleAddBalaustre = (balaustre: Balaustre) => {
    setBalaustres((prev) => {
      const exists = prev.some((b) => b.id === balaustre.id);
      if (exists) {
        return prev.map((b) => (b.id === balaustre.id ? balaustre : b));
      }
      return [balaustre, ...prev];
    });
    supabaseService.upsertBalaustre(balaustre);
  };

  const isCurrentUserCheckedIn = activeSession
    ? attendances.some((a) => a.sessionId === activeSession.id && a.memberId === currentUser.id)
    : false;

  const isAdmin = isLodgeAdmin(currentUser);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      {/* Lateral Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        allMembers={members}
        onLogout={handleLogout}
        pendingJustificationsCount={pendingJustificationsCount}
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
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
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
            justifications={justifications}
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
            justifications={justifications}
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
            justifications={justifications}
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
            justifications={justifications}
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
            justifications={justifications}
            currentUser={currentUser}
            onRecordAttendance={handleRecordAttendance}
            onRemoveAttendance={handleRemoveAttendance}
            onAddVisitor={handleAddVisitor}
            initialTab="visitor_form"
            isVisitorsOnlyTab={true}
          />
        )}

        {activeTab === 'justificativas' && (
          <JustificationsManager
            justifications={justifications}
            members={members}
            sessions={sessions}
            currentUser={currentUser}
            onAddJustification={handleAddJustification}
            onReviewJustification={handleReviewJustification}
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

        {activeTab === 'relatorios' && (
          <FrequencyReports
            members={members}
            sessions={sessions}
            attendances={attendances}
            justifications={justifications}
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
            justifications,
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
