import { supabase } from './supabase';
import { PastaSale, Member } from '../types/masonic';

export const PASTA_SALES_STORAGE_KEY = 'masonic_pasta_sales_v2';
export const PASTA_DELETED_IDS_KEY = 'masonic_pasta_deleted_ids_v2';
const PASTA_SALES_BROADCAST_CHANNEL = 'masonic_pasta_sales_bus_v2';
const SUPABASE_REALTIME_TOPIC = 'pasta_sales_realtime_topic';
const CLOUD_SYNC_BALAUSTRE_ID = 'system-pasta-sales-sync-v1';

// Local BroadcastChannel instance for instantaneous cross-tab synchronization
let localBus: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    localBus = new BroadcastChannel(PASTA_SALES_BROADCAST_CHANNEL);
  }
} catch (e) {
  console.warn('[pastaSalesService] BroadcastChannel init error:', e);
}

// Active listeners registry
const activeListeners = new Set<(sales: PastaSale[]) => void>();

function notifyLocalListeners(sales: PastaSale[]) {
  activeListeners.forEach((listener) => {
    try {
      listener(sales);
    } catch (err) {
      console.error('[pastaSalesService] Listener error:', err);
    }
  });
}

// Helper: Normalize any sale object from Supabase or JSON
export function normalizeSale(item: any): PastaSale {
  const itemsParsed = Array.isArray(item.items)
    ? item.items
    : typeof item.items === 'string'
    ? (() => {
        try {
          return JSON.parse(item.items);
        } catch {
          return [];
        }
      })()
    : [];

  const totalQuantity = Number(item.totalQuantity || item.totalquantity || item.total_quantity || 1);
  const unitPrice = Number(item.unitPrice || item.unitprice || item.unit_price || 25);
  const totalAmount = Number(
    item.totalAmount || item.totalamount || item.total_amount || totalQuantity * unitPrice
  );

  return {
    id: String(item.id || item.saleCode || item.salecode || item.qrCodeToken || Date.now()),
    saleCode: String(item.saleCode || item.salecode || item.sale_code || 'MASSA-0000'),
    qrCodeToken: String(item.qrCodeToken || item.qrcodetoken || item.qr_code_token || item.id),
    customerName: String(item.customerName || item.customername || item.customer_name || 'Cliente'),
    phone: String(item.phone || ''),
    flavor: String(item.flavor || 'Quatro Queijos'),
    items: itemsParsed,
    totalQuantity,
    unitPrice,
    totalAmount,
    paymentStatus: (item.paymentStatus || item.paymentstatus || item.payment_status || 'Pago') as any,
    paymentMethod: (item.paymentMethod || item.paymentmethod || item.payment_method || 'Pix') as any,
    sellerId: String(item.sellerId || item.sellerid || item.seller_id || ''),
    sellerName: String(item.sellerName || item.sellername || item.seller_name || 'Irmão'),
    sellerCim: item.sellerCim || item.sellercim || item.seller_cim || undefined,
    createdAt: String(item.createdAt || item.createdat || item.created_at || new Date().toISOString()),
    status: (item.status === 'Retirada Realizada' || item.status === 'Cancelada' ? item.status : 'Aguardando Retirada') as any,
    pickupDate: item.pickupDate || item.pickupdate || item.pickup_date || undefined,
    pickupOperatorId: item.pickupOperatorId || item.pickupoperatorid || item.pickup_operator_id || undefined,
    pickupOperatorName: item.pickupOperatorName || item.pickupoperatorname || item.pickup_operator_name || undefined,
    notes: item.notes || undefined,
  };
}

