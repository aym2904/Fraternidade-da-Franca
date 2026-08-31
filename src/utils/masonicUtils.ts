import {
  Member,
  Session,
  AttendanceRecord,
  VisitorRecord,
  InactivityAlert,
  MasonicDegreeLevel
} from '../types/masonic';

export interface SessionStats {
  totalEligible: number;
  totalPresentMembers: number;
  totalVisitors: number;
  totalAbsent: number;
  percentagePresent: number;
}

export interface MemberAttendanceStats {
  totalEligible: number;
  totalAttended: number;
  totalMissed: number;
  percentage: number;
}

export interface MemberAttendanceItem {
  session: Session;
  status: 'Presente' | 'Falta';
  attendance?: AttendanceRecord;
}

export interface MemberAttendanceBreakdown extends MemberAttendanceStats {
  items: MemberAttendanceItem[];
}

/**
 * Checks if a member of a given degree level can attend a session of a given degree level.
 * In Masonic Law, a higher or equal degree can attend sessions up to their degree.
 * Degree 1 (Aprendiz) -> Can attend Grau 1
 * Degree 2 (Companheiro) -> Can attend Grau 1 and 2
 * Degree 3 (Mestre) -> Can attend Grau 1, 2, and 3
 */
export function canDegreeAttend(
  memberDegreeLevel: MasonicDegreeLevel | number,
  sessionDegreeLevel: MasonicDegreeLevel | number
): boolean {
  return memberDegreeLevel >= sessionDegreeLevel;
}

/**
 * Sorts sessions in descending order by creation/date.
 */
export function sortSessionsByCreationDesc(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (timeDiff !== 0) return timeDiff;
    }
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`).getTime();
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`).getTime();
    return dateB - dateA;
  });
}

/**
 * Calculates statistics for a given session.
 */
export function calculateSessionStats(
  session: Session,
  members: Member[],
  attendances: AttendanceRecord[],
  visitors: VisitorRecord[] = []
): SessionStats {
  // Eligible members: active members with degree >= session.degreeLevel
  const eligibleMembers = members.filter((m) => {
    const isEligibleDegree = canDegreeAttend(m.degreeLevel, session.degreeLevel);
    const isEligibleStatus = m.status === 'Regular' || m.status === 'Remido' || m.status === 'Emérito';
    return isEligibleDegree && isEligibleStatus;
  });

  const sessionAttendances = attendances.filter((a) => a.sessionId === session.id);
  const presentMemberIds = new Set(sessionAttendances.map((a) => a.memberId));

  const totalEligible = eligibleMembers.length;
  const totalPresentMembers = eligibleMembers.filter((m) => presentMemberIds.has(m.id)).length;
  const totalVisitors = visitors.filter((v) => v.sessionId === session.id).length;
  const totalAbsent = Math.max(0, totalEligible - totalPresentMembers);
  const percentagePresent = totalEligible > 0 ? Math.round((totalPresentMembers / totalEligible) * 100) : 0;

  return {
    totalEligible,
    totalPresentMembers,
    totalVisitors,
    totalAbsent,
    percentagePresent,
  };
}

/**
 * Calculates attendance statistics for a specific member across all eligible sessions.
 */
export function calculateMemberAttendance(
  memberOrId: Member | string,
  sessions: Session[],
  attendances: AttendanceRecord[]
): MemberAttendanceStats {
  const memberId = typeof memberOrId === 'string' ? memberOrId : memberOrId.id;
  const degreeLevel = typeof memberOrId === 'object' ? memberOrId.degreeLevel : 3;

  // Filter sessions that this member is eligible to attend (degreeLevel >= session.degreeLevel)
  const eligibleSessions = sessions.filter((s) => canDegreeAttend(degreeLevel, s.degreeLevel));
  const totalEligible = eligibleSessions.length;

  if (totalEligible === 0) {
    return {
      totalEligible: 0,
      totalAttended: 0,
      totalMissed: 0,
      percentage: 100,
    };
  }

  let totalAttended = 0;

  eligibleSessions.forEach((s) => {
    const wasPresent = attendances.some((a) => a.sessionId === s.id && a.memberId === memberId);
    if (wasPresent) {
      totalAttended++;
    }
  });

  const totalMissed = Math.max(0, totalEligible - totalAttended);
  const percentage = Math.round((totalAttended / totalEligible) * 100);

  return {
    totalEligible,
    totalAttended,
    totalMissed,
    percentage,
  };
}

/**
 * Returns a detailed breakdown of attendance session-by-session for a specific member.
 */
export function getMemberAttendanceBreakdown(
  member: Member,
  sessions: Session[],
  attendances: AttendanceRecord[]
): MemberAttendanceBreakdown {
  const stats = calculateMemberAttendance(member, sessions, attendances);
  const eligibleSessions = sortSessionsByCreationDesc(
    sessions.filter((s) => canDegreeAttend(member.degreeLevel, s.degreeLevel))
  );

  const items: MemberAttendanceItem[] = eligibleSessions.map((session) => {
    const att = attendances.find((a) => a.sessionId === session.id && a.memberId === member.id);
    const status: 'Presente' | 'Falta' = att ? 'Presente' : 'Falta';

    return {
      session,
      status,
      attendance: att,
    };
  });

  return {
    ...stats,
    items,
  };
}

/**
 * Detects inactivity / consecutive absences alerts for lodge members (3 or more consecutive absences).
 */
export function detectInactivityAlerts(
  members: Member[],
  sessions: Session[],
  attendances: AttendanceRecord[]
): InactivityAlert[] {
  const alerts: InactivityAlert[] = [];
  const sortedSessions = sortSessionsByCreationDesc(sessions);

  members.forEach((member) => {
    // Only check active members
    if (member.status !== 'Regular') return;

    const eligibleSessions = sortedSessions.filter((s) =>
      canDegreeAttend(member.degreeLevel, s.degreeLevel)
    );

    let consecutiveAbsences = 0;
    const missedSessionIds: string[] = [];
    let lastAttendedDate: string | undefined;

    for (const session of eligibleSessions) {
      const wasPresent = attendances.some(
        (a) => a.sessionId === session.id && a.memberId === member.id
      );

      if (wasPresent) {
        if (!lastAttendedDate) {
          lastAttendedDate = session.date;
        }
        break; // Stop counting consecutive missed sessions at the most recent attendance
      } else {
        consecutiveAbsences++;
        missedSessionIds.push(session.id);
      }
    }

    if (consecutiveAbsences >= 3) {
      alerts.push({
        memberId: member.id,
        consecutiveAbsences,
        missedSessionIds,
        lastAttendedDate,
      });
    }
  });

  return alerts;
}
