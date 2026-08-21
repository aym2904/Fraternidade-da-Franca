import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  Award,
  Download,
  Calendar,
  Building2,
  Users,
  Printer,
  Lock,
  Save,
  CheckCircle2,
  Edit3,
  Eye,
  ShieldCheck,
  FileCheck,
  BookOpen,
  UserCheck
} from 'lucide-react';
import { Balaustre, Session, Member, AttendanceRecord, VisitorRecord } from '../types/masonic';
import { calculateSessionStats } from '../utils/masonicUtils';
import { generateAttendanceCertificatePDF, generateBalaustrePDF } from '../utils/pdfGenerator';
import { isLodgeAdmin, canAccessBalaustreDegree } from '../utils/authUtils';

interface BalaustreIntegrationProps {
  balaustres: Balaustre[];
  sessions: Session[];
  members: Member[];
  attendances: AttendanceRecord[];
  visitors: VisitorRecord[];
  currentUser: Member;
  onAddBalaustre: (balaustre: Balaustre) => void;
}

export const BalaustreIntegration: React.FC<BalaustreIntegrationProps> = ({
  balaustres = [],
  sessions = [],
  members = [],
  attendances = [],
  visitors = [],
  currentUser,
  onAddBalaustre,
}) => {
  const isAdmin = isLodgeAdmin(currentUser);

  // Filter accessible sessions by degree (Aprendiz = Grau 1; Companheiro = Graus 1 e 2; Mestre/Admin = Graus 1, 2 e 3)
  const accessibleSessions = sessions.filter((s) => canAccessBalaustreDegree(currentUser, s.degreeLevel));

  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    accessibleSessions[0]?.id || ''
  );
  const [copied, setCopied] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  const selectedSession = accessibleSessions.find((s) => s.id === selectedSessionId) || accessibleSessions[0];
  const existingBalaustre = balaustres.find((b) => b.sessionId === selectedSessionId);

  // Editing mode: Strictly forbidden for non-admins (always false). For admins: defaults to true if draft/new, false if approved.
  const [isEditingMode, setIsEditingMode] = useState<boolean>(
    isAdmin ? (existingBalaustre ? existingBalaustre.status !== 'Aprovado' : true) : false
  );

  const sessionAttendances = selectedSession
    ? attendances.filter((a) => a.sessionId === selectedSession.id)
    : [];
  const sessionVisitors = selectedSession
    ? visitors.filter((v) => v.sessionId === selectedSession.id)
    : [];

  const presentMembers = members.filter((m) =>
    sessionAttendances.some((a) => a.memberId === m.id)
  );

  const isCurrentUserPresent = selectedSession
    ? sessionAttendances.some((a) => a.memberId === currentUser.id)
    : false;

  const stats = selectedSession
    ? calculateSessionStats(selectedSession, members, attendances, visitors, [])
    : null;

  // Auto-generate formal minute text
  const generateMinuteDraftText = () => {
    if (!selectedSession) return 'Nenhum balaústre disponível para o seu grau maçônico.';

    const officersText = Object.entries(selectedSession.officers || {})
      .map(([role, memberId]) => {
        const m = members.find((mem) => mem.id === memberId);
        return `- ${role}: Ir.'. ${m ? m.fullName : 'Vago'} (CIM ${m ? m.cim : '---'})`;
      })
      .join('\n');

    const presentMembersText = presentMembers
      .map((m) => `- Ir.'. ${m.fullName} (CIM ${m.cim} - Grau ${m.degree})`)
      .join('\n');

    const visitorsText =
      sessionVisitors.length > 0
        ? sessionVisitors
            .map(
              (v) =>
                `- Ir.'. ${v.fullName} (CIM ${v.cim} - Loja ${v.homeLodge} / ${v.potencia})`
            )
            .join('\n')
        : '- Nenhum irmão visitante registrado.';

    const sessionNum = (selectedSession.title || '').split('nº ')[1] || (selectedSession.title || '').split('Nº ')[1] || '1.485';
    const formattedDate = (selectedSession.date || '').split('-').reverse().join('/');

    return `A∴R∴L∴S∴ FRATERNIDADE DA FRANCA Nº3571
ORIENTE DE FRANCA/SP

BALAÚSTRE DA SESSÃO Nº ${sessionNum}
Data: ${formattedDate} às ${selectedSession.time || '20:00'}h
Templo: ${selectedSession.location || 'Templo Principal'}
Grau dos Trabalhos: ${selectedSession.degree} (${selectedSession.degreeLevel}º Grau)

--- QUADRO DA ADMINISTRAÇÃO DA SESSÃO ---
${officersText}

--- ESTATÍSTICA E PRESENÇA REGISTRADA ---
Frequência do Quadro: ${stats?.percentagePresent || 0}% de assiduidade
Presentes do Quadro (${presentMembers.length} Irmãos):
${presentMembersText}

Irmãos Visitantes (${sessionVisitors.length} Irmãos):
${visitorsText}

--- RESUMO DOS TRABALHOS ---
Subtipo: ${selectedSession.subtype || 'Trabalho de Instrução'}.
Trabalhos conduzidos em ordem, paz e harmonia, com leitura da prancha de arquitetura regimental e verificação do tronco de beneficência.
Balaústre lavrado pelo Secretário da Oficina e submetido para aprovação regimental.`;
  };

  const [currentTextContent, setCurrentTextContent] = useState<string>(
    existingBalaustre ? existingBalaustre.content : ''
  );

  useEffect(() => {
    if (selectedSession) {
      const b = balaustres.find((item) => item.sessionId === selectedSession.id);
      if (b) {
        setCurrentTextContent(b.content || '');
        if (!isAdmin || b.status === 'Aprovado') {
          setIsEditingMode(false);
        }
      } else {
        setCurrentTextContent('');
        setIsEditingMode(isAdmin);
      }
    }
  }, [selectedSessionId, selectedSession?.id, isAdmin]);

  const handleSessionChange = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSaveFeedback(null);
    const b = balaustres.find((item) => item.sessionId === sessionId);
    if (b) {
      setCurrentTextContent(b.content || '');
      setIsEditingMode(isAdmin && b.status !== 'Aprovado');
    } else {
      setCurrentTextContent('');
      setIsEditingMode(isAdmin);
    }
  };

  // Botão 1: Salvar Balaústre (Rascunho / Em Elaboração) - Apenas Admin
  const handleSaveDraft = () => {
    if (!isAdmin || !selectedSession) return;

    const sessionNum = (selectedSession.title || '').split('nº ')[1] || (selectedSession.title || '').split('Nº ')[1] || '1.485';

    const newB: Balaustre = {
      id: existingBalaustre ? existingBalaustre.id : 'b-' + Date.now(),
      sessionId: selectedSession.id,
      number: `Balaústre nº ${sessionNum}`,
      title: `Ata da ${selectedSession.title || 'Sessão Maçônica'}`,
      date: selectedSession.date,
      summaryText: `Sessão no Grau de ${selectedSession.degree} com a presença de ${presentMembers.length} Irmãos do quadro.`,
      content: currentTextContent,
      status: 'Rascunho',
      createdAt: existingBalaustre?.createdAt || new Date().toISOString(),
    };

    onAddBalaustre(newB);
    setSaveFeedback({
      type: 'info',
      message: 'Rascunho do Balaústre salvo com sucesso! A edição continua aberta para alterações da Secretaria.',
    });
    setTimeout(() => setSaveFeedback(null), 5000);
  };

  // Botão 2: Aprovar Balaústre (Encerra a edição e deixa para leitura na tela com opção de download PDF) - Apenas Admin
  const handleApproveBalaustre = () => {
    if (!isAdmin || !selectedSession) return;

    const sessionNum = (selectedSession.title || '').split('nº ')[1] || (selectedSession.title || '').split('Nº ')[1] || '1.485';

    const newB: Balaustre = {
      id: existingBalaustre ? existingBalaustre.id : 'b-' + Date.now(),
      sessionId: selectedSession.id,
      number: `Balaústre nº ${sessionNum}`,
      title: `Ata da ${selectedSession.title || 'Sessão Maçônica'}`,
      date: selectedSession.date,
      summaryText: `Sessão no Grau de ${selectedSession.degree} com a presença de ${presentMembers.length} Irmãos do quadro.`,
      content: currentTextContent,
      status: 'Aprovado',
      createdAt: existingBalaustre?.createdAt || new Date().toISOString(),
    };

    onAddBalaustre(newB);
    setIsEditingMode(false); // Encerra a edição
    setSaveFeedback({
      type: 'success',
      message: 'Balaústre Aprovado em Loja com sucesso! Edição encerrada. O documento oficial está pronto para leitura e download em PDF.',
    });
    setTimeout(() => setSaveFeedback(null), 6000);
  };

  // Download do PDF do Balaústre - Disponível para TODOS os Graus
  const handleDownloadPDF = () => {
    if (!selectedSession) return;
    const sessionNum = (selectedSession.title || '').split('nº ')[1] || (selectedSession.title || '').split('Nº ')[1] || '1.485';
    const balaustreData = existingBalaustre || {
      number: `Balaústre nº ${sessionNum}`,
      title: `Ata da ${selectedSession.title || 'Sessão Maçônica'}`,
      date: selectedSession.date,
      content: currentTextContent,
      status: existingBalaustre?.status || 'Aprovado',
    };
    generateBalaustrePDF(balaustreData, selectedSession);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(currentTextContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAiRefineBalaustre = async () => {
    if (!isAdmin) return;
    setIsAiGenerating(true);
    try {
      const res = await fetch('/api/ai/refine-balaustre', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: currentTextContent }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data?.text) {
        setCurrentTextContent(data.text);
      } else {
        setCurrentTextContent(
          (prev) =>
            prev +
            '\n\n[RESUMO SINTÉTICO GERADO PELA SECRETARIA]: Trabalhos encerrados com a Tronco de Beneficência coberta e saudações maçônicas ao Grão-Mestrado.'
        );
      }
    } catch (err) {
      console.error('Erro na solicitação de IA:', err);
      setCurrentTextContent(
        (prev) =>
          prev +
          '\n\n[RESUMO SINTÉTICO GERADO PELA SECRETARIA]: Trabalhos encerrados com a Tronco de Beneficência coberta e saudações maçônicas ao Grão-Mestrado.'
      );
    } finally {
      setIsAiGenerating(false);
    }
  };

  const isApproved = existingBalaustre?.status === 'Aprovado';

  // Se o usuário não tiver sessões permitidas para o seu grau
  if (accessibleSessions.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
        <BookOpen className="w-12 h-12 text-amber-400/60 mx-auto" />
        <h3 className="font-serif-masonic text-lg font-bold text-amber-200">
          Nenhum Balaústre Disponível para o Grau de {currentUser.degree}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Não constam reuniões registradas neste grau maçônico até o presente momento. As atas serão disponibilizadas automaticamente conforme forem agendadas pela Secretaria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <h2 className="font-serif-masonic text-xl font-bold text-amber-200">
              {isAdmin ? 'Livro de Balaústres (Atas da Secretaria)' : `Balaústres Oficiais — Grau de ${currentUser.degree}`}
            </h2>
            {isApproved ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Aprovado em Loja</span>
              </span>
            ) : existingBalaustre?.status === 'Rascunho' ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">
                <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Em Elaboração / Rascunho</span>
              </span>
            ) : null}

            {!isAdmin && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Modo Leitura e Download</span>
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-1">
            {isAdmin
              ? 'Edição pela Secretaria, homologação regimental e disponibilização para leitura e download pelos Obreiros.'
              : 'Consulte a ata oficial da sessão maçônica e realize o download em PDF timbrado.'}
          </p>
        </div>

        {/* Session Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-400 font-medium hidden sm:block">Sessão:</label>
          <select
            value={selectedSessionId}
            onChange={(e) => handleSessionChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-medium shadow-inner"
          >
            {accessibleSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.date.split('-').reverse().join('/')})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Save Feedback Banner */}
      {saveFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-3 text-xs font-semibold animate-in fade-in duration-200 ${
            saveFeedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
              : 'bg-amber-950/80 border-amber-500/60 text-amber-200'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span className="flex-1">{saveFeedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Session Stats & Attendance Roster */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="font-serif-masonic text-base font-bold text-amber-200 border-b border-slate-800 pb-3 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Dados da Sessão Vinculada</span>
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400">Grau dos Trabalhos:</span>
              <span className="font-bold text-amber-300">{selectedSession?.degree}</span>
            </div>

            <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400">Data e Horário:</span>
              <span className="font-bold text-slate-200">{selectedSession?.date.split('-').reverse().join('/')} às {selectedSession?.time}h</span>
            </div>

            <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400">Presença do Quadro:</span>
              <span className="font-bold text-emerald-400">{presentMembers.length} Irmãos</span>
            </div>

            <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400">Assiduidade do Quadro:</span>
              <span className="font-bold text-amber-300 font-mono">{stats?.percentagePresent}%</span>
            </div>

            <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-400">Irmãos Visitantes:</span>
              <span className="font-bold text-blue-400">{sessionVisitors.length} Irmãos</span>
            </div>
          </div>

          {/* Quick PDF Download for Current Member's Attendance Certificate */}
          {!isAdmin && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Minha Presença:</span>
                {isCurrentUserPresent ? (
                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Registrada</span>
                  </span>
                ) : (
                  <span className="text-slate-500 italic">Não registrada</span>
                )}
              </div>
              {isCurrentUserPresent && (
                <button
                  onClick={() => generateAttendanceCertificatePDF(currentUser, selectedSession, 'Atestado de Presença')}
                  className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition font-semibold"
                >
                  <Award className="w-4 h-4" />
                  <span>Baixar Meu Atestado de Presença (PDF)</span>
                </button>
              )}
            </div>
          )}

          {/* Certificate Generation Action for Admin (All present members) */}
          {isAdmin && (
            <div className="pt-2">
              <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Atestados de Presença ({presentMembers.length}):</span>
              </h4>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {presentMembers.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic p-2 bg-slate-950 rounded-lg">Nenhum irmão presente registrado.</p>
                ) : (
                  presentMembers.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800 text-xs"
                    >
                      <span className="truncate font-medium text-slate-200 max-w-[130px]">{m.fullName}</span>
                      <button
                        onClick={() => generateAttendanceCertificatePDF(m, selectedSession, 'Atestado de Presença')}
                        title="Gerar Atestado de Presença em PDF"
                        className="bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded flex items-center space-x-1 transition active:scale-95"
                      >
                        <Download className="w-3 h-3" />
                        <span>PDF</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Minute Content Area (Reader / Editor) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Container */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-serif-masonic text-base font-bold text-amber-200 flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <span>
                    {isEditingMode && isAdmin
                      ? 'Editor do Balaústre (Secretaria)'
                      : 'Texto Oficial do Balaústre (Modo Leitura)'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isEditingMode && isAdmin
                    ? 'Edite o texto da ata e salve o rascunho ou aprove regimentalmente.'
                    : 'Ata oficial maçônica. Texto timbrado para leitura na tela e download em PDF.'}
                </p>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Download PDF Button (Available for all degrees) */}
                <button
                  onClick={handleDownloadPDF}
                  title="Baixar Balaústre completo em PDF oficial"
                  className={`text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5 font-bold transition shadow-md active:scale-95 ${
                    !isEditingMode
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Balaústre em PDF</span>
                </button>

                {/* AI Refine Button (Only during editing by Admin) */}
                {isAdmin && isEditingMode && (
                  <button
                    onClick={handleAiRefineBalaustre}
                    disabled={isAiGenerating}
                    className="bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-700 text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>{isAiGenerating ? 'Refinando...' : 'Refinar (IA)'}</span>
                  </button>
                )}

                {/* Copy Text Button */}
                <button
                  onClick={handleCopyText}
                  title="Copiar texto da ata"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>

                {/* Reopen for editing button (Admin only, when in read mode and not yet approved) */}
                {isAdmin && !isEditingMode && (
                  isApproved ? (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs bg-slate-950 border border-emerald-500/40 text-emerald-300 font-medium">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Balaústre Aprovado (Edição Encerrada)</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => setIsEditingMode(true)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Editar / Preencher Ata</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Document Display / Editor Body */}
            {isEditingMode && isAdmin && !isApproved ? (
              /* --- EDITING MODE (ADMINS ONLY) --- */
              <div className="space-y-4">
                <textarea
                  rows={15}
                  value={currentTextContent}
                  onChange={(e) => setCurrentTextContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500/70 shadow-inner"
                  placeholder="Insira aqui o texto oficial do Balaústre lavrado pela Secretaria da Loja..."
                />

                {/* Separate Action Buttons for Saving and Approving */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
                  <p className="text-[11px] text-slate-400">
                    Clique em <strong>Salvar Rascunho</strong> para gravar alterações sem fechar, ou <strong>Aprovar Balaústre</strong> para homologar e encerrar a edição.
                  </p>

                  <div className="flex items-center space-x-3 shrink-0">
                    {/* Botão 1: Salvar Rascunho */}
                    <button
                      onClick={handleSaveDraft}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2 transition shadow-md active:scale-95"
                    >
                      <Save className="w-4 h-4 text-amber-400" />
                      <span>Salvar Rascunho</span>
                    </button>

                    {/* Botão 2: Aprovar Balaústre */}
                    <button
                      onClick={handleApproveBalaustre}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl flex items-center space-x-2 transition shadow-lg shadow-amber-500/20 active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                      <span>Aprovar Balaústre</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* --- READ-ONLY FORMAL DOCUMENT ON SCREEN (FOR ALL DEGREES) --- */
              <div className="space-y-6">
                {/* Official Masonic Paper Layout */}
                <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
                  {/* Masonic Decorative Stamp */}
                  <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                    <Building2 className="w-32 h-32 text-amber-400" />
                  </div>

                  {/* Header of the Official Minute */}
                  <div className="text-center space-y-1 border-b border-amber-500/30 pb-4">
                    <p className="font-serif-masonic text-base sm:text-lg font-bold text-amber-200 tracking-wider">
                      A∴R∴L∴S∴ FRATERNIDADE DA FRANCA Nº 3571
                    </p>
                    <p className="text-xs text-slate-400 font-medium">
                      ORIENTE DE FRANCA/SP — JURISDICIONADA AO GOSP
                    </p>
                    <div className="inline-flex items-center space-x-2 mt-2 px-3 py-1 rounded-full bg-slate-900 border border-amber-500/40 text-xs font-bold text-amber-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{existingBalaustre?.number || `Balaústre da ${selectedSession.title}`}</span>
                    </div>
                  </div>

                  {/* Text Content Formatted for Comfortable Reading */}
                  <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-serif-masonic space-y-4 whitespace-pre-line bg-slate-900/40 p-4 sm:p-6 rounded-xl border border-slate-800/80 min-h-[140px]">
                    {currentTextContent ? (
                      currentTextContent
                    ) : (
                      <div className="text-center py-8 text-slate-500 italic text-xs font-sans">
                        Nenhum texto de balaústre inserido pela Secretaria para esta sessão até o momento.
                        {isAdmin && (
                          <div className="mt-3">
                            <button
                              onClick={() => setIsEditingMode(true)}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs not-italic"
                            >
                              Inserir / Redigir Balaústre Agora
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Official Masonic Signatures Preview */}
                  <div className="pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs text-slate-400">
                    <div className="space-y-1">
                      <div className="h-0.5 bg-slate-700 w-3/4 mx-auto mb-2" />
                      <p className="font-bold text-slate-200">Venerável Mestre</p>
                      <p className="text-[10px] text-slate-500">Dirigente dos Trabalhos</p>
                    </div>

                    <div className="space-y-1">
                      <div className="h-0.5 bg-slate-700 w-3/4 mx-auto mb-2" />
                      <p className="font-bold text-slate-200">Orador da Loja</p>
                      <p className="text-[10px] text-slate-500">Guarda da Lei</p>
                    </div>

                    <div className="space-y-1">
                      <div className="h-0.5 bg-slate-700 w-3/4 mx-auto mb-2" />
                      <p className="font-bold text-slate-200">Secretário da Loja</p>
                      <p className="text-[10px] text-slate-500">Lavrador da Ata</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar in Read Mode */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Ata oficial arquivada na Secretaria da Loja. Disponível para leitura e emissão.</span>
                  </div>

                  <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <button
                      onClick={handleDownloadPDF}
                      className="flex-1 sm:flex-none bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition shadow-lg shadow-amber-500/20 active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      <span>Baixar Balaústre em PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