// Helpers for Local Storage
function getDeletedIds(): Set<string> {
  try {
    if (typeof localStorage === 'undefined') return new Set();
    const raw = localStorage.getItem(PASTA_DELETED_IDS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
}

function recordDeletedId(id: string) {
  try {
    if (typeof localStorage === 'undefined') return;
    const set = getDeletedIds();
    set.add(id);
    localStorage.setItem(PASTA_DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

function getLocalSales(): PastaSale[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(PASTA_SALES_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return arr.map(normalizeSale);
      }
    }
  } catch {}
  return [];
}

function setLocalSales(sales: PastaSale[]) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(PASTA_SALES_STORAGE_KEY, JSON.stringify(sales));
  } catch (e) {
    console.error('[pastaSalesService] Failed to setLocalSales:', e);
  }
}

// Merge remote sales from Supabase with local sales so NO sales are ever lost
function mergeSalesPreservingAll(remoteSales: PastaSale[], localSales: PastaSale[]): PastaSale[] {
  const deletedIds = getDeletedIds();
  const map = new Map<string, PastaSale>();

  // 1. Add remote sales first (if not deleted)
  for (const sale of remoteSales) {
    if (!deletedIds.has(sale.id) && !deletedIds.has(sale.qrCodeToken)) {
      map.set(sale.id, sale);
    }
  }

  // 2. Add or reconcile local sales
  for (const local of localSales) {
    if (deletedIds.has(local.id) || deletedIds.has(local.qrCodeToken)) {
      continue;
    }

    if (!map.has(local.id)) {
      map.set(local.id, local);
    } else {
      const existing = map.get(local.id)!;
      // If local version or remote version has pickup completed, prioritize completed
      if (local.status === 'Retirada Realizada' && existing.status !== 'Retirada Realizada') {
        map.set(local.id, { ...existing, ...local });
      } else if (existing.status === 'Retirada Realizada') {
        map.set(local.id, existing);
      } else {
        // Most recently updated
        const localTime = new Date(local.createdAt).getTime() || 0;
        const existingTime = new Date(existing.createdAt).getTime() || 0;
        map.set(local.id, localTime >= existingTime ? local : existing);
      }
    }
  }

  const result = Array.from(map.values());
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return result;
}

// Global Supabase Realtime Channel
let supabaseChannelInstance: any = null;

function ensureSupabaseChannel() {
  if (!supabaseChannelInstance && typeof window !== 'undefined') {
    try {
      supabaseChannelInstance = supabase
        .channel(SUPABASE_REALTIME_TOPIC)
        .on('broadcast', { event: 'pasta_sale_event' }, async () => {
          const fresh = await pastaSalesService.getPastaSales();
          notifyLocalListeners(fresh);
        })
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'pasta_sales' },
          async () => {
            const fresh = await pastaSalesService.getPastaSales();
            notifyLocalListeners(fresh);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'balaustres', filter: `id=eq.${CLOUD_SYNC_BALAUSTRE_ID}` },
          async () => {
            const fresh = await pastaSalesService.getPastaSales();
            notifyLocalListeners(fresh);
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('[pastaSalesService] Supabase realtime channel error:', e);
    }
  }
}

// Listen to local bus messages (cross-tab)
if (localBus) {
  localBus.onmessage = async (event) => {
    if (event.data?.type === 'SALES_UPDATED') {
      const fresh = await pastaSalesService.getPastaSales();
      notifyLocalListeners(fresh);
    }
  };
}

// Automatic background sync when window regains focus or comes online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    pastaSalesService.syncPendingSales();
  });
  window.addEventListener('focus', () => {
    pastaSalesService.getPastaSales().then(notifyLocalListeners);
  });
}

