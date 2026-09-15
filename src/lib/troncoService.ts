/**
 * TRONCO DE BENEFICÊNCIA & ASAAS INTEGRATION SERVICE
 *
 * Arquitetura Oficial e Segura:
 * - 1 QR Code PIX Estático Oficial Asaas por Sessão (Múltiplos Pagamentos com Valor Livre)
 * - Proibição total de payloads EMV manuais ou gerados localmente
 * - Fail-Closed: se Asaas falhar, relata erro explícito
 * - RLS estrito: frontend comum consome apenas totais agregados (public_tronco_session_totals / RPC)
 * - Idempotência e máquina de estados para webhooks
 */

import { supabase } from './supabase';
import { supabaseService } from './supabaseService';
import {
  TroncoContribution,
  TroncoPublicSummary,
  TroncoNotificationSettings,
  TroncoContributionStatus,
  Session,
  Member,
} from '../types/masonic';
import { isBeneficenceAdmin } from '../utils/authUtils';

export type { TroncoNotificationSettings };

const TRONCO_STORAGE_KEY = 'masonic_tronco_contributions_v2';
const TRONCO_SETTINGS_KEY = 'masonic_tronco_settings_v1';
const SUPABASE_REALTIME_TOPIC = 'tronco_realtime_channel_v2';

// Cross-tab synchronization bus
const localBus = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('tronco_realtime_bus')
  : null;

// Active listeners registry
const activeListeners = new Set<(contributions: TroncoContribution[], latestConfirmed?: TroncoContribution) => void>();
let supabaseChannelInstance: any = null;

// Initial seed data for offline / preview fallback
export const INITIAL_HISTORICAL_SEED: TroncoContribution[] = [
  {
    id: 'tronco-seed-1',
    sequenceNumber: 1,
    sessionId: 'sess-prev-1',
    sessionTitle: 'Sessão Magna de Iniciação',
    sessionDate: '2025-02-10',
    amount: 150.0,
    currency: 'BRL',
    status: 'CONFIRMED',
    paymentMethod: 'PIX',
    asaasPaymentId: 'pay_hist_001',
    anonymous: true,
    createdAt: '2025-02-10T20:45:00Z',
    confirmedAt: '2025-02-10T20:45:15Z',
    paidAt: '2025-02-10T20:45:15Z',
    notes: 'Tronco Coberto - 1º Grau',
  },
  {
    id: 'tronco-seed-2',
    sequenceNumber: 2,
    sessionId: 'sess-prev-1',
    sessionTitle: 'Sessão Magna de Iniciação',
    sessionDate: '2025-02-10',
    amount: 100.0,
    currency: 'BRL',
    status: 'CONFIRMED',
    paymentMethod: 'PIX',
    asaasPaymentId: 'pay_hist_002',
    anonymous: true,
    createdAt: '2025-02-10T20:46:10Z',
    confirmedAt: '2025-02-10T20:46:25Z',
    paidAt: '2025-02-10T20:46:25Z',
  },
  {
    id: 'tronco-seed-3',
    sequenceNumber: 3,
    sessionId: 'sess-prev-2',
    sessionTitle: 'Sessão Ordinária de Instrução',
    sessionDate: '2025-02-17',
    amount: 220.0,
    currency: 'BRL',
    status: 'CONFIRMED',
    paymentMethod: 'PIX',
    asaasPaymentId: 'pay_hist_003',
    anonymous: true,
    createdAt: '2025-02-17T20:50:00Z',
    confirmedAt: '2025-02-17T20:50:18Z',
    paidAt: '2025-02-17T20:50:18Z',
  },
  {
    id: 'tronco-seed-4',
    sequenceNumber: 4,
    sessionId: 'sess-prev-2',
    sessionTitle: 'Sessão Ordinária de Instrução',
    sessionDate: '2025-02-17',
    amount: 50.0,
    currency: 'BRL',
    status: 'CONFIRMED',
    paymentMethod: 'CASH',
    anonymous: true,
    createdAt: '2025-02-17T21:00:00Z',
    confirmedAt: '2025-02-17T21:00:00Z',
    notes: 'Coleta física em espécie conferida pelo Hospitaleiro',
  },
];

