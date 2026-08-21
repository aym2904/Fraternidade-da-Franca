export type MasonicDegree = 'Aprendiz' | 'Companheiro' | 'Mestre';
export type MasonicDegreeLevel = 1 | 2 | 3;

export type MemberStatus = 'Regular' | 'Remido' | 'Emérito' | 'Licenciado' | 'Placet';

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
  currentOfficerRole?: LodgeOfficerRole;
  joinedDate: string;
  phone: string;
  password?: string;
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
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  memberId: string;
  timestamp: string;
  method: 'QR_CODE' | 'MANUAL' | 'JUSTIFIED';
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

export interface Justification {
  id: string;
  memberId: string;
  sessionId: string;
  reason: string;
  category: 'Atestado Médico' | 'Viagem a Trabalho' | 'Decreto / Licença' | 'Motivo Pessoal' | 'Outro';
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  submittedAt: string;
  reviewedAt?: string;
  reviewerNotes?: string;
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
