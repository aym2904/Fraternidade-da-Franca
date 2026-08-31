import React, { useState } from 'react';
import { Member, ComputedCalendarItem, MessageTemplate } from '../../types/masonic';
import {
  calculateYearsPassed,
  getWeddingBodaName,
  generateWhatsAppUrl,
  buildMessageFromTemplate,
  DEFAULT_MESSAGE_TEMPLATES,
  formatFullBrazilianDate
} from '../../utils/masonicCalendarUtils';
import {
  User,
  Calendar,
  Heart,
  Award,
  Cake,
  Phone,
  Mail,
  MessageCircle,
  Search,
  Users,
  Shield,
  Clock,
  Sparkles,
  Edit3,
  CalendarCheck
} from 'lucide-react';
import { getMemberPhotoUrl } from '../../utils/avatarUtils';
import { isLodgeAdmin } from '../../utils/authUtils';

interface CalendarTimelineViewProps {
  members: Member[];
  currentUser: Member;
  allEvents: ComputedCalendarItem[];
  onOpenEditFamilyModal: (member: Member) => void;
  messageTemplates?: MessageTemplate[];
}

export const CalendarTimelineView: React.FC<CalendarTimelineViewProps> = ({
  members,
  currentUser,
  allEvents,
  onOpenEditFamilyModal,
  messageTemplates = DEFAULT_MESSAGE_TEMPLATES,
}) => {
  const isAdmin = isLodgeAdmin(currentUser);

  // Irmão selecionado inicialmente (por padrão o usuário atual se for irmão comum, ou primeiro da lista)
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    currentUser?.id || (members.length > 0 ? members[0].id : '')
  );

  const [searchTerm, setSearchTerm] = useState<string>('');

  const selectedMember = members.find((m) => m.id === selectedMemberId) || members[0];

  if (!selectedMember) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        Nenhum obreiro encontrado no quadro.
      </div>
    );
  }

  // Cálculos do Irmão
  const currentYear = new Date().getFullYear();
  const age = calculateYearsPassed(selectedMember.birthDate, currentYear);
  const masonicYears = calculateYearsPassed(selectedMember.initiationDate || selectedMember.joinedDate, currentYear);
  const elevationYears = calculateYearsPassed(selectedMember.elevationDate, currentYear);
  const exaltationYears = calculateYearsPassed(selectedMember.exaltationDate, currentYear);
  const installationYears = calculateYearsPassed(selectedMember.installationDate, currentYear);

  // Esposa e Casamento
  const wife = selectedMember.wife;
  const wifeAge = wife?.birthDate ? calculateYearsPassed(wife.birthDate, currentYear) : undefined;
  const marriageYears = wife?.marriageDate ? calculateYearsPassed(wife.marriageDate, currentYear) : undefined;
  const weddingBoda = marriageYears !== undefined ? getWeddingBodaName(marriageYears) : undefined;

  // Filhos
  const children = selectedMember.children || [];

  // Filtragem na busca de membros
  const filteredMembers = members.filter(
    (m) =>
      m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.cim.includes(searchTerm) ||
      m.cpf.includes(searchTerm)
  );

  const handleSendWhatsApp = (phone?: string, text?: string) => {
    const url = generateWhatsAppUrl(phone || selectedMember.phone, text);
    window.open(url, '_blank');
  };

  const canEdit = isAdmin || currentUser.id === selectedMember.id;

  return (
    <div className="space-y-6">
      {/* Seletor do Irmão & Busca */}
      <div className="bg-slate-900 border border-amber-900/30 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              👤 Linha do Tempo Pessoal & Familiar
            </span>
            <h2 className="text-xl font-serif-masonic text-amber-200 font-bold mt-1">
              Jornada Maçônica e Histórico Familiar
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Consulte todas as datas comemorativas, anos de vida, marcos maçônicos e vínculos familiares do Obreiro.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 md:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por Nome ou CIM..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs sm:text-sm rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-amber-300 font-medium text-xs sm:text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 max-w-full sm:max-w-[220px] truncate"
            >
              {filteredMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.cim ? `CIM ${m.cim} - ` : ''}
                  {m.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Cartão de Perfil Principal do Obreiro */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-900/40 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-5 relative z-10 w-full">
          <div className="flex items-start sm:items-center space-x-3.5 sm:space-x-4 min-w-0 w-full">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-800 border-2 border-amber-500/50 shadow-md shrink-0">
              <img
                src={getMemberPhotoUrl(selectedMember.photoUrl)}
                alt={selectedMember.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-2xl font-serif-masonic text-amber-200 font-bold break-words leading-tight">
                  {selectedMember.fullName}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 text-xs">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shrink-0">
                  CIM {selectedMember.cim}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0">
                  {selectedMember.degree} (Grau {selectedMember.degreeLevel})
                </span>
                {selectedMember.currentOfficerRole && (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold shrink-0">
                    {selectedMember.currentOfficerRole}
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                  {selectedMember.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400 mt-2.5 min-w-0">
                {selectedMember.phone && (
                  <span className="flex items-center space-x-1 shrink-0">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-mono text-slate-300">{selectedMember.phone}</span>
                  </span>
                )}
                {selectedMember.email && (
                  <span className="flex items-center space-x-1 min-w-0 max-w-full text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                    <span className="break-all">{selectedMember.email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
            {canEdit && (
              <button
                onClick={() => onOpenEditFamilyModal(selectedMember)}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow"
              >
                <Edit3 className="w-4 h-4" />
                <span>Editar Datas & Vínculo</span>
              </button>
            )}
            <button
              onClick={() => handleSendWhatsApp(selectedMember.phone, '')}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold transition-colors"
              title="Conversar com o Irmão no WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Resumo em Números */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block">Idade Natalícia</span>
            <span className="text-xl font-bold text-amber-300 font-serif-masonic mt-0.5 block">
              {age !== undefined ? `${age} anos` : 'Não informada'}
            </span>
            <span className="text-[11px] text-slate-500">{selectedMember.birthDate || 'Cadastre a data'}</span>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block">Idade Maçônica</span>
            <span className="text-xl font-bold text-emerald-300 font-serif-masonic mt-0.5 block">
              {masonicYears !== undefined ? `${masonicYears} anos` : '0 anos'}
            </span>
            <span className="text-[11px] text-slate-500">Iniciação: {selectedMember.initiationDate || selectedMember.joinedDate}</span>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block">União Conjugal</span>
            <span className="text-xl font-bold text-rose-300 font-serif-masonic mt-0.5 block">
              {marriageYears !== undefined ? `${marriageYears} anos` : '—'}
            </span>
            <span className="text-[11px] text-slate-500">{weddingBoda || (wife ? 'Casado' : 'Solteiro')}</span>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block">Filhos (Sobrinhos)</span>
            <span className="text-xl font-bold text-sky-300 font-serif-masonic mt-0.5 block">
              {children.length} {children.length === 1 ? 'filho' : 'filhos'}
            </span>
            <span className="text-[11px] text-slate-500">Família da Oficina</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Linha do Tempo Maçônica */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif-masonic text-emerald-200 text-base font-bold">
                Jornada Maçônica do Obreiro
              </h3>
              <p className="text-xs text-slate-400">Graus, Iniciação, Elevação, Exaltação e Posse</p>
            </div>
          </div>

          <div className="relative pl-6 mt-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {/* Iniciação */}
            <div className="relative group">
              <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-emerald-500 border-4 border-slate-900 shadow" />
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                    ⚜️ Grau 1 • Aprendiz Maçom
                  </span>
                  {masonicYears !== undefined && (
                    <span className="text-xs font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md">
                      {masonicYears} anos de Iniciação
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-semibold text-slate-200 mt-1">Iniciação nos Mistérios</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Data: {selectedMember.initiationDate || selectedMember.joinedDate || 'Não informada'}
                </p>
              </div>
            </div>

            {/* Elevação */}
            <div className="relative group">
              <div
                className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-4 border-slate-900 shadow ${
                  selectedMember.elevationDate || selectedMember.degreeLevel >= 2 ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              />
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                    ⭐ Grau 2 • Companheiro Maçom
                  </span>
                  {elevationYears !== undefined && (
                    <span className="text-xs font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md">
                      {elevationYears} anos
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-semibold text-slate-200 mt-1">Elevação ao Grau 2</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Data: {selectedMember.elevationDate || (selectedMember.degreeLevel >= 2 ? 'Concluída' : 'Pendente')}
                </p>
              </div>
            </div>

            {/* Exaltação */}
            <div className="relative group">
              <div
                className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-4 border-slate-900 shadow ${
                  selectedMember.exaltationDate || selectedMember.degreeLevel === 3 ? 'bg-purple-500' : 'bg-slate-700'
                }`}
              />
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">
                    🌿 Grau 3 • Sublime Grau de Mestre
                  </span>
                  {exaltationYears !== undefined && (
                    <span className="text-xs font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md">
                      {exaltationYears} anos
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-semibold text-slate-200 mt-1">Exaltação ao Mestrado</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Data: {selectedMember.exaltationDate || (selectedMember.degreeLevel === 3 ? 'Concluída' : 'Pendente')}
                </p>
              </div>
            </div>

            {/* Instalação / Posse */}
            {selectedMember.installationDate && (
              <div className="relative group">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-rose-500 border-4 border-slate-900 shadow" />
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-rose-500/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wide">
                      🔨 Mestre Instalado
                    </span>
                    {installationYears !== undefined && (
                      <span className="text-xs font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md">
                        {installationYears} anos
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200 mt-1">Instalação no Trono de Salomão</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Data: {selectedMember.installationDate}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coluna 2: Núcleo Familiar (Cunhada & Sobrinhos) */}
        <div className="space-y-6">
          {/* Cunhada & Casamento */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-300">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif-masonic text-pink-200 text-base font-bold">Cunhada & Casamento</h3>
                  <p className="text-xs text-slate-400">Esposa e Aniversário de Bodas</p>
                </div>
              </div>

              {canEdit && (
                <button
                  onClick={() => onOpenEditFamilyModal(selectedMember)}
                  className="text-xs text-amber-400 hover:text-amber-300 underline"
                >
                  {wife ? 'Alterar' : '+ Adicionar'}
                </button>
              )}
            </div>

            {wife ? (
              <div className="mt-4 space-y-3">
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-200 text-sm">{wife.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Nascimento: {wife.birthDate || 'Não informada'}{' '}
                        {wifeAge !== undefined && `(${wifeAge} anos)`}
                      </p>
                      {wife.phone && (
                        <p className="text-xs text-emerald-400/90 mt-1 flex items-center space-x-1">
                          <Phone className="w-3 h-3" />
                          <span>{wife.phone}</span>
                        </p>
                      )}
                    </div>

                    {wife.phone && (
                      <button
                        onClick={() => handleSendWhatsApp(wife.phone, '')}
                        className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs transition-colors"
                        title="Conversar no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {wife.marriageDate && (
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-rose-400 uppercase tracking-wide">
                        🥂 Aniversário de Casamento
                      </span>
                      <h5 className="font-semibold text-slate-200 text-sm mt-0.5">
                        {marriageYears} anos • {weddingBoda}
                      </h5>
                      <p className="text-xs text-slate-400 mt-0.5">Data do enlace: {wife.marriageDate}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs">
                Nenhum dado de cunhada ou casamento vinculado a este Obreiro.
              </div>
            )}
          </div>

          {/* Sobrinhos (Filhos) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif-masonic text-sky-200 text-base font-bold">
                    Sobrinhos ({children.length})
                  </h3>
                  <p className="text-xs text-slate-400">Filhos do Irmão</p>
                </div>
              </div>

              {canEdit && (
                <button
                  onClick={() => onOpenEditFamilyModal(selectedMember)}
                  className="text-xs text-amber-400 hover:text-amber-300 underline"
                >
                  + Gerenciar
                </button>
              )}
            </div>

            {children.length > 0 ? (
              <div className="mt-4 space-y-2.5">
                {children.map((child) => {
                  const childAge = calculateYearsPassed(child.birthDate, currentYear);
                  return (
                    <div
                      key={child.id || child.name}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <h5 className="font-semibold text-slate-200 text-sm">{child.name}</h5>
                          {childAge !== undefined && (
                            <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold">
                              {childAge} anos
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Nascimento: {child.birthDate}
                          {child.motherName ? ` • Mãe: Cunhada ${child.motherName}` : ''}
                        </p>
                      </div>

                      {child.phone && (
                        <button
                          onClick={() => handleSendWhatsApp(child.phone, '')}
                          className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs transition-colors"
                          title="Conversar no WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-500 text-xs">
                Nenhum filho (sobrinho) cadastrado para este Irmão.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
