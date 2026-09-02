import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  QrCode,
  Share2,
  CheckCircle2,
  Clock,
  User,
  Phone,
  Calendar,
  Layers,
  ShoppingBag,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import { Member, PastaSale } from '../../types/masonic';
import { isLodgeAdmin } from '../../utils/authUtils';
import { formatCurrencyBRL, sendSaleWhatsApp, exportSalesToCSV } from '../../utils/pastaUtils';

interface PastaSalesListProps {
  currentUser: Member;
  sales: PastaSale[];
  members: Member[];
  onViewQrCode: (sale: PastaSale) => void;
  onConfirmPickupDirectly: (sale: PastaSale) => void;
  onDeleteSale?: (sale: PastaSale) => void;
  onClearAllSales?: () => void;
}

export const PastaSalesList: React.FC<PastaSalesListProps> = ({
  currentUser,
  sales,
  members,
  onViewQrCode,
  onConfirmPickupDirectly,
  onDeleteSale,
  onClearAllSales,
}) => {
  const isAdmin = isLodgeAdmin(currentUser);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sellerFilter, setSellerFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [viewScope, setViewScope] = useState<'MY_SALES' | 'ALL_SALES'>(
    isAdmin ? 'ALL_SALES' : 'ALL_SALES'
  );

  // Filter Logic
  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      // Access Scope Filter
      if (viewScope === 'MY_SALES') {
        if (sale.sellerId !== currentUser.id) return false;
      } else if (sellerFilter !== 'ALL' && sale.sellerId !== sellerFilter) {
        return false;
      }

      // Search (Name, Phone, Sale Code, Token)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = sale.customerName.toLowerCase().includes(query);
        const matchesPhone = sale.phone.replace(/\D/g, '').includes(query.replace(/\D/g, ''));
        const matchesCode = sale.saleCode.toLowerCase().includes(query);
        const matchesToken = sale.qrCodeToken.toLowerCase().includes(query);
        const matchesSeller = sale.sellerName.toLowerCase().includes(query);

        if (!matchesName && !matchesPhone && !matchesCode && !matchesToken && !matchesSeller) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'ALL' && sale.status !== statusFilter) {
        return false;
      }

      // Date filter (YYYY-MM-DD)
      if (dateFilter) {
        const saleDateStr = sale.createdAt.slice(0, 10);
        if (saleDateStr !== dateFilter) {
          return false;
        }
      }

      return true;
    });
  }, [sales, isAdmin, viewScope, sellerFilter, currentUser.id, searchTerm, statusFilter, dateFilter]);

  // Totals for the current filtered list
  const totalFilteredQuantity = filteredSales.reduce((sum, s) => sum + s.totalQuantity, 0);
  const totalFilteredAmount = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPending = filteredSales.filter((s) => s.status === 'Aguardando Retirada').reduce((sum, s) => sum + s.totalQuantity, 0);
  const totalDelivered = filteredSales.filter((s) => s.status === 'Retirada Realizada').reduce((sum, s) => sum + s.totalQuantity, 0);

  return (
    <div className="space-y-5">
      {/* Top Banner & Scope Switcher for Admin */}
      <div className="bg-slate-900 border border-amber-900/30 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 font-serif-masonic">
              {viewScope === 'ALL_SALES' ? 'Todas as Vendas da Oficina' : 'Minhas Vendas de Massas'}
            </h2>
            <p className="text-xs text-slate-400">
              {filteredSales.length} {filteredSales.length === 1 ? 'pedido cadastrado' : 'pedidos cadastrados'} • Total de{' '}
              <strong className="text-amber-300">{totalFilteredQuantity} massas</strong> ({formatCurrencyBRL(totalFilteredAmount)})
            </p>
          </div>
        </div>

        {/* Scope Toggle & Actions */}
        <div className="flex items-center space-x-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center">
            <button
              type="button"
              onClick={() => setViewScope('ALL_SALES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewScope === 'ALL_SALES'
                  ? 'bg-amber-600 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas as Vendas
            </button>
            <button
              type="button"
              onClick={() => setViewScope('MY_SALES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewScope === 'MY_SALES'
                  ? 'bg-amber-600 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Minhas Vendas
            </button>
          </div>

          <button
            type="button"
            onClick={() => exportSalesToCSV(filteredSales)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition flex items-center space-x-1.5"
            title="Exportar dados atuais para Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {isAdmin && sales.length > 0 && onClearAllSales && (
            <button
              type="button"
              onClick={onClearAllSales}
              className="px-3 py-2 bg-red-950/60 hover:bg-red-900/80 text-red-300 rounded-xl text-xs font-medium border border-red-800/60 transition flex items-center space-x-1.5"
              title="Apagar todos os registros de vendas testes"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Apagar Vendas Testes</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total de Pedidos</span>
          <p className="text-lg font-mono font-bold text-slate-100">{filteredSales.length}</p>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Massas Vendidas</span>
          <p className="text-lg font-mono font-bold text-amber-300">{totalFilteredQuantity} un</p>
        </div>
        <div className="bg-slate-900/90 border border-emerald-900/40 p-3 rounded-xl bg-emerald-950/10">
          <span className="text-[10px] text-emerald-400 uppercase font-semibold">Retiradas (Entregues)</span>
          <p className="text-lg font-mono font-bold text-emerald-400">{totalDelivered} un</p>
        </div>
        <div className="bg-slate-900/90 border border-amber-900/40 p-3 rounded-xl bg-amber-950/10">
          <span className="text-[10px] text-amber-400 uppercase font-semibold">Aguardando Retirada</span>
          <p className="text-lg font-mono font-bold text-amber-400">{totalPending} un</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <input
              type="text"
              placeholder="Buscar por cliente, telefone, código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500 transition pl-9"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-amber-500 transition"
            >
              <option value="ALL">Todos os Status</option>
              <option value="Aguardando Retirada">Aguardando Retirada</option>
              <option value="Retirada Realizada">Retirada Realizada</option>
            </select>
          </div>

          {/* Seller Filter (Admin only) or Date Filter */}
          {isAdmin && viewScope === 'ALL_SALES' ? (
            <div>
              <select
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-amber-500 transition"
              >
                <option value="ALL">Todos os Irmãos</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-amber-500 transition font-mono"
              />
            </div>
          )}
        </div>
      </div>

      {/* Sales Table / Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {filteredSales.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="font-bold text-slate-300 text-sm">Nenhuma venda encontrada</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Não há pedidos correspondentes aos filtros selecionados. Tente limpar os termos de busca.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Cód. Venda</th>
                  <th className="px-4 py-3.5">Cliente</th>
                  <th className="px-4 py-3.5">Telefone</th>
                  <th className="px-4 py-3.5">Sabor & Quantidade</th>
                  <th className="px-4 py-3.5">Data da Venda</th>
                  <th className="px-4 py-3.5">Irmão Responsável</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Código da Venda */}
                    <td className="px-4 py-3.5 font-mono font-bold text-amber-300 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span>{sale.saleCode}</span>
                      </div>
                    </td>

                    {/* Cliente */}
                    <td className="px-4 py-3.5 font-bold text-slate-100 whitespace-nowrap">
                      {sale.customerName}
                    </td>

                    {/* Telefone com link WhatsApp */}
                    <td className="px-4 py-3.5 font-mono text-slate-300 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => sendSaleWhatsApp(sale)}
                        title="Enviar mensagem no WhatsApp"
                        className="hover:text-emerald-400 transition flex items-center space-x-1 underline decoration-dotted"
                      >
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>{sale.phone}</span>
                      </button>
                    </td>

                    {/* Sabor e Quantidade */}
                    <td className="px-4 py-3.5">
                      <div className="max-w-xs">
                        <span className="font-semibold text-slate-200 block">{sale.flavor}</span>
                        <span className="text-[10px] text-slate-400">
                          Total: <strong className="text-amber-300">{sale.totalQuantity} un</strong> ({formatCurrencyBRL(sale.totalAmount)})
                        </span>
                      </div>
                    </td>

                    {/* Data */}
                    <td className="px-4 py-3.5 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(sale.createdAt).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(sale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    {/* Irmão */}
                    <td className="px-4 py-3.5 text-slate-300 whitespace-nowrap">
                      <span className="truncate max-w-[150px] block" title={sale.sellerName}>
                        {sale.sellerName}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          sale.status === 'Retirada Realizada'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {sale.status === 'Retirada Realizada' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Entregue</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Aguardando</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Ver QR Code */}
                        <button
                          type="button"
                          onClick={() => onViewQrCode(sale)}
                          title="Ver QR Code e Comprovante"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition border border-slate-700"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        {/* Compartilhar WhatsApp */}
                        <button
                          type="button"
                          onClick={() => sendSaleWhatsApp(sale)}
                          title="Compartilhar no WhatsApp"
                          className="p-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded-lg transition border border-emerald-800/60"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        {/* Se pendente, atalho para entrega rápida */}
                        {sale.status === 'Aguardando Retirada' && (
                          <button
                            type="button"
                            onClick={() => onConfirmPickupDirectly(sale)}
                            title="Confirmar Retirada"
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg transition text-[10px]"
                          >
                            Entregar
                          </button>
                        )}

                        {/* Excluir Venda (Admin ou Dono do registro) */}
                        {(isAdmin || sale.sellerId === currentUser.id) && onDeleteSale && (
                          <button
                            type="button"
                            onClick={() => onDeleteSale(sale)}
                            title="Apagar venda"
                            className="p-1.5 bg-slate-900 hover:bg-red-950/80 text-slate-500 hover:text-red-400 rounded-lg transition border border-slate-800 hover:border-red-800/60"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
