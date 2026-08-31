import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  X,
  ExternalLink,
  UploadCloud,
  ShieldCheck,
  Code
} from 'lucide-react';
import {
  supabaseService,
  SupabaseConnectionStatus,
  SUPABASE_SETUP_SQL
} from '../lib/supabaseService';
import { Member, Session, AttendanceRecord, VisitorRecord, Balaustre } from '../types/masonic';

interface SupabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SupabaseConnectionStatus | null;
  onRefreshStatus: () => Promise<void>;
  currentData: {
    members: Member[];
    sessions: Session[];
    attendances: AttendanceRecord[];
    visitors: VisitorRecord[];
    balaustres: Balaustre[];
  };
  onDataSynced?: () => void;
}

export const SupabaseStatusModal: React.FC<SupabaseStatusModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefreshStatus,
  currentData,
  onDataSynced,
}) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'sql'>('status');

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setSyncMessage(null);
    await onRefreshStatus();
    setIsRefreshing(false);
  };

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    setSyncMessage(null);

    const result = await supabaseService.syncAllToSupabase(currentData);
    setIsSyncing(false);

    if (result.success) {
      setSyncMessage({
        type: 'success',
        text: 'Todos os dados locais foram sincronizados com o Supabase com sucesso!',
      });
      if (onDataSynced) onDataSynced();
      await onRefreshStatus();
    } else {
      setSyncMessage({
        type: 'error',
        text: `Ocorreram erros na sincronização: ${result.errors.join('; ')}`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-start sm:justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto overscroll-contain">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif-masonic font-bold text-slate-100 flex items-center space-x-2">
                <span>Diagnóstico de Conexão Supabase</span>
              </h2>
              <p className="text-xs text-slate-400">
                Verificação da conexão e estrutura de tabelas do banco de dados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 shrink-0">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'status'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Status das Tabelas</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'sql'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Script SQL de Criação</span>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 overscroll-contain">
          {activeTab === 'status' && (
            <>
              {/* Connection Summary Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-400">Servidor Supabase:</span>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded">
                      {status?.url || 'https://ecsftxcsbwiwnkgsszfn.supabase.co'}
                    </span>
                  </div>

                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 border border-slate-700 active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>{isRefreshing ? 'Verificando...' : 'Testar Conexão Agora'}</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {status?.hasTables ? (
                      <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-xs bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Banco de Dados Pronto & 100% Sincronizado</span>
                      </div>
                    ) : status?.connected ? (
                      <div className="flex items-center space-x-1.5 text-amber-400 font-semibold text-xs bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Conectado, mas Tabelas Ausentes no Supabase</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5 text-rose-400 font-semibold text-xs bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/30">
                        <XCircle className="w-4 h-4" />
                        <span>Erro de Comunicação com Supabase</span>
                      </div>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-500">
                    Última verificação: {status?.lastChecked || 'agora'}
                  </span>
                </div>
              </div>

              {/* Notice when tables are missing or permissions needed */}
              {!status?.hasTables && (
                <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-2 text-xs text-amber-200">
                      <p className="font-bold text-amber-300 text-sm">
                        {status?.errorMessage?.includes('42501')
                          ? 'Tabelas encontradas! Falta apenas a permissão GRANT no Supabase.'
                          : 'Aviso Importante: Configuração de Tabelas no Supabase necessária'}
                      </p>
                      <p className="leading-relaxed">
                        {status?.errorMessage?.includes('42501')
                          ? 'As tabelas foram criadas no Supabase, porém o PostgreSQL bloqueou a leitura/escrita (Erro 42501: permission denied). Execute o script SQL atualizado com os comandos GRANT para liberar o acesso instantaneamente.'
                          : 'A conexão com o servidor Supabase está ativa, porém o seu projeto do Supabase precisa do script SQL para criar as tabelas e conceder permissões.'}
                      </p>
                      <div className="pt-1 flex flex-wrap gap-2 items-center">
                        <button
                          onClick={() => {
                            setActiveTab('sql');
                            handleCopySql();
                          }}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-lg transition flex items-center space-x-1.5 shadow active:scale-95 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Script SQL Atualizado e Executar</span>
                        </button>

                        <a
                          href="https://app.supabase.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center space-x-1"
                        >
                          <span>Abrir Supabase.com</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Table Status Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Status Individual das Tabelas do Sistema
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {status?.tableStatuses.map((t) => (
                    <div
                      key={t.table}
                      className={`p-3.5 rounded-xl border transition flex items-center justify-between ${
                        t.exists
                          ? 'bg-slate-950/80 border-slate-800 text-slate-200'
                          : 'bg-amber-950/20 border-amber-900/40 text-amber-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {t.exists ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <div>
                          <p className="text-xs font-mono font-bold">{t.table}</p>
                          <p className="text-[10px] text-slate-400">
                            {t.exists
                              ? `${t.count ?? 0} registros encontrados`
                              : t.error || 'Tabela não existe'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          t.exists
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {t.exists ? 'OK' : 'Ausente (PGRST205)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Push Local Data to Supabase Button */}
              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Sincronização Manual de Dados</h4>
                    <p className="text-[11px] text-slate-400">
                      Envie os dados locais da loja para o banco de dados Supabase.
                    </p>
                  </div>

                  <button
                    onClick={handleSyncToSupabase}
                    disabled={isSyncing}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition flex items-center space-x-2 shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                    <span>{isSyncing ? 'Sincronizando...' : 'Enviar Dados para o Supabase'}</span>
                  </button>
                </div>

                {syncMessage && (
                  <div
                    className={`p-3.5 rounded-xl text-xs font-medium border space-y-2 ${
                      syncMessage.type === 'success'
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                        : 'bg-rose-950/60 border-rose-800 text-rose-200'
                    }`}
                  >
                    <p className="leading-relaxed font-semibold">{syncMessage.text}</p>

                    {syncMessage.type === 'error' && (
                      <div className="pt-1">
                        <button
                          onClick={() => {
                            setActiveTab('sql');
                            handleCopySql();
                          }}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition inline-flex items-center space-x-1.5 shadow active:scale-95 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Script SQL e Abrir Instruções de Resolução</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-amber-300 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Passo a Passo para Ativar o Supabase</span>
                </h3>

                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    Acesse o seu painel do Supabase:{' '}
                    <a
                      href="https://app.supabase.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 underline inline-flex items-center space-x-1 font-semibold"
                    >
                      <span>app.supabase.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Selecione o seu projeto e no menu lateral esquerdo clique em <strong>SQL Editor</strong>.</li>
                  <li>Clique no botão <strong>"+ New query"</strong>.</li>
                  <li>Cole o código SQL abaixo no editor e clique no botão verde <strong>"Run"</strong> (ou toque Ctrl+Enter).</li>
                  <li>Pronto! Volte aqui e clique em <strong>"Testar Conexão Agora"</strong> para ver tudo verde!</li>
                </ol>
              </div>

              {/* SQL Block Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Script SQL de Criação (schema.sql)
                </span>

                <button
                  onClick={handleCopySql}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 shadow active:scale-95"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Copiado com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Script SQL</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code display */}
              <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-80 leading-relaxed shadow-inner">
                {SUPABASE_SETUP_SQL}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-5 py-2.5 rounded-xl transition"
          >
            Fechar Diagnóstico
          </button>
        </div>
      </div>
    </div>
  );
};
