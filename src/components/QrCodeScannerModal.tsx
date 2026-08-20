import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertTriangle, CheckCircle2, QrCode, RefreshCw, Lock, Upload, KeyRound, Type } from 'lucide-react';
import { Session, Member } from '../types/masonic';
import { canAccessSessionDegree, isLodgeAdmin, isSystemAdmin } from '../utils/authUtils';

interface QrCodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSession: Session | undefined;
  currentUser: Member;
  onSuccessCheckIn: (memberId: string) => void;
}

export const QrCodeScannerModal: React.FC<QrCodeScannerModalProps> = ({
  isOpen,
  onClose,
  activeSession,
  currentUser,
  onSuccessCheckIn,
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanMode, setScanMode] = useState<'camera' | 'token'>('camera');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualTokenInput, setManualTokenInput] = useState('');

  useEffect(() => {
    if (!isOpen || !activeSession) {
      return;
    }

    setScanResult(null);
    setCameraError(null);
    setIsScanning(false);

    if (scanMode !== 'camera') {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      return;
    }

    const elementId = 'qr-reader-container';

    // Delay initialization slightly to ensure modal DOM element exists
    const timer = setTimeout(() => {
      try {
        const html5Qrcode = new Html5Qrcode(elementId);
        scannerRef.current = html5Qrcode;

        const config = {
          fps: 10,
          qrbox: { width: 220, height: 220 },
        };

        setIsScanning(true);

        html5Qrcode
          .start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              handleProcessToken(decodedText);
            },
            () => {
              // Ignore frame-by-frame scan failures
            }
          )
          .catch((err) => {
            console.warn('Camera start error:', err);
            setIsScanning(false);
            setCameraError(
              'Não foi possível acessar a câmera do seu dispositivo. Mude para a aba "Digitar Token" para fazer o check-in inserindo o código.'
            );
          });
      } catch (err) {
        console.error('Html5Qrcode init error:', err);
        setCameraError('Câmera indisponível. Utilize a inserção por código do Token.');
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .catch(() => {})
            .finally(() => {
              try {
                scannerRef.current?.clear();
              } catch (e) {
                // ignore clear errors
              }
            });
        }
      }
    };
  }, [isOpen, activeSession, scanMode]);

  if (!isOpen || !activeSession) return null;

  const isDegreeAccessible = canAccessSessionDegree(currentUser, activeSession.degreeLevel);

  const handleProcessToken = (scannedText: string) => {
    const cleanToken = scannedText.trim();

    // 1. Verify Degree Access
    if (!isDegreeAccessible) {
      setScanResult({
        success: false,
        message: `ACESSO NEGADO POR GRAU: Você está logado como ${currentUser.degree} (Grau ${currentUser.degreeLevel}). Esta reunião é restrita ao Grau de ${activeSession.degree} (${activeSession.degreeLevel}º Grau).`,
      });
      return;
    }

    // 2. Validate Token matches active session
    if (cleanToken === activeSession.qrCodeToken || cleanToken.includes(activeSession.qrCodeToken)) {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      setIsScanning(false);

      setScanResult({
        success: true,
        message: `Presença Validada! A presença de ${currentUser.fullName} (CIM: ${currentUser.cim}) foi registrada com sucesso na ${activeSession.title}.`,
      });

      onSuccessCheckIn(currentUser.id);
    } else {
      setScanResult({
        success: false,
        message: `TOKEN / QR CODE INVÁLIDO: O código inserido ("${cleanToken}") não corresponde ao código oficial do Templo para a ${activeSession.title}.`,
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scannerRef.current) return;

    try {
      setScanResult(null);
      const decodedText = await scannerRef.current.scanFile(file, true);
      handleProcessToken(decodedText);
    } catch (err) {
      setScanResult({
        success: false,
        message: 'Nenhum QR Code válido foi identificado na foto enviada. Tente digitar o token manualmente.',
      });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTokenInput.trim()) return;
    handleProcessToken(manualTokenInput.trim());
  };

  const handleSimulateScan = () => {
    handleProcessToken(activeSession.qrCodeToken);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-start sm:justify-center bg-slate-950/85 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto overscroll-contain">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full my-auto shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-900/95">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-masonic text-base sm:text-lg font-bold text-slate-100">
                Registrar Minha Presença
              </h3>
              <p className="text-xs text-slate-400">
                Escolha ler o QR Code com a câmera ou digitar o Token
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 overscroll-contain">
          {/* Session & Member Info Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
            <p className="font-semibold text-amber-200">{activeSession.title}</p>
            <p className="text-slate-400">
              Usuário: <strong className="text-slate-200">{currentUser.fullName}</strong>
              {!isSystemAdmin(currentUser) && ` (CIM: ${currentUser.cim} • ${currentUser.degree})`}
            </p>
          </div>

        {/* Degree Constraint Check Warning */}
        {!isDegreeAccessible && (
          <div className="bg-rose-950/80 border border-rose-600/80 rounded-xl p-3 text-xs text-rose-200 flex items-start space-x-2">
            <Lock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>
              <strong>Acesso Restrito por Grau:</strong> Seu grau de {currentUser.degree} ({currentUser.degreeLevel}º) não permite registro na reunião de Grau {activeSession.degree} ({activeSession.degreeLevel}º).
            </span>
          </div>
        )}

        {/* Mode Selector Tabs (Camera vs Token Input) */}
        {!scanResult?.success && (
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => {
                setScanMode('camera');
                setScanResult(null);
              }}
              className={`py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition ${
                scanMode === 'camera'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Ler com a Câmera</span>
            </button>

            <button
              onClick={() => {
                setScanMode('token');
                setScanResult(null);
              }}
              className={`py-2 px-3 rounded-lg flex items-center justify-center space-x-2 transition ${
                scanMode === 'token'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Digitar Token</span>
            </button>
          </div>
        )}

        {/* Scan Result Feedback Banner */}
        {scanResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-medium space-y-1 ${
              scanResult.success
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                : 'bg-rose-950/90 border-rose-500 text-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {scanResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span className="font-bold">{scanResult.success ? 'PRESENÇA CONFIRMADA' : 'ERRO DE VALIDAÇÃO'}</span>
            </div>
            <p className="text-[11px] leading-relaxed pl-7">{scanResult.message}</p>
          </div>
        )}

        {/* CAMERA MODE */}
        {!scanResult?.success && scanMode === 'camera' && (
          <div className="space-y-4">
            <div className="relative bg-slate-950 border-2 border-dashed border-amber-500/40 rounded-2xl overflow-hidden min-h-[250px] flex flex-col items-center justify-center">
              {/* html5-qrcode container target */}
              <div id="qr-reader-container" className="w-full h-full min-h-[240px]" />

              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center space-y-3 z-10">
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                  <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                  <button
                    onClick={() => setScanMode('token')}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl"
                  >
                    Mudar para Inserção por Token
                  </button>
                </div>
              )}
            </div>

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
                onClick={handleSimulateScan}
                disabled={!isDegreeAccessible}
                className="hover:text-amber-300 flex items-center space-x-1 text-slate-400 transition"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                <span>Simular leitura</span>
              </button>
            </div>
          </div>
        )}

        {/* TOKEN INPUT MODE */}
        {!scanResult?.success && scanMode === 'token' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <label className="block text-xs font-semibold text-amber-300 flex items-center space-x-1.5">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Token Exibido no Templo (Abaixo do QR Code):</span>
              </label>
              
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Digite o código Token do QR Code projetado na entrada do Templo para confirmar sua presença.
              </p>

              <input
                type="text"
                value={manualTokenInput}
                onChange={(e) => setManualTokenInput(e.target.value)}
                placeholder="Ex: QR-A1485-FRATERNIDADE3571-20260812"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!manualTokenInput.trim() || !isDegreeAccessible}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition disabled:opacity-50"
            >
              Validar Token e Confirmar Presença
            </button>

            {isLodgeAdmin(currentUser) && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleSimulateScan}
                  disabled={!isDegreeAccessible}
                  className="text-xs text-slate-400 hover:text-amber-300 underline transition"
                >
                  Usar Token Automático de Teste ({activeSession.qrCodeToken})
                </button>
              </div>
            )}
          </form>
        )}

        {/* Success Action Footer */}
        {scanResult?.success && (
          <button
            onClick={onClose}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
          >
            Concluir e Fechar
          </button>
        )}
        </div>
      </div>
    </div>
  );
};

