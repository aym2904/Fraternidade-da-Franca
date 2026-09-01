import { supabase, SUPABASE_URL } from './supabase';
import { Member, Session, AttendanceRecord, VisitorRecord, Balaustre } from '../types/masonic';

export interface RealtimeChangePayload<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  new: T;
  old: T;
}

export interface RealtimeDeltasCallbacks {
  onMemberChange?: (payload: RealtimeChangePayload<Member>) => void;
  onSessionChange?: (payload: RealtimeChangePayload<Session>) => void;
  onAttendanceChange?: (payload: RealtimeChangePayload<AttendanceRecord>) => void;
  onVisitorChange?: (payload: RealtimeChangePayload<VisitorRecord>) => void;
  onBalaustreChange?: (payload: RealtimeChangePayload<Balaustre>) => void;
}

export interface SupabaseTableStatus {
  table: string;
  exists: boolean;
  count?: number;
  error?: string;
  code?: string;
}

export interface SupabaseConnectionStatus {
  connected: boolean;
  url: string;
  hasTables: boolean;
  tableStatuses: SupabaseTableStatus[];
  errorMessage?: string;
  lastChecked: string;
}

export const SUPABASE_SETUP_SQL = `-- SCRIPT DE CRIAÇÃO AUTOMÁTICA DAS TABELAS DO SISTEMA NO SUPABASE
-- Cole este script no Supabase -> SQL Editor -> Run (Executar)

-- 1. TABELA DE MEMBROS (OBREIROS)
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  "photoUrl" TEXT,
  cim TEXT,
  degree TEXT,
  "degreeLevel" INT,
  status TEXT,
  "currentOfficerRole" TEXT,
  "joinedDate" TEXT,
  phone TEXT,
  password TEXT,
  "birthDate" TEXT,
  "initiationDate" TEXT,
  "elevationDate" TEXT,
  "exaltationDate" TEXT,
  "installationDate" TEXT,
  "affiliationDate" TEXT,
  "regularizationDate" TEXT,
  "philosophicalDegree" INT,
  notes TEXT,
  wife JSONB,
  children JSONB
);

-- MIGRAÇÃO DE COLUNAS ADICIONAIS CASO A TABELA DE MEMBROS JÁ EXISTA
ALTER TABLE members ADD COLUMN IF NOT EXISTS "birthDate" TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS "initiationDate" TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS "elevationDate" TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS "exaltationDate" TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS "installationDate" TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS "affiliationDate" TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS "regularizationDate" TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS "philosophicalDegree" INT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS wife JSONB;
ALTER TABLE members ADD COLUMN IF NOT EXISTS children JSONB;

-- 2. TABELA DE SESSÕES
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT,
  subtype TEXT,
  degree TEXT,
  "degreeLevel" INT,
  date TEXT,
  time TEXT,
  location TEXT,
  "qrCodeToken" TEXT,
  active BOOLEAN DEFAULT false,
  officers JSONB,
  notes TEXT,
  "createdAt" TEXT
);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

-- 3. TABELA DE PRESENÇAS / CHAMADA
CREATE TABLE IF NOT EXISTS attendances (
  id TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  timestamp TEXT,
  method TEXT,
  "confirmedBy" TEXT
);

-- 4. TABELA DE VISITANTES
CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  cim TEXT,
  "homeLodge" TEXT,
  potencia TEXT,
  degree TEXT,
  "degreeLevel" INT,
  timestamp TEXT
);

-- 5. TABELA DE BALAÚSTRES
CREATE TABLE IF NOT EXISTS balaustres (
  id TEXT PRIMARY KEY,
  "sessionId" TEXT,
  number TEXT,
  title TEXT,
  date TEXT,
  "summaryText" TEXT,
  content TEXT,
  status TEXT,
  "createdAt" TEXT
);

-- HABILITAR ROW LEVEL SECURITY (RLS) E LIBERAR ACESSO PÚBLICO (ANON)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE balaustres ENABLE ROW LEVEL SECURITY;

-- DADOS DE PERMISSÃO COMPLETA PARA OS PAPÉIS DO SUPABASE (anon, authenticated e service_role)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Allow public access members" ON members;
CREATE POLICY "Allow public access members" ON members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access sessions" ON sessions;
CREATE POLICY "Allow public access sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access attendances" ON attendances;
CREATE POLICY "Allow public access attendances" ON attendances FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access visitors" ON visitors;
CREATE POLICY "Allow public access visitors" ON visitors FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access balaustres" ON balaustres;
CREATE POLICY "Allow public access balaustres" ON balaustres FOR ALL USING (true) WITH CHECK (true);

-- HABILITAR REALTIME INSTANTÂNEO NO SUPABASE
ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE attendances;
ALTER PUBLICATION supabase_realtime ADD TABLE visitors;
ALTER PUBLICATION supabase_realtime ADD TABLE balaustres;
`;

