import React, { useState, useEffect } from 'react';
import {
  Member,
  ComputedCalendarItem,
  MessageTemplate,
  CalendarEventCategory
} from '../../types/masonic';
import {
  buildMessageFromTemplate,
  generateWhatsAppUrl,
  DEFAULT_MESSAGE_TEMPLATES
} from '../../utils/masonicCalendarUtils';
import {
  X,
  MessageCircle,
  Copy,
  Check,
  Send,
  Sparkles,
  Phone,
  Settings,
  RefreshCw,
  Edit3
} from 'lucide-react';

interface WhatsAppTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEvent: ComputedCalendarItem | null;
  members: Member[];
  templates: MessageTemplate[];
  onSaveTemplates?: (templates: MessageTemplate[]) => void;
}

export const WhatsAppTemplateModal: React.FC<WhatsAppTemplateModalProps> = ({
  isOpen,
  onClose,
  selectedEvent,
  members,
  templates = DEFAULT_MESSAGE_TEMPLATES,
  onSaveTemplates,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState<boolean>(false);
  const [templateEditDraft, setTemplateEditDraft] = useState<string>('');

  useEffect(() => {
    if (selectedEvent) {
      // Encontrar template correspondente à categoria do evento
      const matched = templates.find((t) => t.category === selectedEvent.category) || templates[0];
      setSelectedTemplateId(matched.id);
      
      const targetMember = members.find(
        (m) => m.id === selectedEvent.memberId || m.cim === selectedEvent.memberCim
      );

      const generated = buildMessageFromTemplate(matched.template, {
        nome: selectedEvent.personName || targetMember?.fullName,
        idade: selectedEvent.yearsCount,
        grau: targetMember?.degree || selectedEvent.degree || 'Mestre Maçom',
        cargo: targetMember?.currentOfficerRole || selectedEvent.role || 'Obreiro',
        anos: selectedEvent.yearsCount,
        boda: selectedEvent.weddingBodaName,
        cunhada: targetMember?.wife?.name || selectedEvent.personName,
        irmao: targetMember?.fullName || selectedEvent.personName,
        pai: targetMember?.fullName,
        mae: targetMember?.wife?.name,
      });

      setCustomMessage(generated);
      setPhoneInput(selectedEvent.phone || targetMember?.phone || '');
    }
  }, [selectedEvent, isOpen]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const chosen = templates.find((t) => t.id === templateId);
    if (chosen && selectedEvent) {
      const targetMember = members.find(
        (m) => m.id === selectedEvent.memberId || m.cim === selectedEvent.memberCim
      );

      const generated = buildMessageFromTemplate(chosen.template, {
        nome: selectedEvent.personName || targetMember?.fullName,
        idade: selectedEvent.yearsCount,
        grau: targetMember?.degree || selectedEvent.degree || 'Mestre Maçom',
        cargo: targetMember?.currentOfficerRole || selectedEvent.role || 'Obreiro',
        anos: selectedEvent.yearsCount,
        boda: selectedEvent.weddingBodaName,
        cunhada: targetMember?.wife?.name || selectedEvent.personName,
        irmao: targetMember?.fullName || selectedEvent.personName,
        pai: targetMember?.fullName,
        mae: targetMember?.wife?.name,
      });

      setCustomMessage(generated);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const url = generateWhatsAppUrl(phoneInput, customMessage);
    window.open(url, '_blank');
  };

  const handleSaveTemplateEdit = () => {
    if (!onSaveTemplates) return;
    const updated = templates.map((t) =>
      t.id === selectedTemplateId ? { ...t, template: templateEditDraft } : t
    );
    onSaveTemplates(updated);
    setIsEditingTemplate(false);
    setCustomMessage(templateEditDraft);
  };

  if (!isOpen || !selectedEvent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header (Sticky) */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950/40 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-masonic text-emerald-200 text-base sm:text-lg font-bold">
                Mensagem WhatsApp
              </h3>
              <p className="text-xs text-slate-400">
                Texto para {selectedEvent.personName || selectedEvent.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal (Scrollable) */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Card do Evento */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="text-2xl shrink-0">{selectedEvent.icon || '🎂'}</div>
              <div className="min-w-0">
                <h4 className="font-semibold text-slate-200 text-sm truncate">{selectedEvent.title}</h4>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{selectedEvent.subInfo || selectedEvent.description}</p>
              </div>
            </div>

            {selectedEvent.yearsCount !== undefined && (
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-lg shrink-0">
                {selectedEvent.yearsCount} anos
              </span>
            )}
          </div>

          {/* Selecionar Modelo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Selecione o Modelo de Mensagem:
            </label>
            <div className="flex items-center space-x-2">
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-emerald-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Destinatário & Telefone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Telefone / WhatsApp do Destinatário:
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ex: (16) 99999-9999 ou 5516999999999"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          </div>

          {/* Área de Texto da Mensagem */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Conteúdo da Mensagem (Você pode editar antes de enviar):
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>

            <textarea
              rows={7}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-xl p-4 focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
            />
          </div>

          {/* Dica de Tags Disponíveis */}
          <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <strong>Tags Dinâmicas suportadas nos modelos:</strong>{' '}
            <code className="text-amber-400">
              {'{nome}'}, {'{idade}'}, {'{grau}'}, {'{cargo}'}, {'{loja}'}, {'{anos}'}, {'{boda}'},{' '}
              {'{cunhada}'}, {'{irmao}'}
            </code>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition-colors"
          >
            Fechar
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-sm font-medium rounded-xl transition-colors flex items-center space-x-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-sm font-bold rounded-xl transition-colors shadow-lg flex items-center space-x-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Abrir no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
