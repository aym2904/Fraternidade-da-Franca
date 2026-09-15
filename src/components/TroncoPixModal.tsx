import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  QrCode,
  Smartphone,
  HeartHandshake,
  Lock,
  Coins,
  CheckCircle2,
  Loader2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Session, TroncoContribution } from '../types/masonic';
import { troncoService } from '../lib/troncoService';

interface TroncoPixModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSession: Session | null;
  onSuccess?: (contribution: TroncoContribution) => void;
}

const PRESET_AMOUNTS = [10, 20, 50, 100, 200];

export const TroncoPixModal: React.FC<TroncoPixModalProps> = ({
  isOpen,
  onClose,
  activeSession,
  onSuccess,
}) => {
  const [activePaymentMode, setActivePaymentMode] = useState<'qr' | 'copia_cola'>('qr');
  const [hasCopied, setHasCopied] = useState(false);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrDetails, setQrDetails] = useState<{
    qrCodeId: string;
    payload: string;
    encodedImage?: string;
    status: string;
  } | null>(null);

  const [simulationAmount, setSimulationAmount] = useState<number>(50);
  const [customSimAmount, setCustomSimAmount] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [isCustomSim, setIsCustomSim] = useState(false);
  const [latestReceived, setLatestReceived] = useState<TroncoContribution | null>(null);
  const [sessionTotals, setSessionTotals] = useState<{ totalAmount: number; confirmedCount: number }>({
    totalAmount: 0,
    confirmedCount: 0,
  });

  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isDevOrSandbox = !import.meta.env.PROD;

  // Carrega ou gera o QR Code estático oficial da sessão
  useEffect(() => {
    if (isOpen && activeSession) {
      setIsLoadingQr(true);
      setQrError(null);
      setHasCopied(false);
      setLatestReceived(null);
      setSimError(null);
      setActivePaymentMode(isMobile ? 'copia_cola' : 'qr');

      // Obter totais oficiais agregados do backend
      troncoService.getSessionTotals(activeSession.id).then(setSessionTotals);

      troncoService
        .getOrCreateSessionStaticQr(activeSession)
        .then((data) => {
          setQrDetails(data);
          setQrError(null);
        })
        .catch((err: any) => {
          console.warn('Erro ao obter QR Code estático da sessão:', err?.message || err);
          setQrError(
            err.message ||
              'Não foi possível gerar o QR Code Pix do Asaas. Verifique a comunicação com o serviço de pagamentos.'
          );
          setQrDetails(null);
        })
        .finally(() => {
          setIsLoadingQr(false);
        });
    }
  }, [isOpen, activeSession, isMobile]);

  // Realtime: atualiza totais agregados quando um novo pagamento for confirmado
  useEffect(() => {
    if (!isOpen || !activeSession) return;

    const unsubscribe = troncoService.subscribeToRealtimeTronco((_all, latestConfirmed) => {
      troncoService.getSessionTotals(activeSession.id).then(setSessionTotals);

      if (
        latestConfirmed &&
        latestConfirmed.sessionId === activeSession.id &&
        (latestConfirmed.status === 'CONFIRMED' || latestConfirmed.status === 'RECEIVED')
      ) {
        setLatestReceived(latestConfirmed);
        if (onSuccess) onSuccess(latestConfirmed);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, activeSession, onSuccess]);

  if (!isOpen || !activeSession) return null;

  const finalSimAmount = isCustomSim ? Number(customSimAmount) || 0 : simulationAmount;

  const handleCopyPayload = async () => {
    if (!qrDetails?.payload) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(qrDetails.payload);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = qrDetails.payload;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 3500);
    } catch (e) {
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 3500);
    }
  };

  const handleSimulatePayment = async () => {
    if (!qrDetails || finalSimAmount <= 0) return;
    setIsSimulating(true);
    setSimError(null);
    try {
      const contrib = await troncoService.simulateIncomingPayment({
        sessionId: activeSession.id,
        qrCodeId: qrDetails.qrCodeId,
        amount: finalSimAmount,
        sessionTitle: activeSession.title,
        sessionDate: activeSession.date,
        payload: qrDetails.payload,
      });
      setLatestReceived(contrib);
      troncoService.getSessionTotals(activeSession.id).then(setSessionTotals);
      if (onSuccess) onSuccess(contrib);
    } catch (err: any) {
      console.error('Erro na simulação do PIX:', err);
      setSimError(err.message || 'Falha ao executar simulação.');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div
      id="tronco-pix-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 p-5 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-masonic text-base sm:text-lg font-bold text-amber-200 tracking-wide">
                Tronco de Beneficência
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-amber-400/80" />
                QR Code PIX Estático da Sessão
              </p>
            </div>
          </div>
          <button
            id="close-tronco-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Sessão Ativa Info */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-amber-200">{activeSession.title}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {activeSession.date} • {activeSession.degreeLevel} • Coleta Fraternal
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Sessão Aberta
            </div>
          </div>

          {/* Banner de recebimento em tempo real */}
          {latestReceived && (
            <div className="bg-emerald-950/80 border-2 border-emerald-500/80 text-white p-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-in zoom-in-95 duration-300">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Novo Pagamento Confirmado!
                </div>
                <div className="text-xs text-emerald-100 font-mono font-bold mt-0.5">
                  R$ {latestReceived.amount.toFixed(2).replace('.', ',')} adicionado ao Tronco
                </div>
              </div>
            </div>
          )}

          {isLoadingQr ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs text-slate-400">Gerando QR Code oficial via Asaas...</p>
            </div>
          ) : qrError ? (
            <div className="p-5 bg-rose-950/30 border border-rose-500/40 rounded-2xl text-rose-200 text-center space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
              <p className="text-sm font-semibold">{qrError}</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Nenhum QR Code alternativo foi gerado para assegurar estrita conformidade com as diretrizes do Asaas e integridade financeira.
              </p>
            </div>
          ) : qrDetails ? (
            <div className="space-y-4">
              {/* Seletor de Modo: QR Code vs Copia e Cola */}
              <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1 max-w-xs mx-auto">
                <button
                  type="button"
                  id="tab-pix-qr"
                  onClick={() => setActivePaymentMode('qr')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    activePaymentMode === 'qr'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Ver QR Code</span>
                </button>
                <button
                  type="button"
                  id="tab-pix-copia-cola"
                  onClick={() => setActivePaymentMode('copia_cola')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    activePaymentMode === 'copia_cola'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copia e Cola</span>
                </button>
              </div>

              {/* Modo Visual: QR Code */}
              {activePaymentMode === 'qr' && (
                <div className="space-y-3 text-center animate-in fade-in duration-200">
                  <div className="inline-block p-4 bg-white rounded-2xl shadow-2xl border-4 border-amber-500/30">
                    {qrDetails.encodedImage ? (
                      <img
                        src={
                          qrDetails.encodedImage.startsWith('data:')
                            ? qrDetails.encodedImage
                            : `data:image/png;base64,${qrDetails.encodedImage}`
                        }
                        alt="QR Code PIX da Sessão"
                        className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                      />
                    ) : (
                      <QRCodeSVG
                        value={qrDetails.payload}
                        size={200}
                        level="M"
                        includeMargin={false}
                      />
                    )}
                  </div>

                  <p className="text-xs text-slate-300 font-medium">
                    Aponte a câmera do aplicativo do seu banco para o QR Code.
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Este QR Code aceita múltiplos pagamentos e valor livre. Digite a quantia do seu óbolo fraternal diretamente no app do seu banco.
                  </p>

                  <div className="max-w-sm mx-auto pt-1">
                    <button
                      type="button"
                      onClick={handleCopyPayload}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                        hasCopied
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {hasCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Código Pix Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Código Pix Copia e Cola</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Modo Copia e Cola */}
              {activePaymentMode === 'copia_cola' && (
                <div className="space-y-3.5 text-left animate-in fade-in duration-200">
                  <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-3.5 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="text-xs text-slate-300 space-y-0.5">
                      <p className="font-semibold text-amber-300">Pagando pelo celular?</p>
                      <p className="text-slate-400 leading-relaxed">
                        Copie o código abaixo, abra o aplicativo do seu banco, selecione a opção <strong>PIX Copia e Cola</strong> e defina o valor do seu óbolo.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Código PIX Copia e Cola (Valor Livre):
                    </label>
                    <div className="relative">
                      <textarea
                        readOnly
                        value={qrDetails.payload}
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 select-all focus:outline-none focus:border-amber-500/50 resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPayload}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                      hasCopied
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                    }`}
                  >
                    {hasCopied ? (
                      <>
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Código Copiado para a Área de Transferência!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Código Pix Copia e Cola</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Seção Sandbox / Testes (Apenas em ambiente que permite simulador) */}
              {isDevOrSandbox && (
                <div className="pt-3 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Simulador de Pagamento (Ambiente de Teste / Sandbox):
                    </span>
                  </div>

                  {simError && (
                    <div className="p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                      {simError}
                    </div>
                  )}

                  <div className="grid grid-cols-5 gap-1.5">
                    {PRESET_AMOUNTS.map((amt) => {
                      const isSelected = !isCustomSim && simulationAmount === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setIsCustomSim(false);
                            setSimulationAmount(amt);
                          }}
                          className={`p-2 rounded-lg border font-mono font-bold text-xs transition ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          R$ {amt}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    id="simulate-pix-success-btn"
                    type="button"
                    disabled={isSimulating || finalSimAmount <= 0}
                    onClick={handleSimulatePayment}
                    className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-amber-300 border border-amber-500/30 rounded-xl py-2.5 px-4 text-xs font-semibold flex items-center justify-center space-x-2 transition"
                  >
                    {isSimulating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Confirmando pagamento no Asaas...</span>
                      </>
                    ) : (
                      <>
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>Simular Pagamento de R$ {finalSimAmount.toFixed(2).replace('.', ',')}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-rose-400">
              Não foi possível gerar o QR Code da Sessão. Verifique as credenciais do Asaas.
            </div>
          )}
        </div>

        {/* Footer com Total Oficial Agregado */}
        <div className="bg-slate-950/80 border-t border-slate-800 p-4 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Total Arrecadado na Sessão:{' '}
            <strong className="text-amber-300 font-mono font-bold">
              R$ {sessionTotals.totalAmount.toFixed(2).replace('.', ',')}
            </strong>
            <span className="text-[11px] text-slate-500 ml-1.5">
              ({sessionTotals.confirmedCount} contribuiç{sessionTotals.confirmedCount === 1 ? 'ão' : 'ões'})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
