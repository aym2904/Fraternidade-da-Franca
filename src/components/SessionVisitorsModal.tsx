import React, { useState, useMemo } from 'react';
import {
  X,
  Building2,
  Users,
  Calendar,
  Clock,
  Search,
  Copy,
  Check,
  Printer,
  Shield,
  FileText,
  UserCheck,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Session, VisitorRecord, Member } from '../types/masonic';
import { isLodgeAdmin } from '../utils/authUtils';

interface SessionVisitorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  visitors: VisitorRecord[];
  currentUser?: Member | null;
  onDeleteVisitor?: (visitorId: string) => void;
}

export const SessionVisitorsModal: React.FC<SessionVisitorsModalProps> = ({
  isOpen,
  onClose,
  session,
  visitors = [],
  currentUser,
  onDeleteVisitor,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = currentUser ? isLodgeAdmin(currentUser) : false;

  // Filter visitors for the selected session
  const sessionVisitors = useMemo(() => {
    if (!session) return [];
    return visitors.filter((v) => v.sessionId === session.id);
  }, [session, visitors]);

  // Apply search filtering
  const filteredVisitors = useMemo(() => {
    if (!searchTerm.trim()) return sessionVisitors;
    const term = searchTerm.toLowerCase().trim();
    return sessionVisitors.filter(
      (v) =>
        (v.fullName || '').toLowerCase().includes(term) ||
        (v.cim || '').toLowerCase().includes(term) ||
        (v.homeLodge || '').toLowerCase().includes(term) ||
        (v.potencia || '').toLowerCase().includes(term) ||
        (v.degree || '').toLowerCase().includes(term)
    );
  }, [sessionVisitors, searchTerm]);

  // Formatted date and time
  const formattedDate = useMemo(() => {
    if (!session?.date) return '';
    return session.date.split('-').reverse().join('/');
  }, [session?.date]);

  // Copy visitor list to clipboard for Balaústre/Ata
  const handleCopyList = () => {
    if (!session || sessionVisitors.length === 0) return;

    const header = `REGISTRO DE VISITANTES - ${session.title.toUpperCase()}\nData: ${formattedDate} às ${session.time}h | Grau: ${session.degree}\nTotal de Visitantes: ${sessionVisitors.length}\n${'='.repeat(50)}\n`;
    
    const body = sessionVisitors
      .map(
        (v, i) =>
          `${i + 1}. ${v.fullName} (CIM: ${v.cim || 'N/I'}) - Grau: ${v.degree}\n   Loja: ${v.homeLodge || 'N/I'} | Potência: ${v.potencia || 'N/I'}`
      )
      .join('\n\n');

    navigator.clipboard.writeText(`${header}\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    if (!session) return;
    window.print();
  };

  const handleDelete = (id: string) => {
    if (onDeleteVisitor) {
      onDeleteVisitor(id);
      setDeletingId(null);
    }
  };

  if (!isOpen || !session) return null;

  return (
    <div
      id="session-visitors-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="session-visitors-modal-container"
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/70 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Visitantes da Sessão</span>
              </span>

              {session.active ? (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Sessão Ao Vivo</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                  <span>Sessão Registrada</span>
                </span>
              )}

              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-950/70 text-amber-300 border border-amber-800/60 font-mono">
                Grau: {session.degree}
              </span>
            </div>

            <h2 className="font-serif-masonic text-lg sm:text-xl font-bold text-slate-100 truncate">
              {session.title}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>{formattedDate} às {session.time}h</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{session.location}</span>
              </span>
            </div>
          </div>

          <button
            id="btn-close-visitors-modal"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition shrink-0"
            title="Fechar Janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Stats & Actions */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-medium">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>
                <strong className="font-bold text-cyan-200">{sessionVisitors.length}</strong>{' '}
                {sessionVisitors.length === 1 ? 'visitante registrado' : 'visitantes registrados'}
              </span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {sessionVisitors.length > 0 && (
              <>
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar visitante, loja ou CIM..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  onClick={handleCopyList}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition active:scale-95 shrink-0"
                  title="Copiar lista de visitantes para inclusão em Atas e Balaústres"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span className="hidden sm:inline">Copiar Lista</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Modal Body: Visitors List or Empty State */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {sessionVisitors.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 flex items-center justify-center mx-auto shadow-inner">
                <Building2 className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-semibold text-slate-200">
                  Nenhum visitante registrado
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Não constam registros de irmãos visitantes nesta sessão.
                  {session.active
                    ? ' Você pode registrar novos visitantes na aba "Visitantes" ou durante a chamada ao vivo.'
                    : ' Os registros de presenças e visitantes são consolidados automaticamente ao término de cada trabalho.'}
                </p>
              </div>
            </div>
          ) : filteredVisitors.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Nenhum visitante encontrado para o termo "{searchTerm}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredVisitors.map((v, idx) => {
                const isDeleting = deletingId === v.id;

                return (
                  <div
                    key={v.id || idx}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-cyan-500/40 transition flex flex-col justify-between space-y-3 relative group"
                  >
                    {/* Visitor Top Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-950 to-slate-900 border border-cyan-800/50 flex items-center justify-center text-cyan-300 font-bold text-sm shrink-0 shadow-sm">
                          {(v.fullName || 'V').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-100 truncate" title={v.fullName}>
                            {v.fullName}
                          </h4>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                            <span>CIM: <strong className="text-slate-300 font-mono">{v.cim || 'N/I'}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Potencia Badge */}
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono shrink-0">
                        {v.potencia || 'GOSP/GOB'}
                      </span>
                    </div>

                    {/* Visitor Details */}
                    <div className="pt-2 border-t border-slate-800/60 text-xs space-y-1.5 text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center space-x-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Loja de Origem:</span>
                        </span>
                        <span className="font-medium text-slate-200 text-right truncate max-w-[200px]" title={v.homeLodge}>
                          {v.homeLodge || 'Não informada'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center space-x-1">
                          <Shield className="w-3.5 h-3.5 text-slate-500" />
                          <span>Grau Maçônico:</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          v.degree === 'Mestre'
                            ? 'bg-amber-950/70 text-amber-300 border border-amber-700/50'
                            : v.degree === 'Companheiro'
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-700/50'
                            : 'bg-blue-950/70 text-blue-300 border border-blue-700/50'
                        }`}>
                          {v.degree || 'Mestre'}
                        </span>
                      </div>

                      {v.timestamp && (
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>Horário do Registro:</span>
                          </span>
                          <span className="text-slate-400 font-mono">
                            {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Admin Delete Action */}
                    {isAdmin && onDeleteVisitor && (
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-end">
                        {isDeleting ? (
                          <div className="flex items-center space-x-2 animate-fadeIn">
                            <span className="text-[10px] text-rose-400">Confirmar exclusão?</span>
                            <button
                              onClick={() => handleDelete(v.id)}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold transition"
                            >
                              Sim, excluir
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(v.id)}
                            className="text-slate-500 hover:text-rose-400 text-[11px] flex items-center space-x-1 p-1 rounded hover:bg-slate-900 transition"
                            title="Remover registro de visitante desta sessão"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {sessionVisitors.length > 0 && (
              <span>
                Total no Balaústre:{' '}
                <strong className="text-slate-200">{sessionVisitors.length}</strong>{' '}
                {sessionVisitors.length === 1 ? 'irmão visitante' : 'irmãos visitantes'}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-close-visitors-bottom"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
