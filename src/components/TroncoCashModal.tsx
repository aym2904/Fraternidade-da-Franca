import React, { useState } from 'react';
import {
  Banknote,
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ShieldCheck,
  User,
  Plus,
  Coins,
} from 'lucide-react';
import { Session, Member, TroncoContribution } from '../types/masonic';
import { troncoService } from '../lib/troncoService';

interface TroncoCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSession: Session | null | undefined;
  sessions: Session[];
  currentUser: Member | null;
  onSuccess?: (contribution: TroncoContribution) => void;
}

export const TroncoCashModal: React.FC<TroncoCashModalProps> = ({
  isOpen,
  onClose,
  activeSession,
  sessions,
  currentUser,
  onSuccess,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    activeSession?.id || (sessions.length > 0 ? sessions[0].id : 'sess-125')
  );
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('Valor arrecadado durante a reunião');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successItem, setSuccessItem] = useState<TroncoContribution | null>(null);

  // Sync selected session if activeSession changes
  React.useEffect(() => {
    if (activeSession?.id) {
      setSelectedSessionId(activeSession.id);
    }
  }, [activeSession]);

  if (!isOpen) return null;

  const currentSelectedSession =
    sessions.find((s) => s.id === selectedSessionId) ||
    (activeSession?.id === selectedSessionId ? activeSession : null) || {
      id: selectedSessionId,
      title: activeSession?.title || 'Sessão em Andamento',
      date: activeSession?.date || new Date().toISOString().slice(0, 10),
    };

  const numericAmount = parseFloat(amountStr.replace(',', '.')) || 0;

  const handleAddQuickAmount = (val: number) => {
    const current = numericAmount;
    const next = (current + val).toFixed(2).replace('.', ',');
    setAmountStr(next);
  };

  const handleClear = () => {
    setAmountStr('');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) {
      setErrorMessage('Por favor, informe um valor válido para a contribuição em espécie.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const contrib = await troncoService.createCashContribution({
        sessionId: currentSelectedSession.id,
        sessionTitle: currentSelectedSession.title,
        sessionDate: currentSelectedSession.date,
        amount: numericAmount,
        recordedByName: currentUser?.fullName || 'Oficial de Gestão',
        recordedByRole: currentUser?.currentOfficerRole || 'Administrador',
        notes: description.trim() || 'Valor arrecadado durante a reunião',
      });

      setSuccessItem(contrib);
      if (onSuccess) {
        onSuccess(contrib);
      }
    } catch (err: any) {
      console.error('[TroncoCashModal] Erro ao registrar contribuição em espécie:', err);
      setErrorMessage('Não foi possível salvar o registro de contribuição em espécie. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseAndReset = () => {
    setSuccessItem(null);
    setAmountStr('');
    setErrorMessage(null);
    setDescription('Valor arrecadado durante a reunião');
    onClose();
  };

  return (
    <div
      id="tronco-cash-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="p-6 bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/50 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-inner">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-masonic text-lg sm:text-xl font-bold text-amber-200">
                  Registrar Contribuição em Espécie
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Espécie
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tronco de Beneficência • Registro Oficial de Caixa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseAndReset}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-6">
          {successItem ? (
            /* SUCCESS STATE */
            <div className="text-center py-6 space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Lançamento Confirmado
                </span>
                <h4 className="text-2xl font-serif-masonic font-bold text-slate-100 mt-1">
                  R$ {successItem.amount.toFixed(2).replace('.', ',')}
                </h4>
                <p className="text-xs text-slate-300 font-mono mt-1">
                  "{successItem.notes || 'Valor arrecadado durante a reunião'}"
                </p>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs text-left space-y-2 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Sessão:</span>
                  <span className="font-semibold text-amber-300">{successItem.sessionTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Forma:</span>
                  <span className="font-semibold text-emerald-400 flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5" /> Contribuição em Espécie
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Identificador:</span>
                  <span className="font-mono text-slate-400">
                    {successItem.sequenceNumber
                      ? `#${String(successItem.sequenceNumber).padStart(3, '0')}`
                      : successItem.id.slice(0, 10)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Impacto:</span>
                  <span className="text-amber-400 font-medium">
                    Somado instantaneamente ao total da sessão
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseAndReset}
                className="w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-amber-500/20"
              >
                Concluir e Voltar ao Tronco
              </button>
            </div>
          ) : (
            /* FORM STATE */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Permission Banner */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-300 text-xs">
                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  Lançamento restrito a: <strong>Venerável, Chanceler, Secretário, Tesoureiro ou Admin</strong>.
                </span>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* SESSION SELECTION */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sessão de Vinculação</span>
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-slate-200 focus:border-amber-500 outline-none transition font-medium"
                >
                  {activeSession && (
                    <option value={activeSession.id}>
                      ★ {activeSession.title} (Sessão Ativa • {activeSession.date})
                    </option>
                  )}
                  {sessions
                    .filter((s) => !activeSession || s.id !== activeSession.id)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} ({s.date})
                      </option>
                    ))}
                  {!activeSession && sessions.length === 0 && (
                    <option value="sess-125">Sessão da Loja</option>
                  )}
                </select>
                {activeSession && selectedSessionId === activeSession.id && (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    O valor será somado diretamente à sessão atualmente aberta em Loja.
                  </p>
                )}
              </div>

              {/* AMOUNT INPUT (DINHEIRO VIVO) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Valor Arrecadado em Espécie (R$)</span>
                  </label>
                  {amountStr && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-[11px] text-slate-400 hover:text-slate-200 underline"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-bold text-amber-400 text-lg">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={amountStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.,]/g, '');
                      setAmountStr(val);
                    }}
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-2xl pl-12 pr-4 py-3.5 font-mono text-2xl font-bold text-amber-200 placeholder:text-slate-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 outline-none transition"
                  />
                </div>

                {/* Quick Add Pills */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[10, 20, 50, 100, 200].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleAddQuickAmount(val)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-200 text-xs font-mono font-semibold flex items-center gap-1 transition"
                    >
                      <Plus className="w-3 h-3 text-amber-400" />
                      R$ {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* DESCRIPTION INPUT */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Descrição do Lançamento
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Valor arrecadado durante a reunião"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-4 py-3 text-sm text-slate-200 focus:border-amber-500 outline-none transition"
                />
                <p className="text-[11px] text-slate-400">
                  Esta descrição constará no relatório financeiro da sessão e nos registros do Tronco.
                </p>
              </div>

              {/* RECORDED BY INFO */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-400 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-400" />
                  <span>Oficial Responsável:</span>
                </div>
                <span className="font-semibold text-slate-200">
                  {currentUser?.fullName || 'Administrador'} (
                  {currentUser?.currentOfficerRole || 'Gestão'})
                </span>
              </div>

              {/* ACTIONS */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseAndReset}
                  className="w-1/3 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isLoading || numericAmount <= 0}
                  className="w-2/3 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition active:scale-[0.98]"
                >
                  <Banknote className="w-4 h-4" />
                  <span>{isLoading ? 'Registrando...' : 'Confirmar e Registrar'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
