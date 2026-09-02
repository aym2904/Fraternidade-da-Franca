import { supabase } from './supabase';
import { PastaSale, Member } from '../types/masonic';

export const PASTA_SALES_STORAGE_KEY = 'masonic_pasta_sales_v2';
export const PASTA_DELETED_IDS_KEY = 'masonic_pasta_deleted_ids_v2';
export const PASTA_UNSYNCED_QUEUE_KEY = 'masonic_pasta_unsynced_queue_v2';
const PASTA_SALES_BROADCAST_CHANNEL = 'masonic_pasta_sales_bus_v2';
const SUPABASE_REALTIME_TOPIC = 'pasta_sales_realtime_topic';

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

// Helper: Normalize any sale object from Supabase (handles camelCase, lowercase, snake_case)
function normalizeSale(item: any): PastaSale {
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
    const set = getDeletedIds();
    set.add(id);
    localStorage.setItem(PASTA_DELETED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

function getLocalSales(): PastaSale[] {
  try {
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

  // 2. Add or reconcile local sales (preserves locally created sales that haven't synced yet)
  for (const local of localSales) {
    if (deletedIds.has(local.id) || deletedIds.has(local.qrCodeToken)) {
      continue;
    }

    if (!map.has(local.id)) {
      map.set(local.id, local);
    } else {
      const existing = map.get(local.id)!;
      // If local version was confirmed delivered, prefer delivered status
      if (local.status === 'Retirada Realizada' && existing.status !== 'Retirada Realizada') {
        map.set(local.id, { ...existing, ...local });
      }
    }
  }

  const result = Array.from(map.values());
  // Sort descending by creation date
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

    // Periodic sync every 4 seconds to guarantee zero desync
    const intervalId = setInterval(async () => {
      try {
        const fresh = await this.getPastaSales();
        callback(fresh);
      } catch {}
    }, 4000);

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
   * Load all pasta sales from Supabase, merging with LocalStorage so no sales are ever lost
   */
  async getPastaSales(): Promise<PastaSale[]> {
    const local = getLocalSales();

    try {
      const { data, error } = await supabase
        .from('pasta_sales')
        .select('*')
        .order('createdAt', { ascending: false });

      if (!error && data) {
        const remoteSales = data.map(normalizeSale);
        // Merge Supabase data with any local unsynced sales
        const merged = mergeSalesPreservingAll(remoteSales, local);
        setLocalSales(merged);

        // Auto-sync any local sales that are not yet in Supabase
        const remoteIds = new Set(remoteSales.map((s) => s.id));
        const unsyncedLocals = local.filter((l) => !remoteIds.has(l.id));
        if (unsyncedLocals.length > 0) {
          this.pushSalesToSupabase(unsyncedLocals);
        }

        return merged;
      } else if (error) {
        console.warn('[pastaSalesService] Supabase get error, falling back to local sales:', error.message);
      }
    } catch (e) {
      console.warn('[pastaSalesService] Supabase get exception, using local sales:', e);
    }

    // Fallback: return merged local sales
    return local;
  },

  /**
   * Push a list of sales to Supabase with automatic payload schema fallbacks
   */
  async pushSalesToSupabase(sales: PastaSale[]): Promise<void> {
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

        const { error } = await supabase.from('pasta_sales').upsert(payload);
        if (error) {
          // If schema cache column error, attempt fallback with simplified column keys
          if (error.code === 'PGRST204' || error.message?.includes('column')) {
            console.warn('[pastaSalesService] Trying fallback schema for sale:', sale.saleCode);
            const fallbackPayload = {
              id: sale.id,
              salecode: sale.saleCode,
              qrcodetoken: sale.qrCodeToken,
              customername: sale.customerName,
              phone: sale.phone,
              flavor: sale.flavor,
              totalquantity: sale.totalQuantity,
              unitprice: sale.unitPrice,
              totalamount: sale.totalAmount,
              sellerid: sale.sellerId,
              sellername: sale.sellerName,
              status: sale.status,
            };
            await supabase.from('pasta_sales').upsert(fallbackPayload);
          }
        }
      } catch (err) {
        console.warn('[pastaSalesService] Error pushing sale to Supabase:', err);
      }
    }
  },

  /**
   * Synchronize any pending sales to Supabase
   */
  async syncPendingSales(): Promise<void> {
    const local = getLocalSales();
    if (local.length > 0) {
      await this.pushSalesToSupabase(local);
    }
  },

  /**
   * Save a newly created pasta sale to LocalStorage & Supabase with real-time broadcast
   */
  async savePastaSale(sale: PastaSale): Promise<boolean> {
    const current = getLocalSales();
    const updatedList = [sale, ...current.filter((s) => s.id !== sale.id)];
    
    // 1. Update LocalStorage immediately (zero data loss)
    setLocalSales(updatedList);

    // 2. Broadcast immediately so other tabs/devices update
    this.broadcastUpdate(updatedList);

    // 3. Persist to Supabase
    try {
      const payload = {
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

      const { error } = await supabase.from('pasta_sales').upsert(payload);
      if (error) {
        console.warn('[pastaSalesService] Supabase upsert error:', error.message);
        // Retry with lowercase/snake_case if needed
        if (error.code === 'PGRST204' || error.message?.includes('column')) {
          await supabase.from('pasta_sales').upsert({
            id: sale.id,
            salecode: sale.saleCode,
            qrcodetoken: sale.qrCodeToken,
            customername: sale.customerName,
            phone: sale.phone,
            flavor: sale.flavor,
            totalquantity: sale.totalQuantity,
            totalamount: sale.totalAmount,
            sellerid: sale.sellerId,
            sellername: sale.sellerName,
            status: sale.status,
          });
        }
      }
    } catch (e) {
      console.warn('[pastaSalesService] Supabase save exception:', e);
    }

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

    // Save in Supabase
    try {
      const { error } = await supabase.from('pasta_sales').update({
        status: 'Retirada Realizada',
        pickupDate: updatedSale.pickupDate,
        pickupOperatorId: updatedSale.pickupOperatorId,
        pickupOperatorName: updatedSale.pickupOperatorName,
        notes: updatedSale.notes,
      }).eq('id', updatedSale.id);

      if (error) {
        // Try fallback casing if needed
        await supabase.from('pasta_sales').update({
          status: 'Retirada Realizada',
          pickupdate: updatedSale.pickupDate,
          pickupoperatorname: updatedSale.pickupOperatorName,
        }).eq('id', updatedSale.id);
      }
    } catch (e) {
      console.warn('[pastaSalesService] Supabase pickup update error:', e);
    }

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
    const current = getLocalSales();
    const updated = current.filter((s) => s.id !== saleId);
    setLocalSales(updated);

    this.broadcastUpdate(updated);

    try {
      await supabase.from('pasta_sales').delete().eq('id', saleId);
    } catch (e) {
      console.warn('[pastaSalesService] Supabase delete error:', e);
    }
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

    try {
      await supabase.from('pasta_sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      console.warn('[pastaSalesService] Supabase clear all error:', e);
    }

    this.broadcastUpdate([]);
    return true;
  },
};
