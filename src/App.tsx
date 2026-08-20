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
import { detectInactivityAlerts } from './utils/masonicUtils';
import { supabaseService, SupabaseConnectionStatus } from './lib/supabaseService';
import { Navbar } from './components/Navbar';
import { DashboardOverview } from './components/DashboardOverview';
import { MemberManagement } from './components/MemberManagement';
import { SessionManagement } from './components/SessionManagement';
import { LiveSessionPanel } from './components/LiveSessionPanel';
import { JustificationsManager } from './components/JustificationsManager';
import { BalaustreIntegration } from './components/BalaustreIntegration';
import { FrequencyReports } from './components/FrequencyReports';
import { LoginScreen } from './components/LoginScreen';
import { SupabaseStatusModal } from './components/SupabaseStatusModal';
import { isLodgeAdmin, isSystemAdmin } from './utils/authUtils';

export default function App() {
  // Purge legacy test mock data from LocalStorage if present
  useEffect(() => {
    try {
      const savedMembers = localStorage.getItem('masonic_members');
      if (
        savedMembers &&
        (savedMembers.includes('m1') ||
          savedMembers.includes('Joaquim Silva') ||
          savedMembers.includes('admin-1') ||
          savedMembers.includes('admin_sys') ||
          savedMembers.includes('Administrador do Sistema'))
      ) {
        localStorage.removeItem('masonic_members');
        localStorage.removeItem('masonic_sessions');
        localStorage.removeItem('masonic_attendances');
        localStorage.removeItem('masonic_visitors');
        localStorage.removeItem('masonic_justifications');
        localStorage.removeItem('masonic_balaustres');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // State with LocalStorage & Supabase fallback
  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('masonic_members');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter(
            (m) =>
              m.id !== 'm1' &&
              m.id !== 'admin-1' &&
              m.id !== 'admin_sys' &&
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
    localStorage.removeItem('masonic_sessions');
    return [];
  });

  const [attendances, setAttendances] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('masonic_attendances');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && !parsed.some(a => a.id === 'att-1')) return parsed;
      } catch (e) {}
    }
    return INITIAL_ATTENDANCES;
  });

  const [visitors, setVisitors] = useState<VisitorRecord[]>(() => {
    const saved = localStorage.getItem('masonic_visitors');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && !parsed.some(v => v.id === 'v1')) return parsed;
      } catch (e) {}
    }
    return INITIAL_VISITORS;
  });

  const [justifications, setJustifications] = useState<Justification[]>(() => {
    const saved = localStorage.getItem('masonic_justifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && !parsed.some(j => j.id === 'j1')) return parsed;
      } catch (e) {}
    }
    return INITIAL_JUSTIFICATIONS;
  });

  const [balaustres, setBalaustres] = useState<Balaustre[]>(() => {
    const saved = localStorage.getItem('masonic_balaustres');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && !parsed.some(b => b.id === 'b-1484')) return parsed;
      } catch (e) {}
    }
    return INITIAL_BALAUSTRES;
  });

  // Logged-in member state (restored from LocalStorage if active)
  const [currentUser, setCurrentUser] = useState<Member | null>(() => {
    try {
      const saved = localStorage.getItem('masonic_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) return parsed;
      }
    } catch (e) {
      console.error('Error restoring session:', e);
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<string>('painel');

  // Supabase diagnostic and connection status state
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseConnectionStatus | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);

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
        if (remoteSessions !== null) setSessions(remoteSessions);

        const remoteAttendances = await supabaseService.getAttendances();
        if (remoteAttendances !== null) setAttendances(remoteAttendances);

        const remoteVisitors = await supabaseService.getVisitors();
        if (remoteVisitors && remoteVisitors.length > 0) setVisitors(remoteVisitors);

        const remoteJustifications = await supabaseService.getJustifications();
        if (remoteJustifications && remoteJustifications.length > 0) setJustifications(remoteJustifications);

        const remoteBalaustres = await supabaseService.getBalaustres();
        if (remoteBalaustres && remoteBalaustres.length > 0) setBalaustres(remoteBalaustres);
      } catch (err) {
        console.warn('Initial Supabase sync fallback to local:', err);
      }
    }

    syncDataFromSupabase();

    // Realtime channel subscription
    const unsubscribeRealtime = supabaseService.subscribeToAll(() => {
      syncDataFromSupabase();
    });

    // Auto-polling connection re-check & attendance sync every 3s
    const interval = setInterval(() => {
      refreshSupabaseStatus();
      supabaseService.getAttendances().then((remoteAttendances) => {
        if (remoteAttendances !== null) {
          setAttendances(remoteAttendances);
        }
      }).catch(() => {});
    }, 3000);

    return () => {
      unsubscribeRealtime();
      clearInterval(interval);
    };
  }, []);

  // Persistence side effects
  useEffect(() => {
    localStorage.setItem('masonic_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('masonic_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('masonic_attendances', JSON.stringify(attendances));
  }, [attendances]);

  useEffect(() => {
    localStorage.setItem('masonic_visitors', JSON.stringify(visitors));
  }, [visitors]);

  useEffect(() => {
    localStorage.setItem('masonic_justifications', JSON.stringify(justifications));
  }, [justifications]);

  useEffect(() => {
    localStorage.setItem('masonic_balaustres', JSON.stringify(balaustres));
  }, [balaustres]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('masonic_auth_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('masonic_auth_user');
    }
  }, [currentUser]);

  // Keep logged in user object updated when members list changes
  useEffect(() => {
    if (currentUser && currentUser.id !== 'sys-admin-193245') {
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
      <LoginScreen
        members={members}
        onLogin={(user) => {
          setCurrentUser(user);
          setActiveTab('painel');
        }}
        onRegisterMember={handleAddMember}
      />
    );
  }

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('masonic_auth_user');
  };

  const handleSelectUser = (m: Member) => {
    setCurrentUser(m);
    localStorage.setItem('masonic_auth_user', JSON.stringify(m));
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
    }
  };

  const handleAddSession = (newSess: Session) => {
    setSessions((prev) => [newSess, ...prev]);
    supabaseService.upsertSession(newSess);
  };

  const handleUpdateSession = (updatedSess: Session) => {
    setSessions((prev) => prev.map((s) => (s.id === updatedSess.id ? updatedSess : s)));
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
    localStorage.removeItem('masonic_sessions');
    localStorage.removeItem('masonic_attendances');
    localStorage.removeItem('masonic_visitors');
    localStorage.removeItem('masonic_justifications');
    localStorage.removeItem('masonic_balaustres');
    supabaseService.clearAllSessions();
  };

  const handleToggleActiveSession = (sessionId: string) => {
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Masonic Header & Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        allMembers={members}
        setCurrentUser={handleSelectUser}
        onLogout={handleLogout}
        pendingJustificationsCount={pendingJustificationsCount}
        inactivityAlertsCount={inactivityAlerts.length}
        hasActiveSession={Boolean(activeSession)}
        supabaseStatus={supabaseStatus}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'painel' && (
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
          />
        )}

        {activeTab === 'membros' && isAdmin && (
          <MemberManagement
            members={members}
            currentUser={currentUser}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
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
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p className="font-serif-masonic text-amber-500/80 tracking-wider">
          A∴R∴L∴S∴ Fraternidade da Franca Nº3571
        </p>
        <p className="mt-1 text-[11px] text-slate-600">
          Sistema de Controle de Presença, Chanceler e Secretaria
        </p>
      </footer>

      {/* Supabase Status and Setup Modal (Admin only) */}
      {isAdmin && (
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
    </div>
  );
}
