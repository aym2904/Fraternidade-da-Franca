import React, { useState } from 'react';
import {
  ShoppingBag,
  User,
  Phone,
  CheckCircle2,
  Plus,
  Minus,
  Sparkles,
  AlertCircle,
  FileText,
  MessageSquare
} from 'lucide-react';
import { Member, PastaSale, PastaFlavor } from '../../types/masonic';
import {
  generateSaleCode,
  generateQrCodeToken,
  formatFlavorSummary,
  formatCurrencyBRL,
  formatPhoneNumber,
  PASTA_UNIT_PRICE,
} from '../../utils/pastaUtils';

interface PastaSaleRegistrationFormProps {
  currentUser: Member;
  onSaleCreated: (sale: PastaSale) => void;
  className?: string;
}

export const PastaSaleRegistrationForm: React.FC<PastaSaleRegistrationFormProps> = ({
  currentUser,
  onSaleCreated,
  className = '',
}) => {
  // Form State
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Flavors Quantities
  const [qtdQuatroQueijos, setQtdQuatroQueijos] = useState<number>(1);
  const [qtdPresuntoMucarela, setQtdPresuntoMucarela] = useState<number>(0);

  // Notes
  const [notes, setNotes] = useState('');

  // Validation Error state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculations
  const totalQuantity = qtdQuatroQueijos + qtdPresuntoMucarela;
  const totalAmount = totalQuantity * PASTA_UNIT_PRICE;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw.length <= 11) {
      setPhone(formatPhoneNumber(raw));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validations
    if (!customerName.trim()) {
      setErrorMsg('Por favor, informe o Nome Completo do cliente.');
      return;
    }

    const rawPhone = phone.replace(/\D/g, '');
    if (rawPhone.length < 10) {
      setErrorMsg('Por favor, informe um número de Telefone/WhatsApp válido com DDD.');
      return;
    }

    if (totalQuantity <= 0) {
      setErrorMsg('A quantidade total de massas deve ser de pelo menos 1 unidade.');
      return;
    }

    setIsSubmitting(true);

    try {
      const items = [
        { flavor: 'Quatro Queijos' as PastaFlavor, quantity: qtdQuatroQueijos },
        { flavor: 'Presunto e Muçarela' as PastaFlavor, quantity: qtdPresuntoMucarela },
      ].filter((item) => item.quantity > 0);

      const flavorSummary = formatFlavorSummary(items);
      const saleCode = generateSaleCode();
      const qrCodeToken = generateQrCodeToken();

      const newSale: PastaSale = {
        id: `sale-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        saleCode,
        qrCodeToken,
        customerName: customerName.trim(),
        phone: phone.trim(),
        flavor: flavorSummary,
        items,
        totalQuantity,
        unitPrice: PASTA_UNIT_PRICE,
        totalAmount,
        sellerId: currentUser.id,
        sellerName: currentUser.fullName,
        sellerCim: currentUser.cim,
        createdAt: new Date().toISOString(),
        status: 'Aguardando Retirada',
        notes: notes.trim() || undefined,
      };

      onSaleCreated(newSale);

      // Reset form
      setCustomerName('');
      setPhone('');
      setQtdQuatroQueijos(1);
      setQtdPresuntoMucarela(0);
      setNotes('');
    } catch (err: any) {
      setErrorMsg('Erro ao cadastrar venda. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-slate-900 border border-amber-900/30 rounded-2xl shadow-xl overflow-hidden ${className}`}>
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 border-b border-amber-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 font-serif-masonic flex items-center space-x-2">
              <span>Nova Venda de Massas</span>
              <span className="text-xs font-mono font-normal bg-amber-950/80 text-amber-400 border border-amber-800/60 px-2 py-0.5 rounded-full">
                {formatCurrencyBRL(PASTA_UNIT_PRICE)} / un
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Vendedor conectado: <strong className="text-slate-200">{currentUser.fullName}</strong>
            </p>
          </div>
        </div>

        {/* Live Cart Preview Pill */}
        <div className="bg-slate-950/70 border border-slate-800 px-3.5 py-2 rounded-xl flex items-center justify-between sm:justify-end space-x-4">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Total a Pagar</p>
            <p className="text-base font-mono font-bold text-emerald-400">
              {formatCurrencyBRL(totalAmount)}
            </p>
          </div>
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-2.5 py-1 rounded-lg font-mono font-bold">
            {totalQuantity} {totalQuantity === 1 ? 'un' : 'un'}
          </span>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6">
        {errorMsg && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 p-3.5 rounded-xl text-xs flex items-center space-x-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Section 1: Customer Info */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>1. Dados do Cliente</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome do Cliente */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Nome do Cliente <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo Silveira"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition pl-10"
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            {/* Telefone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Telefone / WhatsApp <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  placeholder="(16) 99999-9999"
                  value={phone}
                  onChange={handlePhoneChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition pl-10 font-mono"
                />
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
              <p className="text-[10px] text-slate-500">Usado para envio imediato do comprovante e QR Code.</p>
            </div>
          </div>
        </div>

        {/* Section 2: Flavors & Quantities */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>2. Seleção de Sabores e Quantidades</span>
            </h3>
            <span className="text-xs text-slate-400">
              Total Selecionado: <strong className="text-slate-200">{totalQuantity} un</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sabor 1: Quatro Queijos */}
            <div className={`p-4 rounded-2xl border transition-all ${
              qtdQuatroQueijos > 0
                ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-950/20'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-1.5">
                    <span>🧀 Quatro Queijos</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Massa artesanal recheada com blend nobre de queijos.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  {formatCurrencyBRL(PASTA_UNIT_PRICE)}
                </span>
              </div>

              {/* Counter Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-400">Quantidade:</span>
                <div className="flex items-center space-x-3 bg-slate-900 px-2 py-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setQtdQuatroQueijos((prev) => Math.max(0, prev - 1))}
                    disabled={qtdQuatroQueijos === 0}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center font-mono font-bold text-base text-slate-100">
                    {qtdQuatroQueijos}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQtdQuatroQueijos((prev) => prev + 1)}
                    className="p-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition active:scale-95 shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Sabor 2: Presunto e Muçarela */}
            <div className={`p-4 rounded-2xl border transition-all ${
              qtdPresuntoMucarela > 0
                ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-950/20'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-slate-100 text-sm flex items-center space-x-1.5">
                    <span>🥓 Presunto e Muçarela</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Recheio tradicional saboroso com muçarela selecionada.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  {formatCurrencyBRL(PASTA_UNIT_PRICE)}
                </span>
              </div>

              {/* Counter Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-400">Quantidade:</span>
                <div className="flex items-center space-x-3 bg-slate-900 px-2 py-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setQtdPresuntoMucarela((prev) => Math.max(0, prev - 1))}
                    disabled={qtdPresuntoMucarela === 0}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center font-mono font-bold text-base text-slate-100">
                    {qtdPresuntoMucarela}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQtdPresuntoMucarela((prev) => prev + 1)}
                    className="p-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition active:scale-95 shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Notes (Optional) */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
            <MessageSquare className="w-4 h-4" />
            <span>3. Observações do Pedido (Opcional)</span>
          </h3>

          <div className="space-y-1.5">
            <input
              type="text"
              placeholder="Ex: Entregar para a esposa, cliente irá retirar às 11h..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500 transition"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Ao efetivar, o sistema gerará o <strong>QR Code exclusivo</strong> para conferência na retirada.
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || totalQuantity <= 0}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 rounded-xl font-bold text-sm shadow-xl shadow-amber-950/40 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Efetivar Venda ({formatCurrencyBRL(totalAmount)})</span>
          </button>
        </div>
      </form>
    </div>
  );
};
