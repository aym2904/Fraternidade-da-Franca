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
  closedAt?: string;

  // QR Code Pix Estático do Tronco de Beneficência (Modelo Sessão -> Múltiplos Pagamentos)
  beneficenceQrCodeId?: string;
  beneficenceQrPayload?: string;
  beneficenceQrImage?: string;
  beneficenceQrExpiresAt?: string;
  beneficenceQrStatus?: 'ACTIVE' | 'EXPIRED' | 'CLOSED' | 'PENDING';
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

// -------------------------------------------------------------
// MÓDULO DE VENDA DE MASSAS
// -------------------------------------------------------------
export type PastaFlavor = 'Quatro Queijos' | 'Presunto e Muçarela';

export type PastaSaleStatus = 'Aguardando Retirada' | 'Retirada Realizada' | 'Cancelada';

export interface PastaFlavorItem {
  flavor: PastaFlavor;
  quantity: number;
}

export interface PastaSale {
  id: string; // Identificador único (UUID)
  saleCode: string; // Número amigável da venda (ex: "MASSA-8F3A" ou "8F3A7D91")
  qrCodeToken: string; // Token UUID exclusivo para validação criptografada do QR Code (ex: "8F3A7D91-29D8-4A11-98F2")
  customerName: string; // Nome do cliente
  phone: string; // Telefone / WhatsApp do cliente
  flavor: string; // Resumo textual dos sabores (ex: "Quatro Queijos (2), Presunto e Muçarela (1)")
  items: PastaFlavorItem[]; // Detalhamento dos sabores e quantidades
  totalQuantity: number; // Quantidade total de massas
  unitPrice: number; // Valor unitário (ex: R$ 35,00)
  totalAmount: number; // Valor total em R$ (unitPrice * totalQuantity)
  paymentStatus?: 'Pago' | 'Pendente' | 'Cortesia';
  paymentMethod?: 'Pix' | 'Dinheiro' | 'Cartão' | 'Outro';
  
  // Usuário / Irmão que realizou a venda
  sellerId: string; // ID do irmão vendedor (usuario_id)
  sellerName: string; // Nome completo do irmão vendedor
  sellerCim?: string; // CIM do irmão vendedor
  
  // Datas e Status
  createdAt: string; // Data e hora da venda (ISO string)
  status: PastaSaleStatus; // Status da venda ("Aguardando Retirada" | "Retirada Realizada" | "Cancelada")
  
  // Dados da Retirada / Entrega
  pickupDate?: string; // Data e hora em que a retirada foi realizada
  pickupOperatorId?: string; // ID do irmão que realizou a entrega no dia
  pickupOperatorName?: string; // Nome do irmão que validou o QR Code e entregou a massa
  notes?: string;
}

// -------------------------------------------------------------
// MÓDULO TRONCO DE BENEFICÊNCIA
// -------------------------------------------------------------
export type TroncoContributionStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'RECEIVED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface TroncoContribution {
  id: string; // UUID único da contribuição
  sequenceNumber?: number; // Contador sequencial (ex: 1, 2, 3 -> #001, #002)
  sessionId: string; // ID da sessão vinculada
  sessionTitle: string; // Título da sessão (ex: "Sessão nº 125")
  sessionDate: string; // Data da sessão (YYYY-MM-DD)
  amount: number; // Valor da contribuição em Reais (ex: 50.00)
  currency?: string; // BRL
  status: TroncoContributionStatus; // Status da cobrança
  paymentMethod: 'PIX' | 'CASH';
  
  // Dados do Asaas
  asaasPaymentId?: string; // ID da cobrança gerada no Asaas (ex: "pay_123456")
  asaasQrCodeId?: string; // ID do QR Code Estático da Sessão no Asaas
  asaasEventId?: string; // ID do evento de webhook recebido (para controle de idempotência)
  asaasQrCode?: string; // Imagem base64 do QR Code ou URL
  asaasPayload?: string; // String Copia e Cola do PIX
  externalReference?: string;
  
  // Privacidade regimental do Irmão contribuinte (anônimo perante o público)
  anonymous: boolean;
  contributorId?: string; // Opcional (apenas para auditoria técnica caso necessário)
  contributorCim?: string;
  
  // Timestamps
  createdAt: string; // Data/Hora da intenção de contribuição
  confirmedAt?: string; // Data/Hora da confirmação do webhook do Asaas
  paidAt?: string;
  notes?: string;
}

export interface TroncoSessionSummary {
  sessionId: string;
  sessionTitle: string;
  sessionDate: string;
  totalAmount: number;
  confirmedCount: number;
  isActive: boolean;
}

export interface TroncoNotificationSettings {
  showAmountInNotification?: boolean;
  enableSoundAlerts?: boolean;
  enablePush?: boolean;
  enableSound?: boolean;
  notifyOnReceived?: boolean;
  notifyHospitalerOnly?: boolean;
}

export interface TroncoPublicSummary {
  currentSession: {
    sessionId: string;
    sessionTitle: string;
    sessionDate: string;
    totalAmount: number;
    confirmedCount: number;
    isActive: boolean;
  } | null;
  history: Array<{
    sessionId: string;
    sessionTitle: string;
    sessionDate: string;
    totalAmount: number;
  }>;
  totalAccumulated: number;
}
