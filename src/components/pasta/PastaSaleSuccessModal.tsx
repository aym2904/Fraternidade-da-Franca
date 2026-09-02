import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Share2,
  Download,
  Copy,
  Check,
  Printer,
  Sparkles,
  ShoppingBag,
  Clock,
  User,
  Phone,
  Layers,
  FileCheck,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { PastaSale } from '../../types/masonic';
import {
  shareSaleViaWhatsApp,
  createWhatsAppMessage,
  formatCurrencyBRL,
  generateSaleVoucherBlob,
  isMobileDevice
} from '../../utils/pastaUtils';

interface PastaSaleSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: PastaSale | null;
  onNewSale?: () => void;
}

export const PastaSaleSuccessModal: React.FC<PastaSaleSuccessModalProps> = ({
  isOpen,
  onClose,
  sale,
  onNewSale,
}) => {
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !sale) return null;

  const handleCopyToken = () => {
    navigator.clipboard.writeText(sale.qrCodeToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopyMessage = () => {
    const msg = createWhatsAppMessage(sale);
    navigator.clipboard.writeText(msg);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleShareWhatsApp = async () => {
    setIsSharing(true);
    setShareFeedback(null);
    try {
      const svgEl = qrRef.current?.querySelector('svg');
      const result = await shareSaleViaWhatsApp(sale, svgEl);
      setShareFeedback(result.message);
      setTimeout(() => setShareFeedback(null), 5000);
    } catch (e) {
      console.error('Error sharing on WhatsApp:', e);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadQrCard = async () => {
    try {
      const svgEl = qrRef.current?.querySelector('svg');
      const blob = await generateSaleVoucherBlob(sale, svgEl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprovante_voucher_${sale.saleCode}_${sale.customerName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      console.error('Error downloading voucher card:', e);
    }
  };

  // QR Code URL or formatted token payload
  const qrValue = sale.qrCodeToken;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 p-4 text-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-slate-950 text-amber-400 rounded-lg flex items-center justify-center font-bold shadow">
              🍝
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight font-serif-masonic">Venda Efetivada com Sucesso!</h3>
              <p className="text-[11px] font-semibold text-slate-900/90">QR Code gerado para retirada</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black/10 hover:bg-black/20 text-slate-950 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* QR Code Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-center flex flex-col items-center justify-center space-y-3 shadow-inner">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/90 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Apresente este QR Code na Retirada</span>
            </span>

            {/* SVG QR Code */}
            <div
              ref={qrRef}
              className="bg-white p-3.5 rounded-2xl shadow-xl border-4 border-amber-400/80 inline-block"
            >
              <QRCodeSVG
                value={qrValue}
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Code / Token Details */}
            <div className="space-y-1 w-full max-w-xs">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xs text-slate-400">Código:</span>
                <span className="text-sm font-mono font-extrabold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                  {sale.saleCode}
                </span>
              </div>
              <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
                <span className="font-mono text-[10px] text-slate-300 truncate max-w-[200px]" title={sale.qrCodeToken}>
                  {sale.qrCodeToken}
                </span>
                <button
                  type="button"
                  onClick={handleCopyToken}
                  title="Copiar Token do QR Code"
                  className="p-1 hover:text-amber-400 transition cursor-pointer"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Sale Summary Info Grid */}
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-700/80">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>Cliente:</span>
              </span>
              <span className="font-bold text-slate-100 text-right">{sale.customerName}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-700/80">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Telefone:</span>
              </span>
              <span className="font-mono text-slate-200">{sale.phone}</span>
            </div>

            <div className="flex items-start justify-between pb-2 border-b border-slate-700/80">
              <span className="text-slate-400 flex items-center space-x-1.5 pt-0.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Sabores:</span>
              </span>
              <div className="text-right">
                <span className="font-semibold text-amber-200">{sale.flavor}</span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Total: <strong className="text-slate-200">{sale.totalQuantity} un</strong> ({formatCurrencyBRL(sale.totalAmount)})
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-700/80">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Irmão Vendedor:</span>
              </span>
              <span className="font-semibold text-slate-200 text-right">{sale.sellerName}</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Status:</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                sale.status === 'Retirada Realizada'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {sale.status}
              </span>
            </div>
          </div>

          {/* Feedback banner if any */}
          {shareFeedback && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-700/60 rounded-xl text-xs text-emerald-200 flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{shareFeedback}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5">
            {/* Primary: Compartilhar / Abrir no WhatsApp Web */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={isSharing}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/40 transition active:scale-[0.98] cursor-pointer disabled:opacity-75"
            >
              {isSharing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gerando Comprovante e Abrindo WhatsApp...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-white" />
                  <span>{isMobileDevice() ? 'Compartilhar Comprovante no WhatsApp' : 'Abrir no WhatsApp Web (com Imagem)'}</span>
                </>
              )}
            </button>

            {!isMobileDevice() && (
              <p className="text-[11px] text-center text-slate-400">
                💡 <strong className="text-slate-300">Dica no PC:</strong> O WhatsApp Web será aberto, a imagem com QR Code é copiada para a área de transferência (<kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-300 font-mono text-[10px]">Ctrl+V</kbd> para colar) e o arquivo PNG é baixado.
              </p>
            )}

            {/* Secondary buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadQrCard}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-xs flex items-center justify-center space-x-1.5 border border-slate-700 transition cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Baixar Imagem PNG</span>
              </button>

              <button
                type="button"
                onClick={handleCopyMessage}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium text-xs flex items-center justify-center space-x-1.5 border border-slate-700 transition cursor-pointer"
              >
                {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                <span>{copiedMessage ? 'Copiado!' : 'Copiar Mensagem'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950/80 p-4 border-t border-slate-800 flex items-center justify-between text-xs">
          {onNewSale ? (
            <button
              type="button"
              onClick={onNewSale}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1 transition cursor-pointer"
            >
              <span>+ Cadastrar Outra Venda</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition font-medium cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
