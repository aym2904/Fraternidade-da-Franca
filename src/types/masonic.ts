export type MasonicDegree = 'Aprendiz' | 'Companheiro' | 'Mestre';
export type MasonicDegreeLevel = 1 | 2 | 3;

export type MemberStatus = 'Regular' | 'Remido' | 'Emérito' | 'Licenciado' | 'Placet' | 'Ativo' | 'Afastado';

export type SessionType = 'Ordinária' | 'Magna' | 'Administrativa';
export type SessionSubtype = 'Pública' | 'Iniciação' | 'Elevação' | 'Exaltação' | 'Posse' | 'Trabalho de Instrução' | 'Sessão de Finanças';

export type LodgeOfficerRole =
  | 'Venerável Mestre'
  | '1º Vigilante'
  | '2º Vigilante'
  | 'Orador'
  | 'Secretário'
  | 'Tesoureiro'
  | 'Chanceler'
  | '1º Diácono'
  | '2º Diácono'
  | 'Mestre de Cerimônias'
  | 'Guarda do Templo'
  | 'Hospedeiro'
  | 'Bibliotecário'
  | 'Mestre de Harmonia';

export interface WifeData {
  id?: string;
  name: string;
  birthDate?: string; // YYYY-MM-DD
  phone?: string;
  marriageDate?: string; // YYYY-MM-DD
  notes?: string;
}

export interface ChildData {
  id: string;
  name: string;
  birthDate: string; // YYYY-MM-DD
  motherName?: string;
  phone?: string;
  notes?: string;
}

export interface Member {
  id: string;
  fullName: string;
  cpf: string;
  email: string;
  photoUrl: string;
  cim: string; // Cédula de Identidade Maçônica
  degree: MasonicDegree;
  degreeLevel: MasonicDegreeLevel;
  status: MemberStatus;
  currentOfficerRole?: LodgeOfficerRole | null;
  joinedDate: string;
  phone: string;
  password?: string;
  
  // Datas e Vínculos Familiares do Calendário Maçônico
  birthDate?: string; // YYYY-MM-DD
  initiationDate?: string; // YYYY-MM-DD
  elevationDate?: string; // YYYY-MM-DD
  exaltationDate?: string; // YYYY-MM-DD
  installationDate?: string; // YYYY-MM-DD
  affiliationDate?: string; // YYYY-MM-DD
  regularizationDate?: string; // YYYY-MM-DD
  philosophicalDegree?: number; // 1 to 33
  notes?: string;
  
  // Vínculo Familiar
  wife?: WifeData;
  children?: ChildData[];
}

export type CalendarEventCategory =
  | 'aniversario_irmao'
  | 'aniversario_cunhada'
  | 'aniversario_sobrinho'
  | 'casamento'
  | 'iniciacao'
  | 'elevacao'
  | 'exaltacao'
  | 'instalacao'
  | 'sessao_loja'
  | 'aniversario_loja'
  | 'aniversario_potencia'
  | 'data_historica'
  | 'evento_social'
  | 'homenagem'
  | 'personalizado';

export type EventRecurrence =
  | 'uma_vez'
  | 'anual'
  | 'mensal'
  | 'semanal'
  | 'a_cada_x_dias'
  | 'fixa'
  | 'variavel';

export interface CustomEvent {
  id: string;
  title: string;
  category: CalendarEventCategory;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  icon?: string;
  color?: string;
  description?: string;
  recurrence: EventRecurrence;
  recurrenceDaysInterval?: number;
  isPrivate?: boolean;
  notify?: boolean;
  responsible?: string;
  createdAt: string;
}

export interface ComputedCalendarItem {
  id: string;
  title: string;
  category: CalendarEventCategory;
  date: string; // YYYY-MM-DD (calculated for current display year)
  originalDate?: string; // original historical date
  time?: string;
  yearsCount?: number; // calculated years (e.g. 52 anos de idade, 18 anos de iniciação)
  weddingBodaName?: string; // e.g. "Bodas de Prata"
  personName?: string;
  memberId?: string;
  memberCim?: string;
  phone?: string;
  degree?: string;
  role?: string;
  photoUrl?: string;
  description?: string;
  icon?: string;
  badgeColor?: string;
  subInfo?: string;
  isSession?: boolean;
  sessionId?: string;
  customEventId?: string;
}

export interface MessageTemplate {
  id: string;
  category: CalendarEventCategory;
  title: string;
  template: string; // tags: {nome}, {idade}, {grau}, {cargo}, {loja}, {anos}, {boda}, {cunhada}, {pai}
}

export interface Session {
  id: string;
  title: string;
  type: SessionType;
  subtype?: SessionSubtype;
  degree: MasonicDegree;
  degreeLevel: MasonicDegreeLevel;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string;
  qrCodeToken: string;
  active: boolean;
  officers: Partial<Record<LodgeOfficerRole, string>>; // memberId or Name
  notes?: string;
  createdAt?: string; // ISO date string or timestamp of creation
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  memberId: string;
  timestamp: string;
  method: 'QR_CODE' | 'MANUAL';
  confirmedBy?: string;
}

export interface VisitorRecord {
  id: string;
  sessionId: string;
  fullName: string;
  cim: string;
  homeLodge: string; // e.g., "A∴R∴L∴S Fraternidade da Franca N°3571"
  potencia: string; // e.g., "GOB", "CMSB", "COMAB", "GLESP"
  degree: MasonicDegree;
  degreeLevel: MasonicDegreeLevel;
  timestamp: string;
}

export interface Balaustre {
  id: string;
  sessionId: string;
  number: string; // e.g., "Balaústre nº 1.482"
  title: string;
  date: string;
  summaryText: string;
  content: string;
  status: 'Rascunho' | 'Aprovado' | 'Assinado';
  createdAt: string;
}

export interface InactivityAlert {
  memberId: string;
  consecutiveAbsences: number;
  missedSessionIds: string[];
  lastAttendedDate?: string;
}