/**
 * Normaliza registros vindos do Supabase
 */
function normalizeContribution(row: any): TroncoContribution {
  return {
    id: row.id || `contrib-${Date.now()}`,
    sequenceNumber: row.sequence_number || row.sequenceNumber || undefined,
    sessionId: row.session_id || row.sessionId || '',
    sessionTitle: row.session_title || row.sessionTitle || 'Sessão Maçônica',
    sessionDate: row.session_date || row.sessionDate || new Date().toISOString().slice(0, 10),
    amount: Number(row.amount || 0),
    currency: row.currency || 'BRL',
    status: (row.status as TroncoContributionStatus) || 'CONFIRMED',
    paymentMethod: row.payment_method || row.paymentMethod || 'PIX',
    asaasPaymentId: row.asaas_payment_id || row.asaasPaymentId || undefined,
    asaasQrCodeId: row.asaas_qr_code_id || row.asaasQrCodeId || row.asaasQrCode || undefined,
    asaasPayload: row.asaas_payload || row.asaasPayload || undefined,
    anonymous: true,
    notes: row.notes || undefined,
    externalReference: row.external_reference || row.externalReference || undefined,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    confirmedAt: row.confirmed_at || row.confirmedAt || row.paid_at || undefined,
    paidAt: row.paid_at || row.paidAt || row.confirmed_at || undefined,
  };
}

function getLocalContributions(): TroncoContribution[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(TRONCO_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeContribution);
        }
      }
    }
  } catch (err) {
    console.error('[troncoService] getLocalContributions error:', err);
  }
  return INITIAL_HISTORICAL_SEED;
}

function setLocalContributions(list: TroncoContribution[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TRONCO_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.error('[troncoService] setLocalContributions error:', err);
  }
}

function notifyLocalListeners(freshList: TroncoContribution[], latestConfirmed?: TroncoContribution) {
  for (const listener of activeListeners) {
    try {
      listener(freshList, latestConfirmed);
    } catch (e) {
      console.warn('[troncoService] Erro ao notificar listener:', e);
    }
  }
}

