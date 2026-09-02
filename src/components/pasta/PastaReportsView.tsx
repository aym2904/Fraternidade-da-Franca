import React, { useMemo, useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  TrendingUp,
  ShoppingBag,
  CheckCircle2,
  Clock,
  PieChart,
  Users,
  Layers,
  Sparkles,
  Calendar
} from 'lucide-react';
import { Member, PastaSale } from '../../types/masonic';
import { isLodgeAdmin } from '../../utils/authUtils';
import {
  formatCurrencyBRL,
  exportSalesToPDF,
  exportSalesToCSV,
  PASTA_UNIT_PRICE,
} from '../../utils/pastaUtils';

interface PastaReportsViewProps {
  currentUser: Member;
  sales: PastaSale[];
  members: Member[];
}

export const PastaReportsView: React.FC<PastaReportsViewProps> = ({
  currentUser,
  sales,
  members,
}) => {
  const isAdmin = isLodgeAdmin(currentUser);
  const [selectedSellerFilter, setSelectedSellerFilter] = useState<string>('ALL');

  // Filtered sales for the report
  const activeSales = useMemo(() => {
    if (!isAdmin) {
      return sales.filter((s) => s.sellerId === currentUser.id);
    }
    if (selectedSellerFilter === 'ALL') {
      return sales;
    }
    return sales.filter((s) => s.sellerId === selectedSellerFilter);
  }, [sales, isAdmin, selectedSellerFilter, currentUser.id]);

  // Aggregate Metrics
  const totalOrders = activeSales.length;
  const totalUnits = activeSales.reduce((acc, s) => acc + s.totalQuantity, 0);
  const totalAmount = activeSales.reduce((acc, s) => acc + s.totalAmount, 0);

  const deliveredUnits = activeSales
    .filter((s) => s.status === 'Retirada Realizada')
    .reduce((acc, s) => acc + s.totalQuantity, 0);

  const pendingUnits = activeSales
    .filter((s) => s.status === 'Aguardando Retirada')
    .reduce((acc, s) => acc + s.totalQuantity, 0);

  const deliveredPercentage = totalUnits > 0 ? Math.round((deliveredUnits / totalUnits) * 100) : 0;

  // Breakdown by Flavor
  const flavorStats = useMemo(() => {
    let quatroQueijos = 0;
    let presuntoMucarela = 0;

    activeSales.forEach((s) => {
      if (s.items && s.items.length > 0) {
        s.items.forEach((item) => {
          if (item.flavor === 'Quatro Queijos') quatroQueijos += item.quantity;
          if (item.flavor === 'Presunto e Muçarela') presuntoMucarela += item.quantity;
        });
      } else {
        if (s.flavor.includes('Quatro Queijos')) quatroQueijos += s.totalQuantity;
        if (s.flavor.includes('Presunto e Muçarela')) presuntoMucarela += s.totalQuantity;
      }
    });

    const totalFlavors = quatroQueijos + presuntoMucarela || 1;

    return {
      quatroQueijos: {
        units: quatroQueijos,
        amount: quatroQueijos * PASTA_UNIT_PRICE,
        percent: Math.round((quatroQueijos / totalFlavors) * 100),
      },
      presuntoMucarela: {
        units: presuntoMucarela,
        amount: presuntoMucarela * PASTA_UNIT_PRICE,
        percent: Math.round((presuntoMucarela / totalFlavors) * 100),
      },
    };
  }, [activeSales]);

  const handleExportPdf = () => {
    const sellerObj = members.find((m) => m.id === selectedSellerFilter);
    exportSalesToPDF(
      activeSales,
      'A∴R∴L∴S∴ Fraternidade da Franca Nº 3571',
      selectedSellerFilter !== 'ALL' ? sellerObj?.fullName : undefined
    );
  };

  const handleExportExcel = () => {
    exportSalesToCSV(activeSales);
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Actions */}
      <div className="bg-slate-900 border border-amber-900/30 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 font-serif-masonic">
              {isAdmin ? 'Relatórios Executivos & Auditoria de Vendas' : 'Meu Desempenho em Vendas'}
            </h2>
            <p className="text-xs text-slate-400">
              Estatísticas consolidadas por sabor, entregas e exportação oficial.
            </p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={handleExportPdf}
            className="px-4 py-2.5 bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 shadow-lg transition active:scale-95 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Exportar PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-bold text-xs rounded-xl flex items-center space-x-2 shadow-lg transition active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* Admin Seller Filter Bar if Admin */}
      {isAdmin && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Users className="w-4 h-4 text-amber-400" />
            <span>Filtrar Relatório por Irmão:</span>
          </div>

          <div className="w-full sm:w-72">
            <select
              value={selectedSellerFilter}
              onChange={(e) => setSelectedSellerFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-amber-500 transition"
            >
              <option value="ALL">Todos os Irmãos (Consolidado)</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Faturamento */}
        <div className="bg-slate-900 border border-amber-900/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-slate-400">Total Arrecadado</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-mono font-bold text-amber-300 mt-2">
            {formatCurrencyBRL(totalAmount)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalOrders} {totalOrders === 1 ? 'pedido registrado' : 'pedidos registrados'}
          </p>
        </div>

        {/* Card 2: Total Massas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-slate-400">Massas Vendidas</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-mono font-bold text-slate-100 mt-2">
            {totalUnits} <span className="text-sm font-normal text-slate-400">unidades</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Média de {(totalUnits / (totalOrders || 1)).toFixed(1)} un / pedido
          </p>
        </div>

        {/* Card 3: Entregues */}
        <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-5 shadow-xl bg-emerald-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-emerald-400">Retiradas Concluídas</span>
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-mono font-bold text-emerald-400 mt-2">
            {deliveredUnits} <span className="text-sm font-normal text-emerald-300/70">un ({deliveredPercentage}%)</span>
          </p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${deliveredPercentage}%` }}
            />
          </div>
        </div>

        {/* Card 4: Pendentes */}
        <div className="bg-slate-900 border border-amber-900/40 rounded-2xl p-5 shadow-xl bg-amber-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-amber-400">Aguardando Retirada</span>
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-mono font-bold text-amber-400 mt-2">
            {pendingUnits} <span className="text-sm font-normal text-amber-300/70">un</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalUnits - deliveredUnits > 0 ? 'Massas prontas para entrega' : '100% entregue!'}
          </p>
        </div>
      </div>

      {/* Flavors Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
            <PieChart className="w-4 h-4" />
            <span>Consolidado por Sabor de Massa</span>
          </h3>
          <span className="text-xs text-slate-400">
            Total Geral: <strong className="text-slate-200">{totalUnits} massas</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sabor 1 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-sm">🧀 Quatro Queijos</span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                {flavorStats.quatroQueijos.units} un ({flavorStats.quatroQueijos.percent}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${flavorStats.quatroQueijos.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Subtotal Arrecadado:</span>
              <span className="font-mono font-semibold text-slate-300">
                {formatCurrencyBRL(flavorStats.quatroQueijos.amount)}
              </span>
            </div>
          </div>

          {/* Sabor 2 */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-sm">🥓 Presunto e Muçarela</span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                {flavorStats.presuntoMucarela.units} un ({flavorStats.presuntoMucarela.percent}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-yellow-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${flavorStats.presuntoMucarela.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Subtotal Arrecadado:</span>
              <span className="font-mono font-semibold text-slate-300">
                {formatCurrencyBRL(flavorStats.presuntoMucarela.amount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
