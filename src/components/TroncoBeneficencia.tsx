import React, { useState, useEffect, useMemo } from 'react';
import {
  HeartHandshake,
  QrCode,
  TrendingUp,
  History,
  Shield,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Search,
  Sparkles,
  DollarSign,
  Lock,
  Eye,
  EyeOff,
  Bell,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Receipt,
  FileSpreadsheet,
  Banknote,
  Coins
} from 'lucide-react';
import { Member, Session, TroncoContribution, TroncoContributionStatus } from '../types/masonic';
import { isBeneficenceAdmin } from '../utils/authUtils';
import { troncoService, TroncoNotificationSettings } from '../lib/troncoService';
import { TroncoPixModal } from './TroncoPixModal';
import { TroncoCashModal } from './TroncoCashModal';

interface TroncoBeneficenciaProps {
  currentUser: Member | null;
  sessions: Session[];
  activeSession: Session | null | undefined;
  onOpenSessionModal?: () => void;
}

export const TroncoBeneficencia: React.FC<TroncoBeneficenciaProps> = ({
  currentUser,
  sessions,
  activeSession,
  onOpenSessionModal,
}) => {
  const [contributions, setContributions] = useState<TroncoContribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; sub?: string } | null>(null);
  const [filterSessionId, setFilterSessionId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [settings, setSettings] = useState<TroncoNotificationSettings>(troncoService.getSettings());
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);

  // Check administrative permission strictly using centralized auth utility
  const hasAdminAccess = isBeneficenceAdmin(currentUser);

  // Real-time synchronization
  useEffect(() => {
    setIsLoading(true);

    const unsubscribe = troncoService.subscribeToRealtimeTronco((freshList, latestConfirmed) => {
      setContributions(freshList);
      setIsLoading(false);

      // Trigger real-time visual notification when a contribution is confirmed
      if (latestConfirmed && (latestConfirmed.status === 'CONFIRMED' || latestConfirmed.status === 'RECEIVED')) {
        const currentSettings = troncoService.getSettings();
        const displayValue = currentSettings.showAmountInNotification || hasAdminAccess;
        const isCash = latestConfirmed.paymentMethod === 'CASH';

        setNotification({
          message: displayValue
            ? isCash
              ? `Em Espécie: R$ ${latestConfirmed.amount.toFixed(2).replace('.', ',')}`
              : `Nova contribuição: R$ ${latestConfirmed.amount.toFixed(2).replace('.', ',')}`
            : isCash
            ? 'Contribuição em espécie arrecadada durante a reunião'
            : 'Nova contribuição recebida no Tronco',
          sub: `${latestConfirmed.sessionTitle} • ${latestConfirmed.notes || (isCash ? 'Valor arrecadado durante a reunião' : 'Óbolo fraternal confirmado')}`,
        });

        setTimeout(() => {
          setNotification(null);
        }, 5000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [hasAdminAccess]);

  // Check if there is an active session in progress
  const hasActiveSession = Boolean(activeSession && activeSession.active !== false);
  const effectiveSessionId = hasActiveSession && activeSession ? activeSession.id : undefined;

  // Calculate sanitized public summary for regular brethren and quick metrics
  const publicSummary = useMemo(() => {
    return troncoService.calculatePublicSummary(contributions, effectiveSessionId, sessions);
  }, [contributions, effectiveSessionId, sessions]);

  // Filtered contributions for Admin view
  const filteredContributions = useMemo(() => {
    return contributions.filter((c) => {
      if (filterSessionId !== 'ALL' && c.sessionId !== filterSessionId) return false;
      if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
      if (filterPaymentMethod === 'CASH' && c.paymentMethod !== 'CASH') return false;
      if (filterPaymentMethod === 'PIX' && c.paymentMethod === 'CASH') return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const seq = c.sequenceNumber ? `#${String(c.sequenceNumber).padStart(3, '0')}` : '';
        const idMatch = c.id.toLowerCase().includes(term);
        const seqMatch = seq.toLowerCase().includes(term);
        const asaasMatch = c.asaasPaymentId?.toLowerCase().includes(term);
        const titleMatch = c.sessionTitle.toLowerCase().includes(term);
        const notesMatch = c.notes?.toLowerCase().includes(term);
        const refMatch = c.externalReference?.toLowerCase().includes(term);
        if (!idMatch && !seqMatch && !asaasMatch && !titleMatch && !notesMatch && !refMatch) return false;
      }
      return true;
    });
  }, [contributions, filterSessionId, filterStatus, filterPaymentMethod, searchTerm]);

  // Financial audit metrics (Admin only)
  const adminMetrics = useMemo(() => {
    const currentSessionContributions = effectiveSessionId
      ? contributions.filter(
          (c) => c.sessionId === effectiveSessionId && (c.status === 'CONFIRMED' || c.status === 'RECEIVED')
        )
      : [];
    const sessionTotal = currentSessionContributions.reduce((sum, c) => sum + c.amount, 0);
    const sessionCount = currentSessionContributions.length;

    const sessionPixContributions = currentSessionContributions.filter((c) => c.paymentMethod !== 'CASH');
    const sessionPixTotal = sessionPixContributions.reduce((sum, c) => sum + c.amount, 0);

    const sessionCashContributions = currentSessionContributions.filter((c) => c.paymentMethod === 'CASH');
    const sessionCashTotal = sessionCashContributions.reduce((sum, c) => sum + c.amount, 0);

    const allConfirmed = contributions.filter((c) => c.status === 'CONFIRMED' || c.status === 'RECEIVED');
    const accumulatedTotal = allConfirmed.reduce((sum, c) => sum + c.amount, 0);
    const accumulatedCount = allConfirmed.length;

    const allCashTotal = allConfirmed
      .filter((c) => c.paymentMethod === 'CASH')
      .reduce((sum, c) => sum + c.amount, 0);
    const allPixTotal = allConfirmed
      .filter((c) => c.paymentMethod !== 'CASH')
      .reduce((sum, c) => sum + c.amount, 0);

    const pendingCount = contributions.filter((c) => c.status === 'PENDING').length;

    return {
      sessionTotal,
      sessionCount,
      sessionPixTotal,
      sessionCashTotal,
      accumulatedTotal,
      accumulatedCount,
      allCashTotal,
      allPixTotal,
      pendingCount,
    };
  }, [contributions, effectiveSessionId]);

  // Export CSV for Treasurer and Secretary
  const handleExportCsv = () => {
    const headers = [
      '# Seq',
      'Data/Hora',
      'Sessão',
      'Forma de Pagamento',
      'Descrição / Observação',
      'Valor (R$)',
      'Status',
      'ID / Referência',
    ];
    const rows = filteredContributions.map((c) => [
      c.sequenceNumber ? `#${String(c.sequenceNumber).padStart(3, '0')}` : c.id.slice(0, 8),
      new Date(c.createdAt).toLocaleString('pt-BR'),
      c.sessionTitle,
      c.paymentMethod === 'CASH' ? 'Contribuição em Espécie' : 'PIX',
      c.notes || (c.paymentMethod === 'CASH' ? 'Valor arrecadado durante a reunião' : 'Contribuição Fraternal'),
      c.amount.toFixed(2).replace('.', ','),
      c.status,
      c.externalReference || c.asaasPaymentId || c.id,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `tronco_beneficencia_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTogglePrivacySetting = (val: boolean) => {
    const updated = troncoService.saveSettings({ showAmountInNotification: val });
    setSettings(updated);
  };

  const handleReconcileAsaas = async () => {
    if (!effectiveSessionId && filterSessionId === 'ALL') {
      const all = await troncoService.getContributions();
      setContributions(all);
      setNotification({ message: 'Dados atualizados localmente.' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    const targetSessionId = effectiveSessionId || (filterSessionId !== 'ALL' ? filterSessionId : undefined);
    if (!targetSessionId) return;

    setIsReconciling(true);
    try {
      const targetSession = sessions.find((s) => s.id === targetSessionId) || activeSession;
      const qrId = targetSession?.beneficenceQrCodeId;
      const res = await troncoService.reconcileSessionPayments(targetSessionId, qrId);
      setNotification({ message: 'Sincronização com Asaas Concluída', sub: res.message });
      setTimeout(() => setNotification(null), 4000);
    } catch (e: any) {
      setNotification({ message: 'Falha na Reconciliação', sub: e?.message || 'Tente novamente mais tarde' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <div id="tronco-beneficencia-module" className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Toast Notification for Realtime Updates */}
      {notification && (
        <div
          id="tronco-realtime-toast"
          className="fixed bottom-6 right-6 z-50 bg-slate-900/95 border-2 border-emerald-500/80 text-white px-5 py-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center space-x-3.5 animate-in slide-in-from-bottom-5 duration-300 max-w-md"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {notification.message}
            </div>
            {notification.sub && (
              <div className="text-xs text-slate-400 mt-0.5">{notification.sub}</div>
            )}
          </div>
        </div>
      )}

      {/* TOP HEADER / CONTEXT */}
      <div className="bg-slate-900/80 border border-amber-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl relative overflow-hidden">
        {/* Subtle Masonic Background Ornament */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400">
                A∴R∴L∴S∴ Fraternidade da Franca
              </span>
              {hasAdminAccess ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-purple-400" />
                  Gestão Administrativa
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  Acesso Fraternal
                </span>
              )}
            </div>

            <h1 className="font-serif-masonic text-2xl sm:text-3xl lg:text-4xl font-extrabold text-amber-200 tracking-wide">
              Tronco de Beneficência
            </h1>

            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Arrecadação solene destinada ao alívio das aflições humanas e socorro fraternal aos necessitados,
              gerenciada com total transparência e integridade em tempo real.
            </p>
          </div>

          {/* Quick Action Button for PIX and Cash */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {hasAdminAccess && (
              <button
                id="open-cash-modal-btn"
                type="button"
                onClick={() => setIsCashModalOpen(true)}
                className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-5 rounded-2xl shadow-lg shadow-emerald-950/40 border border-emerald-400/40 flex items-center space-x-2 transition active:scale-[0.98] text-xs sm:text-sm"
                title="Registrar contribuição em espécie arrecadada durante a reunião"
              >
                <Banknote className="w-4 h-4 text-emerald-200" />
                <span>REGISTRAR CONTRIBUIÇÃO EM ESPÉCIE</span>
              </button>
            )}

            {hasAdminAccess && (
              <button
                id="tronco-settings-btn"
                type="button"
                onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-2xl text-xs font-semibold flex items-center gap-2 transition"
                title="Configurações de Notificação e Privacidade"
              >
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Configurações</span>
              </button>
            )}

            {hasActiveSession ? (
              <button
                id="open-pix-modal-btn"
                type="button"
                onClick={() => setIsPixModalOpen(true)}
                className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center space-x-2.5 transition active:scale-[0.98]"
              >
                <QrCode className="w-5 h-5 text-slate-950" />
                <span className="text-sm sm:text-base">CONTRIBUIR VIA PIX</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-400 text-xs font-medium shadow-inner">
                <span className="w-2 h-2 rounded-full bg-slate-600" />
                <span>Nenhuma Sessão Ativa</span>
                {hasAdminAccess && onOpenSessionModal && (
                  <button
                    type="button"
                    onClick={onOpenSessionModal}
                    className="ml-1 text-amber-400 hover:text-amber-300 underline font-semibold text-xs transition"
                  >
                    Iniciar Sessão
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Administration Settings Bar (Toggled) */}
        {hasAdminAccess && showSettingsDrawer && (
          <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Exibir Valor nas Notificações</span>
                <span className="text-[11px] text-slate-400">
                  {settings.showAmountInNotification
                    ? 'Toasts mostram o valor (ex: "Nova contribuição: R$ 50,00")'
                    : 'Toasts mostram apenas "Nova contribuição recebida" (Mais discreto)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePrivacySetting(!settings.showAmountInNotification)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  settings.showAmountInNotification
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {settings.showAmountInNotification ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{settings.showAmountInNotification ? 'Visível' : 'Discreto'}</span>
              </button>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Redefinir Dados de Demonstração</span>
                <span className="text-[11px] text-slate-400">Restaura os valores históricos das sessões 121, 122 e 123</span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Deseja recarregar o histórico padrão do Tronco de Beneficência?')) {
                    await troncoService.resetToHistoricalSeed();
                  }
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/20 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restaurar</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------
          ADMINISTRATIVE VIEW (Tesoureiro, Venerável Mestre, Secretário, Chanceler, Admin)
          ------------------------------------------------------------- */}
      {hasAdminAccess ? (
        <div id="tronco-admin-view" className="space-y-8">
          {/* METRICS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Card 1: Sessão Atual */}
            <div
              className={`bg-slate-900/90 border rounded-3xl p-6 shadow-lg relative overflow-hidden group ${
                hasActiveSession ? 'border-amber-500/40' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
                <span>{hasActiveSession ? 'TOTAL DA SESSÃO ATUAL' : 'STATUS DA SESSÃO'}</span>
                {hasActiveSession ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                )}
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-400 tracking-tight">
                {hasActiveSession
                  ? `R$ ${adminMetrics.sessionTotal.toFixed(2).replace('.', ',')}`
                  : 'Sessão Fechada'}
              </div>

              {/* Cash vs PIX breakdown in the active session */}
              {hasActiveSession && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                  <span className="text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    PIX: R$ {adminMetrics.sessionPixTotal.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                    <Banknote className="w-3 h-3 text-emerald-400" /> Dinheiro: R$ {adminMetrics.sessionCashTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              )}

              <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
                <span>
                  {hasActiveSession
                    ? `${adminMetrics.sessionCount} ${
                        adminMetrics.sessionCount === 1 ? 'contribuição' : 'contribuições'
                      }`
                    : 'Tronco inativo no momento'}
                </span>
                <span className="font-mono text-amber-300/80 truncate max-w-[130px]" title={activeSession?.title}>
                  {hasActiveSession ? (
                    activeSession?.title
                  ) : onOpenSessionModal ? (
                    <button
                      type="button"
                      onClick={onOpenSessionModal}
                      className="text-amber-400 hover:text-amber-300 underline font-semibold transition"
                    >
                      Iniciar Sessão
                    </button>
                  ) : (
                    'Sem sessão ativa'
                  )}
                </span>
              </div>
            </div>

            {/* Card 2: Total Acumulado */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-lg">
              <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
                <span>TOTAL ACUMULADO GERAL</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-extrabold text-emerald-400 tracking-tight">
                R$ {adminMetrics.accumulatedTotal.toFixed(2).replace('.', ',')}
              </div>
              <div className="text-xs text-slate-400 mt-2">
                <span>Total de {adminMetrics.accumulatedCount} contribuições confirmadas</span>
              </div>
            </div>

            {/* Card 3: Arrecadação em Espécie */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
                <span>CONTRIBUIÇÃO EM ESPÉCIE</span>
                <Banknote className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-extrabold text-emerald-300 tracking-tight">
                R$ {adminMetrics.allCashTotal.toFixed(2).replace('.', ',')}
              </div>
              <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
                <span>Total arrecadado em espécie</span>
                <button
                  type="button"
                  onClick={() => setIsCashModalOpen(true)}
                  className="text-emerald-400 hover:text-emerald-300 font-semibold underline text-xs"
                >
                  + Registrar
                </button>
              </div>
            </div>

            {/* Card 4: Pendências / Cobranças em Aberto */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-lg">
              <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
                <span>AGUARDANDO PAGAMENTO</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-300 tracking-tight">
                {adminMetrics.pendingCount}
              </div>
              <div className="text-xs text-slate-400 mt-2">
                <span>QR Codes gerados em aberto</span>
              </div>
            </div>
          </div>

          {/* SESSIONS SUMMARY ACCORDION / TABLE */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-serif-masonic text-lg font-bold text-amber-200">
                  Arrecadação por Sessão
                </h3>
                <p className="text-xs text-slate-400">
                  Total consolidado do Tronco de Beneficência em cada balaústre
                </p>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {publicSummary.history.length} sessões registradas
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[280px] rounded-2xl border border-slate-800/70">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider text-[11px] border-b border-slate-800 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="py-3 px-4 font-semibold bg-slate-950">Sessão</th>
                    <th className="py-3 px-4 font-semibold bg-slate-950">Data</th>
                    <th className="py-3 px-4 font-semibold text-right bg-slate-950">Total Arrecadado</th>
                    <th className="py-3 px-4 font-semibold text-center bg-slate-950">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {publicSummary.history.map((hist) => {
                    const isCurrent = hist.sessionId === effectiveSessionId;
                    return (
                      <tr
                        key={hist.sessionId}
                        className={`hover:bg-slate-800/40 transition ${
                          isCurrent ? 'bg-amber-500/5 font-medium' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 flex items-center space-x-2">
                          <span className="font-serif-masonic font-bold text-slate-200">
                            {hist.sessionTitle}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Sessão Atual
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {new Date(hist.sessionDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400 text-right text-sm">
                          R$ {hist.totalAmount.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                            Confirmado
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* DETAILED CONTRIBUTIONS LIST (ADMIN VIEW) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="font-serif-masonic text-lg font-bold text-amber-200">
                  Auditoria e Histórico Completo de Contribuições
                </h3>
                <p className="text-xs text-slate-400">
                  Visibilidade estrita aos Oficiais de Gestão (Venerável, Secretário, Tesoureiro, Chanceler). O anonimato do Irmão é mantido regimentalmente.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  id="reconcile-asaas-btn"
                  type="button"
                  disabled={isReconciling}
                  onClick={handleReconcileAsaas}
                  className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
                  title="Consultar pagamentos diretamente na API do Asaas para conciliação"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isReconciling ? 'animate-spin' : ''}`} />
                  <span>{isReconciling ? 'Sincronizando...' : 'Sincronizar Asaas'}</span>
                </button>

                <button
                  id="export-csv-btn"
                  type="button"
                  onClick={handleExportCsv}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar #seq, ID, notas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-amber-500 outline-none"
                />
              </div>

              {/* Filter Session */}
              <div>
                <select
                  value={filterSessionId}
                  onChange={(e) => setFilterSessionId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-amber-500 outline-none"
                >
                  <option value="ALL">Todas as Sessões</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.date})
                    </option>
                  ))}
                  <option value="sess-121">Sessão 121 (01/09/2026)</option>
                  <option value="sess-122">Sessão 122 (03/09/2026)</option>
                  <option value="sess-123">Sessão 123 (05/09/2026)</option>
                  <option value="sess-125">Sessão 125 (Atual)</option>
                </select>
              </div>

              {/* Filter Status */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-amber-500 outline-none"
                >
                  <option value="ALL">Todos os Status</option>
                  <option value="CONFIRMED">Confirmado / Pago</option>
                  <option value="PENDING">Pendente</option>
                  <option value="CANCELLED">Cancelado</option>
                  <option value="REFUNDED">Estornado</option>
                </select>
              </div>

              {/* Filter Payment Method */}
              <div>
                <select
                  value={filterPaymentMethod}
                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-amber-500 outline-none"
                >
                  <option value="ALL">Todas as Formas (PIX & Espécie)</option>
                  <option value="PIX">Apenas PIX</option>
                  <option value="CASH">Apenas Contribuição em Espécie</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Identificador</th>
                    <th className="py-3 px-4 font-semibold">Sessão</th>
                    <th className="py-3 px-4 font-semibold">Forma & Descrição</th>
                    <th className="py-3 px-4 font-semibold">Data / Hora</th>
                    <th className="py-3 px-4 font-semibold">Valor</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Referência / Origem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredContributions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Nenhuma contribuição encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredContributions.map((c) => {
                      const isConfirmed = c.status === 'CONFIRMED' || c.status === 'RECEIVED';
                      const isCash = c.paymentMethod === 'CASH';
                      const seqText = c.sequenceNumber
                        ? `#${String(c.sequenceNumber).padStart(3, '0')}`
                        : `#${c.id.slice(0, 6)}`;

                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-mono font-bold text-amber-300">
                            {seqText}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {c.sessionTitle}
                          </td>
                          <td className="py-3 px-4">
                            {isCash ? (
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 w-fit">
                                  <Banknote className="w-3 h-3 text-emerald-400" />
                                  Em Espécie
                                </span>
                                <span className="text-[11px] text-slate-300 font-medium leading-snug">
                                  {c.notes || 'Valor arrecadado durante a reunião'}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-950/80 text-teal-300 border border-teal-800/60 w-fit">
                                  <QrCode className="w-3 h-3 text-teal-400" />
                                  PIX
                                </span>
                                {c.notes && (
                                  <span className="text-[11px] text-slate-400">
                                    {c.notes}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {new Date(c.createdAt).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(c.createdAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-400 text-sm">
                            R$ {c.amount.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="py-3 px-4">
                            {isConfirmed ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                                Confirmado
                              </span>
                            ) : c.status === 'PENDING' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 flex items-center gap-1 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                Pendente
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                                {c.status}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 text-right text-[11px]">
                            {isCash
                              ? c.externalReference || 'Lançamento em Espécie'
                              : c.asaasPaymentId || c.id.slice(0, 16)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* -------------------------------------------------------------
           USER / BRETHREN VIEW (Interface sóbria, minimalista e fraternal)
           ------------------------------------------------------------- */
        <div id="tronco-user-view" className="space-y-8 max-w-4xl mx-auto">
          {/* Current Session Showcase or Recess Notice */}
          {hasActiveSession ? (
            <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center mb-6 shadow-inner">
                <HeartHandshake className="w-8 h-8" />
              </div>

              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
                  Sessão Ativa • Tronco Aberto
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-serif-masonic font-bold text-amber-200">
                {activeSession?.title}
              </h2>

              <div className="text-4xl sm:text-6xl font-mono font-extrabold text-amber-300 mt-4 tracking-tight">
                R${' '}
                {(publicSummary.currentSession?.totalAmount || 0).toFixed(2).replace('.', ',')}
              </div>

              <p className="text-sm text-slate-400 mt-3 max-w-md mx-auto">
                <span className="font-semibold text-slate-200">
                  {publicSummary.currentSession?.confirmedCount || 0} contribuições
                </span>{' '}
                fraternais recebidas nesta sessão.
              </p>

              {/* Informative highlight when cash was collected during meeting */}
              {adminMetrics.sessionCashTotal > 0 && (
                <div className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-xs text-emerald-300 font-mono">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span>
                    Inclui R$ {adminMetrics.sessionCashTotal.toFixed(2).replace('.', ',')} arrecadado em espécie durante a reunião
                  </span>
                </div>
              )}

              {/* Prominent PIX Contribution Button - Only when session is active */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <button
                  id="user-contribute-pix-btn"
                  type="button"
                  onClick={() => setIsPixModalOpen(true)}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-4 px-8 rounded-2xl shadow-xl shadow-amber-500/20 text-base flex items-center justify-center space-x-3 transition active:scale-[0.98]"
                >
                  <QrCode className="w-5 h-5" />
                  <span>CONTRIBUIR VIA PIX</span>
                </button>

                {hasAdminAccess && (
                  <button
                    id="brethren-cash-btn"
                    type="button"
                    onClick={() => setIsCashModalOpen(true)}
                    className="bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 font-bold py-4 px-6 rounded-2xl border border-emerald-500/40 text-sm flex items-center justify-center space-x-2 transition active:scale-[0.98]"
                  >
                    <Banknote className="w-4 h-4 text-emerald-300" />
                    <span>REGISTRAR CONTRIBUIÇÃO EM ESPÉCIE</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center shadow-xl relative overflow-hidden">
              <div className="w-16 h-16 rounded-3xl bg-slate-800/80 border border-slate-700/80 text-slate-400 mx-auto flex items-center justify-center mb-6 shadow-inner">
                <Lock className="w-8 h-8 text-amber-400/80" />
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-medium mb-3">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span>Tronco de Beneficência em Recesso</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-serif-masonic font-bold text-slate-200">
                Nenhuma Sessão Ativa
              </h2>

              <p className="text-sm text-slate-400 mt-3 max-w-lg mx-auto leading-relaxed">
                A opção de contribuir via PIX fica disponível exclusivamente durante a realização de sessões ativas da Loja.
              </p>

              <div className="mt-6 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 max-w-md mx-auto text-xs text-slate-400 flex items-start gap-3 text-left">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Quando os trabalhos forem abertos pelo Venerável Mestre em Templo, o Tronco de Beneficência será ativado automaticamente e a opção de pagamento via PIX ficará liberada para todos os Irmãos.
                </span>
              </div>
            </div>
          )}

          {/* Simple Session History */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <History className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif-masonic text-lg font-bold text-amber-200">
                  Histórico do Tronco por Sessão
                </h3>
              </div>
              {publicSummary.history.length > 3 && (
                <span className="text-[10px] sm:text-xs font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-full border border-slate-800">
                  {publicSummary.history.length} sessões • Role para ver mais
                </span>
              )}
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[220px] sm:max-h-[235px] rounded-2xl border border-slate-800/70">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider text-[11px] border-b border-slate-800 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="py-3 px-4 font-semibold bg-slate-950">Sessão</th>
                    <th className="py-3 px-4 font-semibold bg-slate-950">Data</th>
                    <th className="py-3 px-4 font-semibold text-right bg-slate-950">Arrecadado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {publicSummary.history.map((h) => (
                    <tr key={h.sessionId} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-serif-masonic font-bold text-slate-200">
                        {h.sessionTitle}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {new Date(h.sessionDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400 text-right text-sm">
                        R$ {h.totalAmount.toFixed(2).replace('.', ',')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 text-[11px] text-slate-500 text-center italic">
              Conforme a tradição maçônica, as contribuições individuais são confidenciais e anônimas.
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONTRIBUIÇÃO VIA PIX - Disponível somente durante sessão ativa */}
      <TroncoPixModal
        isOpen={isPixModalOpen && hasActiveSession}
        onClose={() => setIsPixModalOpen(false)}
        activeSession={activeSession}
        onSuccess={() => {
          // Toast will trigger automatically through the realtime listener
        }}
      />

      {/* MODAL DE LANÇAMENTO DE VALORES EM DINHEIRO VIVO - Restrito aos Oficiais e Administradores */}
      {hasAdminAccess && (
        <TroncoCashModal
          isOpen={isCashModalOpen}
          onClose={() => setIsCashModalOpen(false)}
          currentUser={currentUser}
          activeSession={activeSession}
          sessions={sessions}
          onSuccess={() => {
            // Updated in realtime across listeners
          }}
        />
      )}
    </div>
  );
};
