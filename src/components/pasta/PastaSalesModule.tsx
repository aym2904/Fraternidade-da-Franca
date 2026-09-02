import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  PlusCircle,
  ListFilter,
  Camera,
  BarChart3,
  QrCode,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Member, PastaSale } from '../../types/masonic';
import { isLodgeAdmin } from '../../utils/authUtils';
import { pastaSalesService } from '../../lib/pastaSalesService';
import { PastaSaleRegistrationForm } from './PastaSaleRegistrationForm';
import { PastaSalesList } from './PastaSalesList';
import { PastaQrCodePickupScanner } from './PastaQrCodePickupScanner';
import { PastaReportsView } from './PastaReportsView';
import { PastaSaleSuccessModal } from './PastaSaleSuccessModal';
import { formatCurrencyBRL } from '../../utils/pastaUtils';

export type PastaSubTab = 'new_sale' | 'sales_list' | 'qr_scanner' | 'reports';

interface PastaSalesModuleProps {
  currentUser: Member;
  members: Member[];
  initialSubTab?: PastaSubTab;
}

export const PastaSalesModule: React.FC<PastaSalesModuleProps> = ({
  currentUser,
  members,
  initialSubTab = 'new_sale',
}) => {
  const isAdmin = isLodgeAdmin(currentUser);

  // Sub-menu Tab
  const [activeSubTab, setActiveSubTab] = useState<PastaSubTab>(initialSubTab);

  // Sales data state
  const [sales, setSales] = useState<PastaSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Success Modal state after a sale is created or when viewing QR code
  const [activeQrModalSale, setActiveQrModalSale] = useState<PastaSale | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Toast / notification feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load sales from service and bind real-time subscription
  const loadSales = useCallback(async () => {
    try {
      const data = await pastaSalesService.getPastaSales();
      setSales(data);
    } catch (e) {
      console.error('Error loading pasta sales:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSales();
    // Subscribe to realtime multi-user updates (cross-tab, cross-device, Supabase)
    const unsubscribe = pastaSalesService.subscribeToRealtimeSales((updatedSales) => {
      setSales(updatedSales);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [loadSales]);

  // Handle new sale created from form
  const handleSaleCreated = async (newSale: PastaSale) => {
    await pastaSalesService.savePastaSale(newSale);
    setSales((prev) => [newSale, ...prev.filter((s) => s.id !== newSale.id)]);
    setActiveQrModalSale(newSale);
    setIsQrModalOpen(true);
    showToast(`Venda ${newSale.saleCode} efetivada com sucesso!`);
  };

  // Handle QR Code view from list
  const handleViewQrCode = (sale: PastaSale) => {
    setActiveQrModalSale(sale);
    setIsQrModalOpen(true);
  };

  // Handle Pickup confirmation
  const handleConfirmPickup = async (
    identifier: string,
    notes?: string
  ): Promise<{ success: boolean; sale?: PastaSale; message: string }> => {
    const result = await pastaSalesService.confirmPickup(identifier, currentUser, notes);
    if (result.success && result.sale) {
      const updated = result.sale;
      setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showToast(`Retirada da venda ${updated.saleCode} confirmada!`);
    }
    return result;
  };

  // Handle Direct Pickup confirmation from list
  const handleConfirmPickupDirectly = async (sale: PastaSale) => {
    const result = await handleConfirmPickup(sale.qrCodeToken);
    if (result.success) {
      showToast(`Massa entregue com sucesso para ${sale.customerName}!`);
    }
  };

  // Handle Delete Single Sale
  const handleDeleteSale = async (sale: PastaSale) => {
    const confirmed = window.confirm(`Deseja realmente apagar o pedido ${sale.saleCode} de "${sale.customerName}"?`);
    if (!confirmed) return;

    await pastaSalesService.deletePastaSale(sale.id);
    setSales((prev) => prev.filter((s) => s.id !== sale.id));
    showToast(`Pedido ${sale.saleCode} apagado com sucesso.`);
  };

  // Handle Clear All Sales
  const handleClearAllSales = async () => {
    const confirmed = window.confirm(
      '⚠️ ATENÇÃO: Deseja realmente APAGAR TODAS as vendas e registros de teste cadastrados? Esta ação é irreversível.'
    );
    if (!confirmed) return;

    await pastaSalesService.clearAllSales();
    setSales([]);
    showToast('Todas as vendas testes foram apagadas com sucesso.');
  };

  // Metrics for Top Badges
  const mySalesCount = sales.filter((s) => s.sellerId === currentUser.id).length;
  const mySalesUnits = sales.filter((s) => s.sellerId === currentUser.id).reduce((sum, s) => sum + s.totalQuantity, 0);
  const totalSalesUnits = sales.reduce((sum, s) => sum + s.totalQuantity, 0);
  const totalPendingUnits = sales.filter((s) => s.status === 'Aguardando Retirada').reduce((sum, s) => sum + s.totalQuantity, 0);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Module Top Header */}
      <div className="bg-slate-900 border border-amber-900/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-950/50 shrink-0 text-2xl">
              🍝
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Ação Beneficente
                </span>
                <span className="text-xs text-slate-400">• A∴R∴L∴S∴ Fraternidade da Franca Nº 3571</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif-masonic text-amber-200 font-bold mt-1 flex flex-wrap items-center gap-2">
                <span>Ação Beneficente</span>
                <span className="text-slate-400 font-normal text-lg sm:text-xl">• Venda de Massas</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                Controle integral de pedidos, emissão instantânea de QR Code para retirada, envio direto no WhatsApp e conferência via câmera do celular.
              </p>
            </div>
          </div>

          {/* Quick Header Stats */}
          <div className="flex items-center space-x-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 shrink-0">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Minhas Vendas</span>
              <span className="text-base font-mono font-bold text-amber-300">
                {mySalesUnits} un
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total da Loja</span>
              <span className="text-base font-mono font-bold text-emerald-400">
                {totalSalesUnits} un
              </span>
            </div>
          </div>
        </div>

        {/* Sub-menu Navigation Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          {/* SubTab 1: Nova Venda */}
          <button
            type="button"
            onClick={() => setActiveSubTab('new_sale')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeSubTab === 'new_sale'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 shadow-lg shadow-amber-950/50'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Cadastrar Nova Venda</span>
          </button>

          {/* SubTab 2: Lista de Vendas */}
          <button
            type="button"
            onClick={() => setActiveSubTab('sales_list')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeSubTab === 'sales_list'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 shadow-lg shadow-amber-950/50'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>{isAdmin ? 'Lista de Vendas (Geral)' : 'Minhas Vendas'}</span>
            <span className="ml-1.5 px-1.5 py-0.2 bg-black/20 rounded-md text-[10px] font-mono">
              {isAdmin ? sales.length : mySalesCount}
            </span>
          </button>

          {/* SubTab 3: Leitor de QR Code */}
          <button
            type="button"
            onClick={() => setActiveSubTab('qr_scanner')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeSubTab === 'qr_scanner'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/50'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>Leitor de QR Code (Retirada)</span>
            {totalPendingUnits > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md text-[10px] font-mono">
                {totalPendingUnits} pendentes
              </span>
            )}
          </button>

          {/* SubTab 4: Relatórios */}
          <button
            type="button"
            onClick={() => setActiveSubTab('reports')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeSubTab === 'reports'
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 shadow-lg shadow-amber-950/50'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{isAdmin ? 'Relatórios & Auditoria' : 'Meu Relatório'}</span>
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl flex items-center space-x-3 text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200 border ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-500 shadow-emerald-950/40'
              : 'bg-rose-950 text-rose-100 border-rose-500 shadow-rose-950/40'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Active SubTab Component */}
      {activeSubTab === 'new_sale' && (
        <PastaSaleRegistrationForm
          currentUser={currentUser}
          onSaleCreated={handleSaleCreated}
        />
      )}

      {activeSubTab === 'sales_list' && (
        <PastaSalesList
          currentUser={currentUser}
          sales={sales}
          members={members}
          onViewQrCode={handleViewQrCode}
          onConfirmPickupDirectly={handleConfirmPickupDirectly}
          onDeleteSale={handleDeleteSale}
          onClearAllSales={handleClearAllSales}
        />
      )}

      {activeSubTab === 'qr_scanner' && (
        <PastaQrCodePickupScanner
          currentUser={currentUser}
          sales={sales}
          onConfirmPickup={handleConfirmPickup}
        />
      )}

      {activeSubTab === 'reports' && (
        <PastaReportsView
          currentUser={currentUser}
          sales={sales}
          members={members}
        />
      )}

      {/* Pop-up Modal with QR Code after registration or when requested */}
      <PastaSaleSuccessModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        sale={activeQrModalSale}
        onNewSale={() => {
          setIsQrModalOpen(false);
          setActiveSubTab('new_sale');
        }}
      />
    </div>
  );
};