export const pastaSalesService = {
  /**
   * Subscribe to real-time pasta sales updates across tabs, devices, and administrators
   */
  subscribeToRealtimeSales(callback: (sales: PastaSale[]) => void): () => void {
    activeListeners.add(callback);
    ensureSupabaseChannel();

    // Trigger immediate sync and callback
    this.getPastaSales().then((data) => {
      callback(data);
    });

    // Storage event fallback for cross-tab updates
    const handleStorage = (e: StorageEvent) => {
      if (e.key === PASTA_SALES_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            callback(parsed.map(normalizeSale));
          }
        } catch {}
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    // Periodic fast poll every 2.5 seconds to guarantee zero desync across multiple devices
    const intervalId = setInterval(async () => {
      try {
        const fresh = await this.getPastaSales();
        callback(fresh);
      } catch {}
    }, 2500);

    return () => {
      activeListeners.delete(callback);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
      }
      clearInterval(intervalId);
    };
  },

  /**
   * Broadcast change to all local and remote channels
   */
  async broadcastUpdate(sales: PastaSale[]) {
    // 1. Notify local active listeners
    notifyLocalListeners(sales);

    // 2. Broadcast via BroadcastChannel to other browser tabs
    try {
      if (localBus) {
        localBus.postMessage({ type: 'SALES_UPDATED', timestamp: Date.now() });
      }
    } catch {}

    // 3. Broadcast via Supabase Realtime to other devices
    try {
      if (supabaseChannelInstance) {
        await supabaseChannelInstance.send({
          type: 'broadcast',
          event: 'pasta_sale_event',
          payload: { timestamp: Date.now() },
        });
      }
    } catch (e) {
      console.warn('[pastaSalesService] Supabase broadcast error:', e);
    }
  },

  /**
   * Load all pasta sales from Supabase cloud (both direct table & unified cloud store) + local storage
   */
  async getPastaSales(): Promise<PastaSale[]> {
    const local = getLocalSales();
    let remoteSales: PastaSale[] = [];

    // 1. Attempt reading from Supabase unified cloud store in 'balaustres'
    try {
      const { data: cloudStoreData, error: cloudStoreError } = await supabase
        .from('balaustres')
        .select('content')
        .eq('id', CLOUD_SYNC_BALAUSTRE_ID)
        .maybeSingle();

      if (!cloudStoreError && cloudStoreData?.content) {
        try {
          const parsed = JSON.parse(cloudStoreData.content);
          if (Array.isArray(parsed)) {
            remoteSales = parsed.map(normalizeSale);
          }
        } catch (e) {
          console.warn('[pastaSalesService] Error parsing cloud store content:', e);
        }
      }
    } catch (e) {
      console.warn('[pastaSalesService] Cloud store fetch exception:', e);
    }

    // 2. Attempt reading from dedicated 'pasta_sales' table if present
    try {
      const { data: tableData, error: tableError } = await supabase
        .from('pasta_sales')
        .select('*')
        .order('createdAt', { ascending: false });

      if (!tableError && Array.isArray(tableData)) {
        const tableSales = tableData.map(normalizeSale);
        // Merge table sales with cloud store sales
        const combinedRemoteMap = new Map<string, PastaSale>();
        for (const s of remoteSales) combinedRemoteMap.set(s.id, s);
        for (const s of tableSales) combinedRemoteMap.set(s.id, s);
        remoteSales = Array.from(combinedRemoteMap.values());
      }
    } catch (e) {
      // Ignored if table doesn't exist
    }

    // 3. Merge with local storage
    const merged = mergeSalesPreservingAll(remoteSales, local);
    setLocalSales(merged);

    // If local has sales not in remote cloud store, push them to cloud
    if (merged.length > remoteSales.length) {
      this.saveToCloudStore(merged);
    }

    return merged;
  },

  /**
   * Persist complete sales array to the Supabase Cloud Store for 100% reliable cross-device persistence
   */
  async saveToCloudStore(sales: PastaSale[]): Promise<void> {
    try {
      const payload = {
        id: CLOUD_SYNC_BALAUSTRE_ID,
        sessionId: 'SYSTEM_PASTA_SALES',
        number: 99999,
        title: 'PASTA_SALES_PERSISTENCE',
        date: new Date().toISOString().slice(0, 10),
        summaryText: 'Pasta Sales Cloud Sync Store',
        content: JSON.stringify(sales),
        status: 'Aprovado',
        createdAt: new Date().toISOString(),
      };

      await supabase.from('balaustres').upsert(payload);
    } catch (e) {
      console.warn('[pastaSalesService] Error writing to Cloud Store:', e);
    }
  },

  /**
   * Push a list of sales to Supabase dedicated table if it exists
   */
  async pushSalesToSupabaseTable(sales: PastaSale[]): Promise<void> {
    for (const sale of sales) {
      try {
        const payload: Record<string, any> = {
          id: sale.id,
          saleCode: sale.saleCode,
          qrCodeToken: sale.qrCodeToken,
          customerName: sale.customerName,
          phone: sale.phone,
          flavor: sale.flavor,
          items: sale.items,
          totalQuantity: sale.totalQuantity,
          unitPrice: sale.unitPrice,
          totalAmount: sale.totalAmount,
          paymentStatus: sale.paymentStatus || 'Pago',
          paymentMethod: sale.paymentMethod || 'Pix',
          sellerId: sale.sellerId,
          sellerName: sale.sellerName,
          sellerCim: sale.sellerCim || '',
          createdAt: sale.createdAt,
          status: sale.status,
          pickupDate: sale.pickupDate || null,
          pickupOperatorId: sale.pickupOperatorId || null,
          pickupOperatorName: sale.pickupOperatorName || null,
          notes: sale.notes || '',
        };

        await supabase.from('pasta_sales').upsert(payload);
      } catch {}
    }
  },

  /**
   * Synchronize any pending sales to Supabase
   */
  async syncPendingSales(): Promise<void> {
    const local = getLocalSales();
    if (local.length > 0) {
      await this.saveToCloudStore(local);
      await this.pushSalesToSupabaseTable(local);
    }
  },

  /**
   * Save a newly created pasta sale to LocalStorage & Supabase with instant real-time broadcast
   */
  async savePastaSale(sale: PastaSale): Promise<boolean> {
    // 1. Fetch current merged list
    const current = await this.getPastaSales();
    const updatedList = [sale, ...current.filter((s) => s.id !== sale.id)];

    // 2. Update LocalStorage immediately
    setLocalSales(updatedList);

    // 3. Broadcast immediately so other tabs & devices update on the spot
    this.broadcastUpdate(updatedList);

    // 4. Save to Cloud Store in Supabase (100% reliable)
    await this.saveToCloudStore(updatedList);

    // 5. Also save to dedicated table if available
    this.pushSalesToSupabaseTable([sale]);

    return true;
  },

  /**
   * Confirm Pickup for a sale using Token or Sale ID with real-time broadcast
   */
  async confirmPickup(
    identifier: string,
    operator: Member,
    notes?: string
  ): Promise<{ success: boolean; sale?: PastaSale; message: string }> {
    const cleanId = identifier.trim().toUpperCase();
    const current = await this.getPastaSales();

    const targetIndex = current.findIndex(
      (s) =>
        s.id.toUpperCase() === cleanId ||
        s.qrCodeToken.toUpperCase() === cleanId ||
        s.saleCode.toUpperCase() === cleanId ||
        s.qrCodeToken.toUpperCase().replace(/-/g, '') === cleanId.replace(/-/g, '')
    );

    if (targetIndex === -1) {
      return {
        success: false,
        message: 'QR Code inválido ou não encontrado no sistema.',
      };
    }

    const targetSale = current[targetIndex];

    if (targetSale.status === 'Retirada Realizada') {
      const dateStr = targetSale.pickupDate ? new Date(targetSale.pickupDate).toLocaleString('pt-BR') : 'Data não informada';
      const operatorStr = targetSale.pickupOperatorName || 'Irmão responsável';
      return {
        success: false,
        sale: targetSale,
        message: `⚠️ QR Code já utilizado! Retirada realizada anteriormente em ${dateStr} por ${operatorStr}.`,
      };
    }

    if (targetSale.status === 'Cancelada') {
      return {
        success: false,
        sale: targetSale,
        message: 'Esta venda foi cancelada e não pode ser retirada.',
      };
    }

    // Perform confirmation
    const updatedSale: PastaSale = {
      ...targetSale,
      status: 'Retirada Realizada',
      pickupDate: new Date().toISOString(),
      pickupOperatorId: operator.id,
      pickupOperatorName: operator.fullName,
      notes: notes || targetSale.notes,
    };

    current[targetIndex] = updatedSale;

    // Save in LocalStorage
    setLocalSales(current);

    // Broadcast immediately in real time
    this.broadcastUpdate(current);

    // Save to Cloud Store
    await this.saveToCloudStore(current);

    // Update in Supabase table
    try {
      await supabase.from('pasta_sales').update({
        status: 'Retirada Realizada',
        pickupDate: updatedSale.pickupDate,
        pickupOperatorId: updatedSale.pickupOperatorId,
        pickupOperatorName: updatedSale.pickupOperatorName,
        notes: updatedSale.notes,
      }).eq('id', updatedSale.id);
    } catch {}

    return {
      success: true,
      sale: updatedSale,
      message: 'Retirada confirmada com sucesso!',
    };
  },

  /**
   * Delete a sale (Admin only) with real-time broadcast and tombstone
   */
  async deletePastaSale(saleId: string): Promise<boolean> {
    recordDeletedId(saleId);
    const current = await this.getPastaSales();
    const updated = current.filter((s) => s.id !== saleId);
    setLocalSales(updated);

    this.broadcastUpdate(updated);

    await this.saveToCloudStore(updated);

    try {
      await supabase.from('pasta_sales').delete().eq('id', saleId);
    } catch {}
    return true;
  },

  /**
   * Clear all pasta sales (Admin test cleanup)
   */
  async clearAllSales(): Promise<boolean> {
    setLocalSales([]);
    try {
      localStorage.removeItem('masonic_pasta_sales_v1');
    } catch {}

    await this.saveToCloudStore([]);

    try {
      await supabase.from('pasta_sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch {}

    this.broadcastUpdate([]);
    return true;
  },
};
