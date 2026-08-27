import { Member, Session, LodgeOfficerRole } from '../types/masonic';
import { ADMIN_AVATAR } from './avatarUtils';

export interface RolePermissions {
  canStartSession: boolean;
  canManageQrCode: boolean;
  canManageMembers: boolean;
  canManageAttendance: boolean;
  canManageBalaustres: boolean;
  canManageJustifications: boolean;
  canViewReports: boolean;
  roleTitle: string;
  description: string;
  badgeLabel: string;
}

export const ADMIN_OFFICER_ROLES: LodgeOfficerRole[] = [
  'Secretário',
  'Chanceler',
  'Venerável Mestre',
];

export const OFFICER_PERMISSIONS_MAP: Record<string, RolePermissions> = {
  'Venerável Mestre': {
    canStartSession: true,
    canManageQrCode: true,
    canManageMembers: true,
    canManageAttendance: true,
    canManageBalaustres: true,
    canManageJustifications: true,
    canViewReports: true,
    roleTitle: 'Venerável Mestre',
    description: 'Presidência dos trabalhos, abertura e gestão de sessões, exibição do QR Code, aprovação de atas e justificativas.',
    badgeLabel: 'VENERÁVEL MESTRE',
  },
  'Secretário': {
    canStartSession: true,
    canManageQrCode: true,
    canManageMembers: true,
    canManageAttendance: true,
    canManageBalaustres: true,
    canManageJustifications: true,
    canViewReports: true,
    roleTitle: 'Secretário',
    description: 'Gestão administrativa, abertura de sessões, exibição de QR Code, lavratura de balaústres, livro negro e presenças.',
    badgeLabel: 'SECRETÁRIO',
  },
  'Chanceler': {
    canStartSession: true,
    canManageQrCode: true,
    canManageMembers: true,
    canManageAttendance: true,
    canManageBalaustres: true,
    canManageJustifications: true,
    canViewReports: true,
    roleTitle: 'Chanceler',
    description: 'Guarda do timbre, abertura de reuniões, exibição do QR Code, controle de presença do quadro, visitantes e abonos.',
    badgeLabel: 'CHANCELER',
  },
};

export const SYSTEM_ADMIN_USER: Member = {
  id: 'sys-admin-master',
  fullName: 'Administração do Sistema',
  cpf: '000.000.000-00',
  email: 'admin@fraternidadedefranca.org.br',
  photoUrl: ADMIN_AVATAR,
  cim: 'admin',
  degree: 'Mestre',
  degreeLevel: 3,
  status: 'Regular',
  currentOfficerRole: 'Secretário',
  joinedDate: '2024-01-01',
  phone: '-',
  password: '19324510',
};

/**
 * Checks if a member is the reserved system administrator / developer account.
 */
export function isSystemAdmin(member: Member | null | undefined): boolean {
  if (!member) return false;
  const cleanCim = String(member.cim || '').trim().toLowerCase();
  const rawId = String(member.id || '').trim().toLowerCase();
  return (
    rawId === 'sys-admin-master' ||
    rawId === 'sys-admin-193245' ||
    rawId === 'admin' ||
    rawId === '193245' ||
    cleanCim === 'admin' ||
    cleanCim === '193245' ||
    member.fullName === 'Administração do Sistema'
  );
}

/**
 * Checks if a member has administrative/management officer permissions in the Lodge
 * (Exclusivamente Secretário, Chanceler, Venerável Mestre com Grau de Mestre, ou Administrador do Sistema).
 */
export function isLodgeAdmin(member: Member | null | undefined): boolean {
  if (!member) return false;
  if (isSystemAdmin(member)) return true;
  // Apenas Mestres Maçons (3º Grau) investidos estritamente nos cargos regimentais de gestão
  if ((member.degreeLevel || 0) < 3) return false;
  const role = member.currentOfficerRole;
  return role ? ADMIN_OFFICER_ROLES.includes(role) : false;
}

/**
 * Returns permissions for a specific officer role if defined.
 */
export function getOfficerPermissions(role?: LodgeOfficerRole | string): RolePermissions | null {
  if (!role) return null;
  return OFFICER_PERMISSIONS_MAP[role] || null;
}

/**
 * Checks if a member can view/exhibit the session QR Code and Token.
 * Restrito estritamente a: Venerável Mestre, Secretário, Chanceler e Administrador do Sistema.
 */
export function canViewQrCodeAndToken(member: Member | null | undefined): boolean {
  return isLodgeAdmin(member);
}

/**
 * Checks if a member can start/manage sessions and exhibit QR Code projector.
 */
export function canManageSessionsAndQrCode(member: Member | null | undefined): boolean {
  return isLodgeAdmin(member);
}

/**
 * Checks if a member can access a session based on degree level or administrative privilege.
 */
export function canAccessSessionDegree(member: Member, sessionDegreeLevel: number): boolean {
  if (isLodgeAdmin(member)) return true;
  return sessionDegreeLevel <= member.degreeLevel;
}

/**
 * Checks if a member can access a balaústre (minute) based on the session's degree level.
 */
export function canAccessBalaustreDegree(member: Member, sessionDegreeLevel: number): boolean {
  if (isLodgeAdmin(member)) return true;
  return sessionDegreeLevel <= member.degreeLevel;
}

/**
 * Returns a readable user role description and color badge class.
 */
export function getRoleBadgeLabel(member: Member): { label: string; colorClass: string } {
  if (isSystemAdmin(member)) {
    return {
      label: 'ADMINISTRAÇÃO DO SISTEMA',
      colorClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/50',
    };
  }

  if (member.currentOfficerRole && OFFICER_PERMISSIONS_MAP[member.currentOfficerRole]) {
    const roleInfo = OFFICER_PERMISSIONS_MAP[member.currentOfficerRole];
    return {
      label: roleInfo.badgeLabel,
      colorClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/50',
    };
  }

  if (isLodgeAdmin(member)) {
    return {
      label: (member.currentOfficerRole || 'ADMINISTRAÇÃO').toUpperCase(),
      colorClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/50',
    };
  }

  if (member.degree === 'Mestre') {
    return {
      label: `MESTRE (3º GRAU)${member.currentOfficerRole ? ` • ${member.currentOfficerRole}` : ''}`,
      colorClass: 'bg-purple-950/80 text-purple-300 border border-purple-800',
    };
  }

  if (member.degree === 'Companheiro') {
    return {
      label: `COMPANHEIRO (2º GRAU)${member.currentOfficerRole ? ` • ${member.currentOfficerRole}` : ''}`,
      colorClass: 'bg-blue-950/80 text-blue-300 border border-blue-800',
    };
  }

  return {
    label: `APRENDIZ (1º GRAU)${member.currentOfficerRole ? ` • ${member.currentOfficerRole}` : ''}`,
    colorClass: 'bg-emerald-950/80 text-emerald-300 border border-emerald-800',
  };
}