export const supabaseService = {
  // CONNECTION DIAGNOSTIC
  async checkConnection(): Promise<SupabaseConnectionStatus> {
    const targetTables = ['members', 'sessions', 'attendances', 'visitors', 'balaustres'];
    const tableStatuses: SupabaseTableStatus[] = [];
    let isApiConnected = false;
    let globalError: string | undefined = undefined;

    for (const table of targetTables) {
      try {
        const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
          isApiConnected = true; // API responded!
          if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.code === '42P01') {
            tableStatuses.push({
              table,
              exists: false,
              error: `Tabela '${table}' ausente no Supabase (${error.code || 'PGRST205'})`,
              code: error.code,
            });
          } else if (error.code === '42501' || error.message?.includes('permission denied')) {
            tableStatuses.push({
              table,
              exists: false,
              error: `Tabela existe, mas precisa da permissão GRANT (Erro 42501)`,
              code: error.code,
            });
            globalError = 'Tabelas criadas, porém acesso negado (Erro 42501). Copie e rode o script SQL atualizado para liberar o acesso (GRANT).';
          } else {
            tableStatuses.push({
              table,
              exists: false,
              error: error.message,
              code: error.code,
            });
            globalError = error.message;
          }
        } else {
          isApiConnected = true;
          tableStatuses.push({
            table,
            exists: true,
            count: count ?? data?.length ?? 0,
          });
        }
      } catch (err: any) {
        tableStatuses.push({
          table,
          exists: false,
          error: err?.message || 'Falha na requisição ao Supabase',
        });
        globalError = err?.message || 'Erro de conexão de rede';
      }
    }

    const hasTables = tableStatuses.length > 0 && tableStatuses.every((t) => t.exists);

    return {
      connected: isApiConnected,
      url: SUPABASE_URL,
      hasTables,
      tableStatuses,
      errorMessage: globalError,
      lastChecked: new Date().toLocaleTimeString('pt-BR'),
    };
  },

  // 1. MEMBERS CRUD
  async getMembers(): Promise<Member[] | null> {
    try {
      const { data, error } = await supabase.from('members').select('*');
      if (error) {
        console.warn('[Supabase] getMembers error:', error.message);
        return null;
      }
      if (!data || data.length === 0) return null;
      return (data as Member[]).filter(
        (m) => m.id !== 'admin-1' && m.id !== 'admin_sys' && m.fullName !== 'Administrador do Sistema'
      );
    } catch (err) {
      console.warn('[Supabase] getMembers exception:', err);
      return null;
    }
  },

  async upsertMember(member: Member): Promise<{ success: boolean; error?: string }> {
    try {
      this.broadcastLiveDelta('members', 'INSERT', member);
      // 1. Tentar inserção/atualização com todos os campos (incluindo vínculos familiares e datas comemorativas)
      const { error } = await supabase.from('members').upsert(member);
      if (!error) {
        return { success: true };
      }

      // 2. Se a tabela do Supabase ainda não tiver as colunas estendidas (PGRST204: schema cache missing column)
      if (error.code === 'PGRST204' || (error.message && error.message.includes('column'))) {
        console.warn(`[Supabase] Coluna estendida ausente na tabela members (${error.message}). Realizando fallback para salvar dados cadastrais base no Supabase...`);
        
        const baseMemberPayload: Record<string, any> = {
          id: member.id,
          fullName: member.fullName,
          cpf: member.cpf,
          email: member.email,
          photoUrl: member.photoUrl,
          cim: member.cim,
          degree: member.degree,
          degreeLevel: member.degreeLevel,
          status: member.status,
          currentOfficerRole: member.currentOfficerRole || null,
          joinedDate: member.joinedDate,
          phone: member.phone,
          password: member.password || '',
        };

        const { error: fallbackError } = await supabase.from('members').upsert(baseMemberPayload);
        if (!fallbackError) {
          return { success: true };
        }
        console.error('[Supabase] upsertMember fallback error:', fallbackError);
        return { success: false, error: fallbackError.message };
      }

      if (error.code === 'PGRST205') {
        console.warn('[Supabase] Tabela "members" ainda não foi criada no Supabase. Os dados estão salvos localmente.');
      } else {
        console.error('[Supabase] upsertMember error:', error);
      }
      return { success: false, error: error.message };
    } catch (err: any) {
      console.warn('[Supabase] upsertMember exception:', err);
      return { success: false, error: err?.message || 'Erro de conexão' };
    }
  },

  async deleteMember(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.broadcastLiveDelta('members', 'DELETE', { id });
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('[Supabase] Tabela "members" ainda não foi criada no Supabase.');
        } else {
          console.error('[Supabase] deleteMember error:', error);
        }
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('[Supabase] deleteMember exception:', err);
      return { success: false, error: err?.message || 'Erro de conexão' };
    }
  },

  // 2. SESSIONS CRUD
  async getSessions(): Promise<Session[] | null> {
    try {
      const { data, error } = await supabase.from('sessions').select('*');
      if (error) {
        console.warn('[Supabase] getSessions error:', error.message);
        return null;
      }
      if (!data || data.length === 0) return null;
      return (data as Session[]) || [];
    } catch (err) {
      console.warn('[Supabase] getSessions exception:', err);
      return null;
    }
  },

  async upsertSession(session: Session): Promise<{ success: boolean; error?: string }> {
    try {
      this.broadcastLiveDelta('sessions', 'INSERT', session);
      const { error } = await supabase.from('sessions').upsert(session);
      if (!error) {
        return { success: true };
      }

      if (error.code === 'PGRST204' || (error.message && error.message.includes('column'))) {
        const baseSessionPayload: Record<string, any> = {
          id: session.id,
          title: session.title,
          type: session.type,
          subtype: session.subtype,
          degree: session.degree,
          degreeLevel: session.degreeLevel,
          date: session.date,
          time: session.time,
          location: session.location,
          qrCodeToken: session.qrCodeToken,
          active: session.active,
          officers: session.officers,
          notes: session.notes,
        };
        const { error: fallbackError } = await supabase.from('sessions').upsert(baseSessionPayload);
        if (!fallbackError) {
          return { success: true };
        }
        return { success: false, error: fallbackError.message };
      }

      if (error.code === 'PGRST205') {
        console.warn('[Supabase] Tabela "sessions" ainda não foi criada no Supabase.');
      } else {
        console.error('[Supabase] upsertSession error:', error);
      }
      return { success: false, error: error.message };
    } catch (err: any) {
      console.warn('[Supabase] upsertSession exception:', err);
      return { success: false, error: err?.message || 'Erro de conexão' };
    }
  },

  async deleteSession(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.broadcastLiveDelta('sessions', 'DELETE', { id });
      await supabase.from('attendances').delete().eq('sessionId', id);
      await supabase.from('visitors').delete().eq('sessionId', id);
      await supabase.from('balaustres').delete().eq('sessionId', id);
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('[Supabase] Tabela "sessions" ainda não foi criada no Supabase.');
        } else {
          console.error('[Supabase] deleteSession error:', error);
        }
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('[Supabase] deleteSession exception:', err);
      return { success: false, error: err?.message || 'Erro de conexão' };
    }
  },

  async clearAllSessions(): Promise<{ success: boolean; error?: string }> {
    try {
      await supabase.from('attendances').delete().neq('id', '');
      await supabase.from('visitors').delete().neq('id', '');
      await supabase.from('balaustres').delete().neq('id', '');
      const { error } = await supabase.from('sessions').delete().neq('id', '');
      if (error && error.code !== 'PGRST205') {
        console.warn('[Supabase] clearAllSessions error:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('[Supabase] clearAllSessions exception:', err);
      return { success: false, error: err?.message || 'Erro de conexão' };
    }
  },

  // 3. ATTENDANCES CRUD
  async getAttendances(): Promise<AttendanceRecord[] | null> {
    try {
      const { data, error } = await supabase.from('attendances').select('*');
      if (error) {
        console.warn('[Supabase] getAttendances error:', error.message);
        return null;
      }
      return (data as AttendanceRecord[]) || [];
    } catch (err) {
      console.warn('[Supabase] getAttendances exception:', err);
      return null;
    }
  },

  async insertAttendance(attendance: AttendanceRecord): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Emit live delta immediately (sub-50ms) to all connected devices and local tabs
      this.broadcastLiveDelta('attendances', 'INSERT', attendance);

      // 2. Persist to Supabase
      const { error } = await supabase.from('attendances').upsert(attendance);
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('[Supabase] Tabela "attendances" ainda não foi criada no Supabase.');
        } else {
          console.error('[Supabase] insertAttendance error:', error);
        }
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('[Supabase] insertAttendance exception:', err);
      return { success: false, error: err?.message || 'Erro de conexão' };
    }
  },

  async deleteAttendance(sessionId: string, memberId: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.broadcastLiveDelta('attendances', 'DELETE', { sessionId, memberId });
      const { error } = await supabase
        .from('attendances')
        .delete()
        .eq('sessionId', sessionId)
        .eq('memberId', memberId);
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('[Supabase] Tabela "attendances" ainda não foi criada no Supabase.');
        } else {
          console.error('[Supabase] deleteAttendance error:', error);
        }
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('[Supabase] deleteAttendance exception:', err);
      return { success: false, error: err?.message || 'Erro de conexão' };
    }
  },

  // 4. VISITORS CRUD
  async getVisitors(): Promise<VisitorRecord[] | null> {
    try {
      const { data, error } = await supabase.from('visitors').select('*');
      if (error) {
        console.warn('[Supabase] getVisitors error:', error.message);
        return null;
      }
      if (!data || data.length === 0) return null;
      return (data as VisitorRecord[]) || [];
    } catch (err) {
      console.warn('[Supabase] getVisitors exception:', err);
      return null;
    }
  },

  async insertVisitor(visitor: VisitorRecord): Promise<{ success: boolean; error?: string }> {
    try {
      this.broadcastLiveDelta('visitors', 'INSERT', visitor);
      const { error } = await supabase.from('visitors').upsert(visitor);
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('[Supabase] Tabela "visitors" ainda não foi criada no Supabase.');
        } else {
          console.error('[Supabase] insertVisitor error:', error);
        }
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('[Supabase] insertVisitor exception:', err);
      return { success: false, error: err?.message || 'Erro de conexão' };
    }
  },

  async deleteVisitor(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.broadcastLiveDelta('visitors', 'DELETE', { id });
      const { error } = await supabase.from('visitors').delete().eq('id', id);
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('[Supabase] Tabela "visitors" ainda não foi criada no Supabase.');
        } else {
          console.error('[Supabase] deleteVisitor error:', error);
        }
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('[Supabase] deleteVisitor exception:', err);
      return { success: false, error: err?.message || 'Erro de conexão' };
    }
  },

  // 5. BALAUSTRES CRUD
  async getBalaustres(): Promise<Balaustre[] | null> {
    try {
      const { data, error } = await supabase.from('balaustres').select('*');
      if (error) {
        console.warn('[Supabase] getBalaustres error:', error.message);
        return null;
      }
      if (!data || data.length === 0) return null;
      return (data as Balaustre[]) || [];
    } catch (err) {
      console.warn('[Supabase] getBalaustres exception:', err);
      return null;
    }
  },

  async upsertBalaustre(balaustre: Balaustre): Promise<{ success: boolean; error?: string }> {
    try {
      this.broadcastLiveDelta('balaustres', 'INSERT', balaustre);
      const { error } = await supabase.from('balaustres').upsert(balaustre);
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('[Supabase] Tabela "balaustres" ainda não foi criada no Supabase.');
        } else {
          console.error('[Supabase] upsertBalaustre error:', error);
        }
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('[Supabase] upsertBalaustre exception:', err);
      return { success: false, error: err?.message || 'Erro de conexão' };
    }
  },

  async deleteBalaustre(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.broadcastLiveDelta('balaustres', 'DELETE', { id });
      const { error } = await supabase.from('balaustres').delete().eq('id', id);
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('[Supabase] Tabela "balaustres" ainda não foi criada no Supabase.');
        } else {
          console.error('[Supabase] deleteBalaustre error:', error);
        }
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('[Supabase] deleteBalaustre exception:', err);
      return { success: false, error: err?.message || 'Erro de conexão' };
    }
  },

  // BROADCAST LIVE DELTA VIA SUPABASE AND BROWSER BROADCASTCHANNEL
  broadcastLiveDelta(entity: 'attendances' | 'visitors' | 'sessions' | 'members' | 'balaustres', eventType: 'INSERT' | 'UPDATE' | 'DELETE', data: any) {
    try {
      // 1. Cross-tab instant communication (0ms latency for tabs in same browser)
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('masonic_live_bus');
          bc.postMessage({ entity, eventType, data, timestamp: Date.now() });
          bc.close();
        } catch {
          // ignore
        }
      }

      // 2. Supabase Realtime channel broadcast (sub-50ms worldwide to all connected devices)
      const channel = supabase.channel('masonic-granular-deltas');
      channel.send({
        type: 'broadcast',
        event: 'live_delta',
        payload: { entity, eventType, data, timestamp: Date.now() },
      }).catch(() => {});
    } catch {
      // ignore
    }
  },

  // OPTIMIZED REALTIME DELTA SUBSCRIBER (Dual engine: Broadcast + Postgres Changes + Local Bus)
  subscribeToRealtimeDeltas(callbacks: RealtimeDeltasCallbacks) {
    try {
      // 1. Listen on Cross-tab BroadcastChannel
      let localBc: BroadcastChannel | null = null;
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          localBc = new BroadcastChannel('masonic_live_bus');
          localBc.onmessage = (event) => {
            const { entity, eventType, data } = event.data || {};
            if (!entity || !eventType) return;

            if (entity === 'attendances') {
              callbacks.onAttendanceChange?.({
                eventType,
                new: eventType !== 'DELETE' ? data : null,
                old: eventType === 'DELETE' ? data : null,
              });
            } else if (entity === 'visitors') {
              callbacks.onVisitorChange?.({
                eventType,
                new: eventType !== 'DELETE' ? data : null,
                old: eventType === 'DELETE' ? data : null,
              });
            } else if (entity === 'sessions') {
              callbacks.onSessionChange?.({
                eventType,
                new: eventType !== 'DELETE' ? data : null,
                old: eventType === 'DELETE' ? data : null,
              });
            } else if (entity === 'members') {
              callbacks.onMemberChange?.({
                eventType,
                new: eventType !== 'DELETE' ? data : null,
                old: eventType === 'DELETE' ? data : null,
              });
            } else if (entity === 'balaustres') {
              callbacks.onBalaustreChange?.({
                eventType,
                new: eventType !== 'DELETE' ? data : null,
                old: eventType === 'DELETE' ? data : null,
              });
            }
          };
        } catch {
          // ignore
        }
      }

      // 2. Listen on Supabase Realtime channel (both Broadcast & Postgres Changes)
      const channel = supabase
        .channel('masonic-granular-deltas')
        .on(
          'broadcast',
          { event: 'live_delta' },
          ({ payload }) => {
            const { entity, eventType, data } = payload || {};
            if (!entity || !eventType) return;

            if (entity === 'attendances') {
              callbacks.onAttendanceChange?.({
                eventType,
                new: eventType !== 'DELETE' ? data : null,
                old: eventType === 'DELETE' ? data : null,
              });
            } else if (entity === 'visitors') {
              callbacks.onVisitorChange?.({
                eventType,
                new: eventType !== 'DELETE' ? data : null,
                old: eventType === 'DELETE' ? data : null,
              });
            } else if (entity === 'sessions') {
              callbacks.onSessionChange?.({
                eventType,
                new: eventType !== 'DELETE' ? data : null,
                old: eventType === 'DELETE' ? data : null,
              });
            } else if (entity === 'members') {
              callbacks.onMemberChange?.({
                eventType,
                new: eventType !== 'DELETE' ? data : null,
                old: eventType === 'DELETE' ? data : null,
              });
            } else if (entity === 'balaustres') {
              callbacks.onBalaustreChange?.({
                eventType,
                new: eventType !== 'DELETE' ? data : null,
                old: eventType === 'DELETE' ? data : null,
              });
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attendances' },
          (payload) => {
            callbacks.onAttendanceChange?.({
              eventType: payload.eventType,
              new: payload.new as AttendanceRecord,
              old: payload.old as AttendanceRecord,
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'visitors' },
          (payload) => {
            callbacks.onVisitorChange?.({
              eventType: payload.eventType,
              new: payload.new as VisitorRecord,
              old: payload.old as VisitorRecord,
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sessions' },
          (payload) => {
            callbacks.onSessionChange?.({
              eventType: payload.eventType,
              new: payload.new as Session,
              old: payload.old as Session,
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'members' },
          (payload) => {
            callbacks.onMemberChange?.({
              eventType: payload.eventType,
              new: payload.new as Member,
              old: payload.old as Member,
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'balaustres' },
          (payload) => {
            callbacks.onBalaustreChange?.({
              eventType: payload.eventType,
              new: payload.new as Balaustre,
              old: payload.old as Balaustre,
            });
          }
        )
        .subscribe();

      return () => {
        if (localBc) {
          try {
            localBc.close();
          } catch {
            // ignore
          }
        }
        supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn('[Supabase] Realtime subscription error:', e);
      return () => {};
    }
  },

  // Fallback broad subscriber for compatibility
  subscribeToAll(onDataChanged: () => void) {
    try {
      const channel = supabase
        .channel('masonic-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => {
          onDataChanged();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn('[Supabase] Realtime subscription error:', e);
      return () => {};
    }
  },

  // BULK SYNC CURRENT DATA TO SUPABASE
  async syncAllToSupabase(payload: {
    members: Member[];
    sessions: Session[];
    attendances: AttendanceRecord[];
    visitors: VisitorRecord[];
    balaustres: Balaustre[];
  }): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check tables existence first
    const conn = await this.checkConnection();
    if (!conn.hasTables) {
      const missingTables = conn.tableStatuses
        .filter((t) => !t.exists)
        .map((t) => t.table)
        .join(', ');

      return {
        success: false,
        errors: [
          `As tabelas do banco de dados ainda não existem no Supabase (${missingTables}). Por favor, acesse a aba 'Script SQL de Criação' e execute o script no Supabase SQL Editor.`,
        ],
      };
    }

    for (const m of payload.members) {
      const res = await this.upsertMember(m);
      if (!res.success && res.error) errors.push(`membro ${m.fullName}: ${res.error}`);
    }
    for (const s of payload.sessions) {
      const res = await this.upsertSession(s);
      if (!res.success && res.error) errors.push(`sessão ${s.title}: ${res.error}`);
    }
    for (const a of payload.attendances) {
      const res = await this.insertAttendance(a);
      if (!res.success && res.error) errors.push(`presença ${a.id}: ${res.error}`);
    }
    for (const v of payload.visitors) {
      const res = await this.insertVisitor(v);
      if (!res.success && res.error) errors.push(`visitante ${v.fullName}: ${res.error}`);
    }
    for (const b of payload.balaustres) {
      const res = await this.upsertBalaustre(b);
      if (!res.success && res.error) errors.push(`balaustre ${b.number}: ${res.error}`);
    }

    return {
      success: errors.length === 0,
      errors: errors.map((e) =>
        e.includes('schema cache') || e.includes('PGRST205')
          ? 'Tabelas do Supabase ausentes. Execute o script SQL para criá-las.'
          : e
      ),
    };
  },
};