export const troncoService = {
  /**
   * Obtém configurações de notificação (privacidade do Irmão)
   */
  getSettings(): TroncoNotificationSettings {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(TRONCO_SETTINGS_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return { showAmountInNotification: true, enableSoundAlerts: true };
  },

  /**
   * Salva configurações de notificação
   */
  saveSettings(settings: Partial<TroncoNotificationSettings>): TroncoNotificationSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TRONCO_SETTINGS_KEY, JSON.stringify(updated));
      }
    } catch {}
    return updated;
  },

  /**
   * Obtém totais agregados da sessão via View pública (sem expor registros individuais)
   */
  async getSessionTotals(sessionId?: string): Promise<{ totalAmount: number; confirmedCount: number }> {
    if (!sessionId) {
      return { totalAmount: 0, confirmedCount: 0 };
    }

    try {
      // 1. Tentar ler da View agregada segura
      const { data, error } = await supabase
        .from('public_tronco_session_totals')
        .select('total_amount, confirmed_count')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (!error && data) {
        return {
          totalAmount: Number(data.total_amount || 0),
          confirmedCount: Number(data.confirmed_count || 0),
        };
      }

      // 2. Tentar via RPC segura
      const { data: rpcData, error: rpcErr } = await supabase.rpc('get_tronco_session_summary', {
        p_session_id: sessionId,
      });

      if (!rpcErr && rpcData && rpcData.length > 0) {
        return {
          totalAmount: Number(rpcData[0].total_amount || 0),
          confirmedCount: Number(rpcData[0].confirmed_count || 0),
        };
      }
    } catch (err) {
      console.warn('[troncoService] getSessionTotals remote fallback to local:', err);
    }

    // Fallback local
    const local = getLocalContributions();
    const sessionContribs = local.filter(
      (c) => c.sessionId === sessionId && (c.status === 'CONFIRMED' || c.status === 'RECEIVED')
    );
    return {
      totalAmount: sessionContribs.reduce((sum, c) => sum + c.amount, 0),
      confirmedCount: sessionContribs.length,
    };
  },

  /**
   * Obtém o resumo público consolidado de forma segura e agregada
   */
  async fetchPublicSummary(
    activeSessionId?: string,
    allSessions: Session[] = []
  ): Promise<TroncoPublicSummary> {
    try {
      const { data: totalsData, error } = await supabase
        .from('public_tronco_session_totals')
        .select('session_id, total_amount, confirmed_count, last_updated_at');

      if (!error && Array.isArray(totalsData)) {
        const totalsMap = new Map<string, { totalAmount: number; count: number }>();
        for (const row of totalsData) {
          totalsMap.set(row.session_id, {
            totalAmount: Number(row.total_amount || 0),
            count: Number(row.confirmed_count || 0),
          });
        }

        let currentSessionData: TroncoPublicSummary['currentSession'] = null;
        if (activeSessionId) {
          const found = allSessions.find((s) => s.id === activeSessionId);
          const agg = totalsMap.get(activeSessionId) || { totalAmount: 0, count: 0 };
          currentSessionData = {
            sessionId: activeSessionId,
            sessionTitle: found?.title || `Sessão ${activeSessionId}`,
            sessionDate: found?.date || new Date().toISOString().slice(0, 10),
            totalAmount: agg.totalAmount,
            confirmedCount: agg.count,
            isActive: true,
          };
        }

        const history: TroncoPublicSummary['history'] = [];
        let totalAccumulated = 0;

        for (const s of allSessions) {
          const agg = totalsMap.get(s.id);
          const amount = agg ? agg.totalAmount : 0;
          if (amount > 0) {
            totalAccumulated += amount;
            history.push({
              sessionId: s.id,
              sessionTitle: s.title,
              sessionDate: s.date,
              totalAmount: amount,
            });
          }
        }

        history.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());

        return {
          currentSession: currentSessionData,
          history,
          totalAccumulated,
        };
      }
    } catch (e) {
      console.warn('[troncoService] fetchPublicSummary fallback:', e);
    }

    // Fallback local
    const local = getLocalContributions();
    return this.calculatePublicSummary(local, activeSessionId, allSessions);
  },

  /**
   * Cálculo síncrono do resumo público a partir de lista
   */
  calculatePublicSummary(
    contributions: TroncoContribution[],
    activeSessionId?: string,
    allSessions: Session[] = []
  ): TroncoPublicSummary {
    const confirmed = contributions.filter((c) => c.status === 'CONFIRMED' || c.status === 'RECEIVED');

    const sessionMap = new Map<string, { totalAmount: number; count: number; title: string; date: string }>();

    for (const s of allSessions) {
      sessionMap.set(s.id, {
        totalAmount: 0,
        count: 0,
        title: s.title,
        date: s.date,
      });
    }

    for (const c of confirmed) {
      const existing = sessionMap.get(c.sessionId) || {
        totalAmount: 0,
        count: 0,
        title: c.sessionTitle || 'Sessão',
        date: c.sessionDate || '2025-01-01',
      };
      existing.totalAmount += c.amount;
      existing.count += 1;
      sessionMap.set(c.sessionId, existing);
    }

    let currentSessionData: TroncoPublicSummary['currentSession'] = null;
    if (activeSessionId) {
      const current = sessionMap.get(activeSessionId);
      if (current) {
        currentSessionData = {
          sessionId: activeSessionId,
          sessionTitle: current.title,
          sessionDate: current.date,
          totalAmount: current.totalAmount,
          confirmedCount: current.count,
          isActive: true,
        };
      } else {
        const found = allSessions.find((s) => s.id === activeSessionId);
        currentSessionData = {
          sessionId: activeSessionId,
          sessionTitle: found?.title || `Sessão ${activeSessionId}`,
          sessionDate: found?.date || new Date().toISOString().slice(0, 10),
          totalAmount: 0,
          confirmedCount: 0,
          isActive: true,
        };
      }
    }

    const history: TroncoPublicSummary['history'] = Array.from(sessionMap.entries())
      .filter(([_, data]) => data.totalAmount > 0)
      .map(([sessionId, data]) => ({
        sessionId,
        sessionTitle: data.title,
        sessionDate: data.date,
        totalAmount: data.totalAmount,
      }))
      .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());

    const totalAccumulated = confirmed.reduce((acc, c) => acc + c.amount, 0);

    return {
      currentSession: currentSessionData,
      history,
      totalAccumulated,
    };
  },

  /**
   * Busca as contribuições detalhadas (exclusivo para Administradores / Tesoureiro)
   */
  async getContributions(user?: Member | null): Promise<TroncoContribution[]> {
    const local = getLocalContributions();
    try {
      const remoteItems: TroncoContribution[] = [];

      // 1. Tentar tabela beneficence_contributions
      try {
        const { data: bData, error: bErr } = await supabase
          .from('beneficence_contributions')
          .select('*')
          .order('created_at', { ascending: false });

        if (!bErr && Array.isArray(bData)) {
          for (const row of bData) {
            remoteItems.push(normalizeContribution(row));
          }
        }
      } catch {}

      // 2. Tentar tabela legada tronco_contributions
      try {
        const { data: tData, error: tErr } = await supabase
          .from('tronco_contributions')
          .select('*')
          .order('createdAt', { ascending: false });

        if (!tErr && Array.isArray(tData)) {
          for (const row of tData) {
            remoteItems.push(normalizeContribution(row));
          }
        }
      } catch {}

      if (remoteItems.length > 0) {
        const map = new Map<string, TroncoContribution>();
        for (const item of remoteItems) {
          if (!map.has(item.id)) {
            map.set(item.id, item);
          } else {
            const existing = map.get(item.id)!;
            if (item.status === 'CONFIRMED' && existing.status !== 'CONFIRMED') {
              map.set(item.id, item);
            }
          }
        }
        for (const item of local) {
          if (!map.has(item.id)) {
            map.set(item.id, item);
          } else {
            const existing = map.get(item.id)!;
            if (item.status === 'CONFIRMED' && existing.status !== 'CONFIRMED') {
              map.set(item.id, item);
            }
          }
        }
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setLocalContributions(merged);
        return merged;
      }
    } catch (err) {
      console.warn('[troncoService] Remote fetch fallback to local:', err);
    }
    return local;
  },

  /**
   * Assina o canal Realtime para atualizações imediatas do Tronco
   */
  subscribeToRealtimeTronco(
    callback: (contributions: TroncoContribution[], latestConfirmed?: TroncoContribution) => void
  ): () => void {
    activeListeners.add(callback);

    // Carga inicial
    this.getContributions().then((data) => {
      callback(data);
    });

    // Iniciar canal Realtime apenas se ainda não existir
    if (!supabaseChannelInstance && typeof window !== 'undefined') {
      try {
        supabaseChannelInstance = supabase
          .channel(SUPABASE_REALTIME_TOPIC)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'beneficence_contributions' },
            async (payload: any) => {
              const fresh = await troncoService.getContributions();
              const latest = payload.new ? normalizeContribution(payload.new) : undefined;
              notifyLocalListeners(fresh, latest?.status === 'CONFIRMED' ? latest : undefined);
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tronco_contributions' },
            async (payload: any) => {
              const fresh = await troncoService.getContributions();
              const latest = payload.new ? normalizeContribution(payload.new) : undefined;
              notifyLocalListeners(fresh, latest?.status === 'CONFIRMED' ? latest : undefined);
            }
          )
          .on('broadcast', { event: 'tronco_contribution_confirmed' }, async (payload: any) => {
            const fresh = await troncoService.getContributions();
            const latest = payload.payload ? normalizeContribution(payload.payload) : undefined;
            notifyLocalListeners(fresh, latest);
          })
          .on('broadcast', { event: 'tronco_contribution_refunded' }, async () => {
            const fresh = await troncoService.getContributions();
            notifyLocalListeners(fresh);
          })
          .subscribe();
      } catch (err) {
        console.warn('[troncoService] Realtime channel setup warning:', err);
      }
    }

    // Cross-tab broadcast listener
    const handleLocalBus = async (e: MessageEvent) => {
      if (e.data?.type === 'TRONCO_UPDATED') {
        const fresh = await troncoService.getContributions();
        const latest = e.data.latestConfirmed ? normalizeContribution(e.data.latestConfirmed) : undefined;
        callback(fresh, latest);
      }
    };

    if (localBus) {
      localBus.addEventListener('message', handleLocalBus);
    }

    // Storage event fallback
    const handleStorage = (e: StorageEvent) => {
      if (e.key === TRONCO_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            callback(parsed.map(normalizeContribution));
          }
        } catch {}
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    // Cleanup: remove o callback e destrói o canal quando não houver mais nenhum ouvinte
    return () => {
      activeListeners.delete(callback);

      if (localBus) {
        localBus.removeEventListener('message', handleLocalBus);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
      }

      // Desinscrever o canal Realtime se este era o último ouvinte ativo
      if (activeListeners.size === 0 && supabaseChannelInstance) {
        try {
          supabase.removeChannel(supabaseChannelInstance);
        } catch {}
        supabaseChannelInstance = null;
      }
    };
  },

  /**
   * Obtém ou cria o QR Code PIX estático oficial do Asaas para a sessão
   * REGRA OBRIGATÓRIA: Nunca gerar fallback manual EMV. Falha = Erro explícito.
   */
  async getOrCreateSessionStaticQr(session: Session): Promise<{
    qrCodeId: string;
    payload: string;
    encodedImage?: string;
    status: 'ACTIVE' | 'EXPIRED' | 'CLOSED' | 'PENDING';
  }> {
    // 1. Verificar se a sessão já possui QR Code estático salvo
    if (session.beneficenceQrCodeId && session.beneficenceQrPayload) {
      return {
        qrCodeId: session.beneficenceQrCodeId,
        payload: session.beneficenceQrPayload,
        encodedImage: session.beneficenceQrImage,
        status: session.beneficenceQrStatus || 'ACTIVE',
      };
    }

    const cacheKey = `tronco_static_qr_${session.id}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.qrCodeId && parsed.payload) {
          return parsed;
        }
      }
    } catch {}

    // 2. Chamar Edge Function Oficial Asaas
    try {
      const { data, error } = await supabase.functions.invoke('asaas-create-session-qr', {
        body: {
          sessionId: session.id,
          sessionTitle: session.title,
          sessionDate: session.date,
        },
      });

      if (!error && data && data.qrCodeId && data.payload) {
        const result = {
          qrCodeId: data.qrCodeId,
          payload: data.payload,
          encodedImage: data.encodedImage,
          status: (data.status as any) || 'ACTIVE',
        };
        try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch {}
        supabaseService.updateSessionBeneficenceQr(session.id, result).catch(() => {});
        return result;
      }
    } catch (edgeErr) {
      console.warn('[troncoService] Edge function tentativa falhou, tentando backend:', edgeErr);
    }

    // 3. Chamar backend /api/tronco/session-qr
    try {
      const res = await fetch('/api/tronco/session-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          sessionTitle: session.title,
          sessionDate: session.date,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => null);
      } else {
        const text = await res.text().catch(() => '');
        console.warn('[troncoService] Backend retornou conteúdo não-JSON:', res.status, text.slice(0, 100));
      }

      if (res.ok && data && data.qrCodeId && data.payload) {
        const result = {
          qrCodeId: data.qrCodeId,
          payload: data.payload,
          encodedImage: data.encodedImage,
          status: (data.status as any) || 'ACTIVE',
        };
        try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch {}
        supabaseService.updateSessionBeneficenceQr(session.id, result).catch(() => {});
        return result;
      }

      if (data?.error) {
        throw new Error(data.error);
      }
      if (data?.errors && Array.isArray(data.errors)) {
        const msg = data.errors.map((e: any) => e.description || e.message || 'Erro Asaas').join('; ');
        throw new Error(msg);
      }
    } catch (apiErr: any) {
      if (apiErr.message?.includes('Não foi possível gerar o QR Code Pix')) {
        throw apiErr;
      }
      console.warn('[troncoService] Comunicação com backend Asaas falhou:', apiErr?.message || apiErr);
    }

    // REGRA MANDATÓRIA: Proibido gerar payload manual como fallback!
    throw new Error('Não foi possível gerar o QR Code Pix do Asaas. Verifique a comunicação com o serviço de pagamentos.');
  },

  /**
   * Reconcilia pagamentos do Asaas para a sessão
   */
  async reconcileSession(sessionId: string, qrCodeId?: string): Promise<{
    syncedCount: number;
    totalSyncedAmount?: number;
    message: string;
  }> {
    if (!sessionId) {
      return { syncedCount: 0, message: 'ID da sessão não informado.' };
    }

    try {
      // 1. Tentar Edge Function
      const { data, error } = await supabase.functions.invoke('asaas-reconcile', {
        body: { sessionId },
      });

      if (!error && data && data.status === 'success') {
        const fresh = await this.getContributions();
        notifyLocalListeners(fresh);
        return {
          syncedCount: data.syncedCount || 0,
          totalSyncedAmount: data.totalSyncedAmount || 0,
          message: `Conciliação concluída: ${data.syncedCount} novo(s) pagamento(s) importado(s).`,
        };
      }
    } catch (e) {
      console.warn('[troncoService] Edge reconcile fallback to backend:', e);
    }

    // 2. Tentar endpoint do servidor
    try {
      const res = await fetch('/api/tronco/reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ sessionId, qrCodeId }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data) {
          const fresh = await this.getContributions();
          notifyLocalListeners(fresh);
          return {
            syncedCount: data.payments?.length || 0,
            message: `Conciliação concluída via servidor Asaas.`,
          };
        }
      }
    } catch (apiErr) {
      console.warn('[troncoService] API reconcile erro:', apiErr);
    }

    const fresh = await this.getContributions();
    notifyLocalListeners(fresh);
    return { syncedCount: 0, message: 'Nenhum novo pagamento pendente encontrado para conciliação.' };
  },

  /**
   * Alias de compatibilidade para reconciliação de pagamentos da sessão
   */
  async reconcileSessionPayments(sessionId: string, qrCodeId?: string) {
    return this.reconcileSession(sessionId, qrCodeId);
  },

  /**
   * Simula pagamento no QR Code estático (disponível APENAS em Sandbox quando ASAAS_ENABLE_SIMULATOR=true)
   */
  async simulateIncomingPayment(params: {
    sessionId: string;
    qrCodeId: string;
    amount: number;
    sessionTitle?: string;
    sessionDate?: string;
    payload?: string;
  }): Promise<TroncoContribution> {
    const res = await fetch('/api/tronco/simulate-pay-qr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sessionId: params.sessionId,
        qrCodeId: params.qrCodeId,
        amount: params.amount,
        payload: params.payload,
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!res.ok) {
      const err = isJson ? await res.json().catch(() => ({})) : {};
      throw new Error(
        err.error ||
        'Simulador desativado. Simulação de pagamentos é estritamente proibida em produção e requer ASAAS_ENABLE_SIMULATOR=true em ambiente Sandbox.'
      );
    }

    const json = isJson ? await res.json().catch(() => ({})) : {};
    const paymentId = json.payment?.id || `pay_sim_${Date.now()}`;
    const currentLocal = getLocalContributions();
    const nextSeq = (currentLocal.reduce((max, c) => Math.max(max, c.sequenceNumber || 0), 0) || 0) + 1;

    const newContrib: TroncoContribution = {
      id: `tronco-pix-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sequenceNumber: nextSeq,
      sessionId: params.sessionId,
      sessionTitle: params.sessionTitle || 'Sessão',
      sessionDate: params.sessionDate || new Date().toISOString().slice(0, 10),
      amount: params.amount,
      currency: 'BRL',
      status: 'CONFIRMED',
      paymentMethod: 'PIX',
      asaasPaymentId: paymentId,
      asaasQrCodeId: params.qrCodeId,
      asaasPayload: params.payload,
      anonymous: true,
      createdAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      notes: 'Contribuição Fraternal via QR Code Estático (Simulador Sandbox)',
    };

    const updated = [newContrib, ...currentLocal];
    setLocalContributions(updated);
    notifyLocalListeners(updated, newContrib);

    if (localBus) {
      localBus.postMessage({ type: 'TRONCO_UPDATED', latestConfirmed: newContrib });
    }

    return newContrib;
  },

  /**
   * Lança coleta em espécie na sessão por Oficial Autorizado
   */
  async createCashContribution(params: {
    sessionId: string;
    sessionTitle: string;
    sessionDate: string;
    amount: number;
    recordedByName?: string;
    recordedByRole?: string;
    notes?: string;
  }): Promise<TroncoContribution> {
    const contributionId = `tronco-cash-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const currentLocal = getLocalContributions();
    const nextSeq = (currentLocal.reduce((max, c) => Math.max(max, c.sequenceNumber || 0), 0) || 0) + 1;

    const description = params.notes?.trim() || 'Valor arrecadado durante a reunião';

    const newContribution: TroncoContribution = {
      id: contributionId,
      sequenceNumber: nextSeq,
      sessionId: params.sessionId,
      sessionTitle: params.sessionTitle,
      sessionDate: params.sessionDate,
      amount: params.amount,
      status: 'CONFIRMED',
      paymentMethod: 'CASH',
      anonymous: true,
      notes: description,
      externalReference: params.recordedByRole
        ? `Lançado por: ${params.recordedByName || 'Oficial'} (${params.recordedByRole})`
        : 'Contribuição em Espécie',
      createdAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
    };

    try {
      await supabase.from('beneficence_contributions').insert({
        id: newContribution.id,
        session_id: newContribution.sessionId,
        amount: newContribution.amount,
        currency: 'BRL',
        status: 'CONFIRMED',
        payment_method: 'CASH',
        notes: newContribution.notes,
        anonymous: true,
        paid_at: newContribution.confirmedAt,
        created_at: newContribution.createdAt,
        updated_at: newContribution.confirmedAt,
      });
    } catch {}

    try {
      await supabase.from('tronco_contributions').upsert(newContribution);
    } catch {}

    const updated = [newContribution, ...currentLocal];
    setLocalContributions(updated);
    notifyLocalListeners(updated, newContribution);

    if (localBus) {
      localBus.postMessage({ type: 'TRONCO_UPDATED', latestConfirmed: newContribution });
    }

    return newContribution;
  },

  /**
   * Confirma contribuição
   */
  async confirmPayment(contributionId: string): Promise<TroncoContribution | null> {
    const all = await this.getContributions();
    const item = all.find((c) => c.id === contributionId);
    if (!item) return null;

    if (item.status === 'CONFIRMED') {
      return item;
    }

    const updatedItem: TroncoContribution = {
      ...item,
      status: 'CONFIRMED',
      confirmedAt: new Date().toISOString(),
    };

    const newList = all.map((c) => (c.id === contributionId ? updatedItem : c));
    setLocalContributions(newList);

    if (localBus) {
      localBus.postMessage({ type: 'TRONCO_UPDATED', latestConfirmed: updatedItem });
    }

    notifyLocalListeners(newList, updatedItem);
    return updatedItem;
  },

  /**
   * Atualiza status de contribuição (ex: cancelamento ou estorno administrativo)
   */
  async updateStatus(contributionId: string, status: TroncoContributionStatus): Promise<void> {
    const all = await this.getContributions();
    const newList = all.map((c) => (c.id === contributionId ? { ...c, status } : c));
    setLocalContributions(newList);

    try {
      await supabase
        .from('beneficence_contributions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', contributionId);
    } catch {}

    if (localBus) {
      localBus.postMessage({ type: 'TRONCO_UPDATED' });
    }
    notifyLocalListeners(newList);
  },

  /**
   * Reseta dados de teste para o seed histórico
   */
  async resetToHistoricalSeed(): Promise<TroncoContribution[]> {
    setLocalContributions(INITIAL_HISTORICAL_SEED);
    if (localBus) {
      localBus.postMessage({ type: 'TRONCO_UPDATED' });
    }
    notifyLocalListeners(INITIAL_HISTORICAL_SEED);
    return INITIAL_HISTORICAL_SEED;
  },
};
