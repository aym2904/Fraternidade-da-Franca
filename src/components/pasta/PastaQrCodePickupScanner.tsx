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
  Upload,
  KeyRound,
  QrCode,
  Lock
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
  // Scanner State & Mode
  const [scanMode, setScanMode] = useState<'camera' | 'token'>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
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
          `⚠️ Atenção: A retirada desta venda já foi efetuada em ${
            found.pickupDate ? new Date(found.pickupDate).toLocaleString('pt-BR') : 'data anterior'
          } pelo Ir. ${found.pickupOperatorName || 'Irmão responsável'}.`
        );
        playBeep(false);
      } else if (found.status === 'Cancelada') {
        setValidationStatus('invalid');
        setFeedbackMessage('❌ Esta venda consta como cancelada no sistema.');
        playBeep(false);
      } else {
        setValidationStatus('valid');
        setFeedbackMessage('✓ QR Code validado! Pedido pronto para retirada.');
        playBeep(true);
      }
    } else {
      setSelectedSale(null);
      setValidationStatus('invalid');
      setFeedbackMessage('Nenhuma venda encontrada para o código ou QR Code lido.');
      playBeep(false);
    }
  };

  // Start Camera QR Scanner
  const startScanner = async () => {
    setCameraError(null);
    try {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
        } catch {}
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 12,
        qrbox: { width: 220, height: 220 },
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          locateSale(decodedText);
          stopScanner();
        },
        () => {}
      );
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraError('Não foi possível acessar a câmera do seu dispositivo. Você pode digitar o código ou enviar uma foto.');
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

  // Switch mode handling
  useEffect(() => {
    if (scanMode === 'camera') {
      const timer = setTimeout(() => {
        startScanner();
      }, 250);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [scanMode]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = scanner;
      }
      const decodedText = await scanner.scanFile(file, true);
      locateSale(decodedText);
    } catch (err) {
      setValidationStatus('invalid');
      setFeedbackMessage('Nenhum QR Code legível foi detectado na foto. Tente digitar o código manualmente.');
      playBeep(false);
    }
  };

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
    setManualInput('');
    setPickupNotes('');
    if (scanMode === 'camera') {
      startScanner();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Operator Info */}
      <div className="bg-slate-900 border border-amber-900/30 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow">
            <QrCode className="w-6 h-6" />
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

        {/* Mode Selector Tabs (Camera vs Manual Token Input) */}
        <div className="flex items-center space-x-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setScanMode('camera');
                setValidationStatus('idle');
                setSelectedSale(null);
              }}
              className={`py-1.5 px-3 rounded-lg flex items-center space-x-1.5 transition ${
                scanMode === 'camera'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Câmera</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScanMode('token');
                setValidationStatus('idle');
                setSelectedSale(null);
              }}
              className={`py-1.5 px-3 rounded-lg flex items-center space-x-1.5 transition ${
                scanMode === 'token'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Digitar Código</span>
            </button>
          </div>

          {validationStatus !== 'idle' && (
            <button
              type="button"
              onClick={handleReset}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
              title="Nova Leitura"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grid: Camera / Scanner Box & Located Sale Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Scanner Container */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
                {scanMode === 'camera' ? <Camera className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
                <span>{scanMode === 'camera' ? 'Câmera de Leitura do QR Code' : 'Inserção por Código ou Telefone'}</span>
              </h3>

              {scanMode === 'camera' && (
                <button
                  type="button"
                  onClick={isCameraActive ? stopScanner : startScanner}
                  className="text-xs font-semibold text-slate-400 hover:text-amber-300 transition flex items-center space-x-1"
                >
                  {isCameraActive ? (
                    <>
                      <CameraOff className="w-3.5 h-3.5 text-rose-400" />
                      <span>Desativar</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Reativar Câmera</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* CAMERA MODE VIEWPORT */}
            {scanMode === 'camera' && (
              <div className="space-y-3">
                <div className="relative bg-slate-950 border-2 border-dashed border-amber-500/40 rounded-2xl overflow-hidden min-h-[260px] max-h-[360px] flex flex-col items-center justify-center shadow-inner">
                  {/* html5-qrcode video container */}
                  <div id={scannerContainerId} className="w-full h-full min-h-[260px] flex items-center justify-center" />

                  {/* Laser & Visual Target Guides Overlay */}
                  {isCameraActive && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="relative w-52 h-52 sm:w-60 sm:h-60 border border-amber-400/30 rounded-2xl flex items-center justify-center">
                        {/* 4 Glowing Corners */}
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-xl -mt-1 -ml-1" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-xl -mt-1 -mr-1" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-xl -mb-1 -ml-1" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-xl -mb-1 -mr-1" />
                        
                        {/* Scanning Laser Line */}
                        <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_#f59e0b] animate-pulse" />
                      </div>
                    </div>
                  )}

                  {/* Inactive Camera Fallback */}
                  {!isCameraActive && !cameraError && (
                    <div className="text-center p-6 space-y-3">
                      <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                        <Camera className="w-7 h-7 text-amber-400/70" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200 text-sm">Câmera Pausada</p>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                          Aponte para o QR Code gerado no comprovante do cliente.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={startScanner}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition shadow cursor-pointer"
                      >
                        Ativar Câmera
                      </button>
                    </div>
                  )}

                  {/* Camera Error View */}
                  {cameraError && (
                    <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center space-y-3 z-10">
                      <AlertTriangle className="w-8 h-8 text-amber-400" />
                      <p className="text-xs text-slate-300 leading-relaxed max-w-xs">{cameraError}</p>
                      <button
                        type="button"
                        onClick={() => setScanMode('token')}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition"
                      >
                        Digitar Código Manualmente
                      </button>
                    </div>
                  )}
                </div>

                {/* Upload Photo Option */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <label className="cursor-pointer hover:text-amber-300 flex items-center space-x-1.5 transition">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Enviar foto do QR Code</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setScanMode('token')}
                    className="hover:text-amber-300 text-slate-400 transition"
                  >
                    Usar teclado →
                  </button>
                </div>
              </div>
            )}

            {/* TOKEN / MANUAL INPUT MODE */}
            {scanMode === 'token' && (
              <form onSubmit={handleManualSearch} className="space-y-4">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <label className="block text-xs font-semibold text-amber-300 flex items-center space-x-1.5">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Código da Venda, Token ou Telefone do Cliente:</span>
                  </label>
                  
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Insira o código do pedido (ex: <span className="font-mono text-amber-400">MASSA-8F3A</span>) ou o número de telefone cadastrado na venda.
                  </p>

                  <div className="relative">
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="Ex: MASSA-8F3A ou 16999998888..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500 pl-9"
                      autoFocus
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="w-full py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-bold rounded-xl text-xs transition disabled:opacity-50 shadow-lg cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Localizar Venda no Sistema</span>
                </button>
              </form>
            )}
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
                    <span className="text-[10px] text-slate-400 block">Irmão Vendedor</span>
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
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
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
