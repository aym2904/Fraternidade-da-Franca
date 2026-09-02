import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  RefreshCw,
  User,
  Phone,
  Layers,
  Calendar,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  Clock,
  ArrowRight,
  Volume2
} from 'lucide-react';
import { Member, PastaSale } from '../../types/masonic';
import { formatCurrencyBRL } from '../../utils/pastaUtils';

interface PastaQrCodePickupScannerProps {
  currentUser: Member;
  sales: PastaSale[];
  onConfirmPickup: (identifier: string, notes?: string) => Promise<{ success: boolean; sale?: PastaSale; message: string }>;
}

export const PastaQrCodePickupScanner: React.FC<PastaQrCodePickupScannerProps> = ({
  currentUser,
  sales,
  onConfirmPickup,
}) => {
  // Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');
  
  // Located Sale & Validation result
  const [selectedSale, setSelectedSale] = useState<PastaSale | null>(null);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'already_picked' | 'invalid'>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pickupNotes, setPickupNotes] = useState('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'pasta-qr-reader-container';

  // Sound feedback helper
  const playBeep = (isSuccess: boolean) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = isSuccess ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(isSuccess ? 880 : 300, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + (isSuccess ? 0.15 : 0.3));
    } catch {}
  };

  // Find sale by token, saleCode or id
  const locateSale = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;

    setScannedCode(clean);

    // Extract UUID if full URL was scanned
    let tokenToMatch = clean;
    if (clean.includes('/RETIRADA/')) {
      tokenToMatch = clean.split('/RETIRADA/')[1] || clean;
    } else if (clean.includes('TOKEN:')) {
      tokenToMatch = clean.split('TOKEN:')[1].trim();
    }

    const found = sales.find(
      (s) =>
        s.qrCodeToken.toUpperCase() === tokenToMatch ||
        s.saleCode.toUpperCase() === tokenToMatch ||
        s.id.toUpperCase() === tokenToMatch ||
        s.qrCodeToken.toUpperCase().replace(/-/g, '') === tokenToMatch.replace(/-/g, '') ||
        s.phone.replace(/\D/g, '') === tokenToMatch.replace(/\D/g, '')
    );

    if (found) {
      setSelectedSale(found);
      if (found.status === 'Retirada Realizada') {
        setValidationStatus('already_picked');
        setFeedbackMessage(
          `⚠️ QR Code inválido ou retirada já realizada anteriormente em ${
            found.pickupDate ? new Date(found.pickupDate).toLocaleString('pt-BR') : 'data anterior'
          } por ${found.pickupOperatorName || 'Irmão responsável'}.`
        );
        playBeep(false);
      } else if (found.status === 'Cancelada') {
        setValidationStatus('invalid');
        setFeedbackMessage('❌ Esta venda consta como cancelada no sistema.');
        playBeep(false);
      } else {
        setValidationStatus('valid');
        setFeedbackMessage('✓ QR Code válido! Venda aguardando retirada.');
        playBeep(true);
      }
    } else {
      setSelectedSale(null);
      setValidationStatus('invalid');
      setFeedbackMessage('QR Code inválido ou retirada já realizada.');
      playBeep(false);
    }
  };

  // Start Camera QR Scanner
  const startScanner = async () => {
    setCameraError(null);
    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {}
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          locateSale(decodedText);
          // Auto stop camera on scan for confirmation
          stopScanner();
        },
        () => {}
      );
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraError('Não foi possível acessar a câmera. Você pode digitar o código ou token manualmente.');
      setIsCameraActive(false);
    }
  };

  // Stop Camera QR Scanner
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    locateSale(manualInput);
  };

  const handleConfirmPickupClick = async () => {
    if (!selectedSale) return;
    setIsProcessing(true);
    try {
      const result = await onConfirmPickup(selectedSale.qrCodeToken, pickupNotes);
      if (result.success && result.sale) {
        setSelectedSale(result.sale);
        setValidationStatus('already_picked');
        setFeedbackMessage('✓ Retirada confirmada com sucesso! Entrega registrada.');
        playBeep(true);
      } else {
        setFeedbackMessage(result.message);
      }
    } catch (e) {
      setFeedbackMessage('Erro ao registrar retirada.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedSale(null);
    setValidationStatus('idle');
    setFeedbackMessage('');
    setScannedCode('');
    setManualInput('');
    setPickupNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Operator Info */}
      <div className="bg-slate-900 border border-amber-900/30 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 font-serif-masonic flex items-center space-x-2">
              <span>Leitor de QR Code & Retirada</span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                AO VIVO
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Obreiro validador: <strong className="text-slate-200">{currentUser.fullName}</strong>
            </p>
          </div>
        </div>

        {/* Action Toggle Camera */}
        <div className="flex items-center space-x-2">
          {!isCameraActive ? (
            <button
              type="button"
              onClick={startScanner}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-lg transition active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Abrir Câmera do Celular</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopScanner}
              className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-lg transition active:scale-95 cursor-pointer"
            >
              <CameraOff className="w-4 h-4" />
              <span>Fechar Câmera</span>
            </button>
          )}

          {validationStatus !== 'idle' && (
            <button
              type="button"
              onClick={handleReset}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
              title="Nova Consulta"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grid: Camera / Scanner Box & Manual Search */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Camera Scanner Container */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
              <Camera className="w-4 h-4" />
              <span>Câmera de Leitura</span>
            </h3>

            {/* Camera Viewport */}
            <div className="relative bg-slate-950 rounded-2xl border-2 border-dashed border-slate-800 overflow-hidden min-h-[280px] flex items-center justify-center">
              <div id={scannerContainerId} className="w-full max-w-sm rounded-xl overflow-hidden" />

              {!isCameraActive && (
                <div className="text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                    <Camera className="w-8 h-8 text-amber-400/70" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200 text-sm">Câmera Desligada</p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                      Clique no botão acima para ativar a câmera do dispositivo e apontar para o QR Code do cliente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startScanner}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold border border-slate-700 transition"
                  >
                    Ativar Câmera Agora
                  </button>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-200">
                {cameraError}
              </div>
            )}

            {/* Fallback: Digitação / Busca Manual */}
            <form onSubmit={handleManualSearch} className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-medium text-slate-400">
                Ou digite o Código da Venda / Token / Telefone:
              </label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Ex: MASSA-8F3A ou 8F3A7D91..."
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs font-mono focus:outline-none focus:border-amber-500 transition pl-9"
                  />
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold border border-slate-700 transition flex items-center space-x-1 shrink-0"
                >
                  <span>Buscar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Col: Located Sale Result & Confirmation */}
        <div className="lg:col-span-6 space-y-4">
          {/* Validation Alert Banner in Spotlight */}
          {validationStatus !== 'idle' && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-start space-x-3 shadow-xl transition-all animate-in fade-in zoom-in-95 ${
                validationStatus === 'valid'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-100 shadow-emerald-950/30'
                  : validationStatus === 'already_picked'
                  ? 'bg-amber-950/80 border-amber-500 text-amber-100 shadow-amber-950/30'
                  : 'bg-rose-950/90 border-rose-500 text-rose-100 shadow-rose-950/30'
              }`}
            >
              {validationStatus === 'valid' && <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />}
              {validationStatus === 'already_picked' && <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />}
              {validationStatus === 'invalid' && <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />}
              <div>
                <h4 className="font-bold text-sm">
                  {validationStatus === 'valid'
                    ? 'QR Code Válido - Pronto para Retirada'
                    : validationStatus === 'already_picked'
                    ? 'Atenção: Retirada Já Efetuada'
                    : 'Validação Recusada'}
                </h4>
                <p className="mt-1 leading-relaxed">{feedbackMessage}</p>
              </div>
            </div>
          )}

          {/* Sale Details Card */}
          {selectedSale ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Venda:</span>
                  <span className="font-mono font-extrabold text-sm text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-lg border border-amber-800/60">
                    {selectedSale.saleCode}
                  </span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    selectedSale.status === 'Retirada Realizada'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {selectedSale.status}
                </span>
              </div>

              {/* Data Grid */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400 flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nome do Cliente:</span>
                  </span>
                  <span className="font-bold text-slate-100 text-sm">{selectedSale.customerName}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400 flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Telefone:</span>
                  </span>
                  <span className="font-mono font-semibold text-slate-200">{selectedSale.phone}</span>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-slate-400 flex items-center space-x-1.5 text-xs">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>Sabores e Quantidades a Entregar:</span>
                  </span>
                  <div className="bg-amber-950/20 border border-amber-900/40 p-2.5 rounded-lg">
                    <p className="font-bold text-amber-300 text-sm">{selectedSale.flavor}</p>
                    <p className="text-[11px] text-slate-300 mt-1">
                      Total a entregar: <strong className="text-amber-400 font-mono text-sm">{selectedSale.totalQuantity} {selectedSale.totalQuantity === 1 ? 'massa' : 'massas'}</strong>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Data da Venda</span>
                    <span className="font-mono text-slate-200 text-xs">
                      {new Date(selectedSale.createdAt).toLocaleDateString('pt-BR')} às {new Date(selectedSale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Irmão Responsável</span>
                    <span className="font-semibold text-slate-200 text-xs truncate block" title={selectedSale.sellerName}>
                      {selectedSale.sellerName}
                    </span>
                  </div>
                </div>

                {/* Pickup Historic Record if already picked up */}
                {selectedSale.pickupDate && (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-emerald-900/40 text-[11px] space-y-1 text-slate-300">
                    <p className="text-emerald-400 font-bold flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Comprovante de Entrega Realizada</span>
                    </p>
                    <p>
                      Entregue em: <strong>{new Date(selectedSale.pickupDate).toLocaleString('pt-BR')}</strong>
                    </p>
                    <p>
                      Entregue pelo Irmão: <strong>{selectedSale.pickupOperatorName || 'Não especificado'}</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Delivery Button */}
              {selectedSale.status === 'Aguardando Retirada' ? (
                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <button
                    type="button"
                    onClick={handleConfirmPickupClick}
                    disabled={isProcessing}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-sm rounded-xl flex items-center justify-center space-x-2 shadow-xl shadow-emerald-950/50 transition transform active:scale-98 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Confirmar Retirada das Massas</span>
                  </button>
                  <p className="text-[10px] text-center text-slate-500">
                    Registrará automaticamente a data, hora e o nome do Irmão <strong>{currentUser.fullName}</strong>.
                  </p>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                  >
                    Escanear Próximo QR Code
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-300">Nenhum Pedido Selecionado</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  Aponte a câmera para o QR Code do cliente ou faça a busca pelo código da venda no formulário ao lado.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
