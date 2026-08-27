import React, { useState } from 'react';
import {
  FileCheck2,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Paperclip,
  FileText,
  User,
  Calendar,
  X,
  AlertCircle,
  Download
} from 'lucide-react';
import { Justification, Member, Session } from '../types/masonic';
import { isLodgeAdmin } from '../utils/authUtils';
import { getMemberPhotoUrl } from '../utils/avatarUtils';
import { sortSessionsByCreationDesc } from '../utils/masonicUtils';
import { downloadJustificationAttachment } from '../utils/pdfGenerator';

interface JustificationsManagerProps {
  justifications: Justification[];
  members: Member[];
  sessions: Session[];
  currentUser: Member;
  onAddJustification: (justification: Justification) => void;
  onReviewJustification: (id: string, status: 'Aprovado' | 'Rejeitado', reviewerNotes?: string) => void;
}

export const JustificationsManager: React.FC<JustificationsManagerProps> = ({
  justifications = [],
  members = [],
  sessions = [],
  currentUser,
  onAddJustification,
  onReviewJustification,
}) => {
  const isAdmin = isLodgeAdmin(currentUser);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    sessionId: sessions[0]?.id || '',
    category: 'Atestado Médico' as Justification['category'],
    reason: '',
    fileName: '',
    fileUrl: '',
  });
  const [fileError, setFileError] = useState<string | null>(null);

  // For non-admin members, list ONLY their own justifications
  const visibleJustifications = isAdmin
    ? justifications
    : justifications.filter((j) => j.memberId === currentUser.id);

  const filteredJustifications = visibleJustifications.filter((j) => {
    if (filterStatus === 'ALL') return true;
    return j.status === filterStatus;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          fileName: file.name,
          fileUrl: reader.result as string,
        });
        setFileError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fileName || !formData.fileUrl) {
      setFileError('É OBRIGATÓRIO anexar o documento em PDF ou Imagem (Atestado Médico/Comprovante) para enviar a justificativa.');
      return;
    }

    if (!formData.sessionId || !formData.reason) return;

    const newJ: Justification = {
      id: 'j-' + Date.now(),
      memberId: currentUser.id,
      sessionId: formData.sessionId,
      reason: formData.reason,
      category: formData.category,
      fileName: formData.fileName,
      fileUrl: formData.fileUrl,
      status: 'Pendente',
      submittedAt: new Date().toISOString(),
    };

    onAddJustification(newJ);
    setIsSubmitModalOpen(false);
    setFileError(null);
    setFormData({
      sessionId: sessions[0]?.id || '',
      category: 'Atestado Médico',
      reason: '',
      fileName: '',
      fileUrl: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h2 className="font-serif-masonic text-xl font-bold text-amber-200">
            {isAdmin ? 'Central de Abonos e Justificativas' : 'Minhas Justificativas de Ausência'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin
              ? 'Espaço regimental para análise, aprovação de atestados e abono de faltas pela Secretaria.'
              : 'Submeta e acompanhe o status de aprovação de seus atestados médicos e licenças regimentais.'}
          </p>
        </div>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center space-x-2 transition shadow-md shadow-amber-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Enviar Nova Justificativa</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 text-xs font-medium">
        {['ALL', 'Pendente', 'Aprovado', 'Rejeitado'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-lg transition ${
              filterStatus === st
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            {st === 'ALL' ? 'Todas' : st}
          </button>
        ))}
      </div>

      {/* Justifications Cards List */}
      <div className="space-y-4">
        {filteredJustifications.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-500">
            Nenhuma justificativa encontrada nesta categoria.
          </div>
        ) : (
          filteredJustifications.map((j) => {
            const member = members.find((m) => m.id === j.memberId);
            const session = sessions.find((s) => s.id === j.sessionId);

            return (
              <div
                key={j.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-3">
                    {member && (
                      <img
                        src={getMemberPhotoUrl(member.photoUrl)}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-amber-500/40"
                      />
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">
                        {member?.fullName || 'Irmão Obreiro'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        CIM: {member?.cim} • Categoria: <strong className="text-amber-400">{j.category}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 ${
                        j.status === 'Aprovado'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : j.status === 'Rejeitado'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {j.status === 'Aprovado' && <CheckCircle className="w-3.5 h-3.5" />}
                      {j.status === 'Rejeitado' && <XCircle className="w-3.5 h-3.5" />}
                      {j.status === 'Pendente' && <Clock className="w-3.5 h-3.5" />}
                      <span>{j.status}</span>
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="text-xs space-y-2">
                  <p className="text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 leading-relaxed">
                    "{j.reason}"
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>
                      Sessão Relacionada: <strong className="text-slate-200">{session?.title || 'Sessão do Dia'}</strong>
                    </span>
                    <span>Enviado em: {new Date(j.submittedAt).toLocaleDateString('pt-BR')}</span>
                  </div>

                  {/* Attachment indicator if present */}
                  {j.fileName && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadJustificationAttachment(j, member, session);
                      }}
                      title={`Clique para baixar o arquivo anexo: ${j.fileName}`}
                      className="w-full text-left flex items-center justify-between bg-amber-950/40 hover:bg-amber-900/60 active:bg-amber-950 p-2.5 rounded-lg border border-amber-800/60 hover:border-amber-500/80 text-amber-300 hover:text-amber-200 text-xs font-medium transition-all group cursor-pointer shadow-sm"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Paperclip className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform shrink-0" />
                        <span className="truncate">
                          Anexo: <strong className="underline underline-offset-2 font-mono text-amber-300 group-hover:text-amber-100 font-semibold">{j.fileName}</strong>
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0 ml-2 bg-amber-900/80 group-hover:bg-amber-600 text-amber-200 group-hover:text-slate-950 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-700/60 group-hover:border-amber-500 transition-colors">
                        <Download className="w-3 h-3" />
                        <span>Baixar</span>
                      </div>
                    </button>
                  )}

                  {/* Reviewer Notes if already reviewed */}
                  {j.reviewerNotes && (
                    <p className="text-[11px] text-slate-400 italic bg-slate-950 p-2 rounded">
                      Observação do Secretário: {j.reviewerNotes}
                    </p>
                  )}
                </div>

                {/* Reviewer Actions for Pending Justifications (Admin Only) */}
                {isAdmin && j.status === 'Pendente' && (
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onReviewJustification(j.id, 'Rejeitado', 'Justificativa não aprovada regimentalmente.')}
                      className="bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 text-xs px-3 py-1.5 rounded-lg transition"
                    >
                      Rejeitar
                    </button>
                    <button
                      onClick={() => onReviewJustification(j.id, 'Aprovado', 'Falta abonada regimentalmente pelo Secretário.')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs px-4 py-1.5 rounded-lg transition"
                    >
                      Aprovar (Abonar Falta)
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Submit Justification Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full my-auto text-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-900/95">
              <h3 className="font-serif-masonic text-base sm:text-lg font-bold text-amber-200">
                Enviar Justificativa de Inassiduidade
              </h3>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Selecione a Sessão de Ausência</label>
                <select
                  required
                  value={formData.sessionId}
                  onChange={(e) => setFormData({ ...formData, sessionId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {sortSessionsByCreationDesc(sessions).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.date.split('-').reverse().join('/')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Categoria da Justificativa</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="Atestado Médico">Atestado Médico / Procedimento</option>
                  <option value="Viagem a Trabalho">Viagem Institucional / Trabalho</option>
                  <option value="Decreto / Licença">Decreto / Pedido de Licença</option>
                  <option value="Motivo Pessoal">Motivo Pessoal Força Maior</option>
                  <option value="Outro">Outro Motivo</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Detalhamento e Motivação</label>
                <textarea
                  required
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Descreva o motivo regimental da ausência..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Document File Attachment */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Anexar Documento / Atestado <span className="text-rose-400 font-bold">* (Obrigatório)</span>
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer bg-slate-950/60 transition relative ${
                    fileError
                      ? 'border-rose-500 bg-rose-950/20'
                      : formData.fileName
                      ? 'border-emerald-500/80 bg-emerald-950/20'
                      : 'border-slate-800 hover:border-amber-500/50'
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Paperclip className={`w-6 h-6 mx-auto mb-1 ${formData.fileName ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <p className="text-slate-200 font-medium">
                    {formData.fileName ? (
                      <span className="text-emerald-300 font-semibold">Anexado: {formData.fileName}</span>
                    ) : (
                      'Clique ou arraste o arquivo PDF/Imagem do Atestado Médico'
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Formatos suportados: PDF, PNG, JPG (máx 10MB)</p>
                </div>
                {fileError && (
                  <p className="text-[11px] text-rose-400 font-medium mt-1.5 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fileError}</span>
                  </p>
                )}
              </div>

              <div className="pt-3 flex justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-4 py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2 rounded-lg"
                >
                  Enviar ao Secretário
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
