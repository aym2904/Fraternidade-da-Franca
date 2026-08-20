import { Member, Session, AttendanceRecord, Justification, InactivityAlert, MasonicDegreeLevel } from '../types/masonic';

export const DEGREE_NAMES: Record<MasonicDegreeLevel, string> = {
  1: 'Aprendiz',
  2: 'Companheiro',
  3: 'Mestre',
};

/**
 * Checks if member's degree level allows attending a session of a given degree level.
 * Rule: Member Degree Level >= Session Degree Level
 */
export function canDegreeAttend(memberDegreeLevel: MasonicDegreeLevel, sessionDegreeLevel: MasonicDegreeLevel): boolean {
  return memberDegreeLevel >= sessionDegreeLevel;
}

/**
 * Calculates attendance statistics for a specific member over all past finished sessions (or within last N sessions).
 */
export function calculateMemberAttendance(
  member: Member,
  sessions: Session[],
  attendances: AttendanceRecord[],
  justifications: Justification[]
) {
  // Only consider finished/inactive or past sessions
  const eligibleSessions = sessions.filter(
    (s) => canDegreeAttend(member.degreeLevel, s.degreeLevel) && (!s.active || s.date <= new Date().toISOString().split('T')[0])
  );

  if (eligibleSessions.length === 0) {
    return {
      totalEligible: 0,
      totalAttended: 0,
      totalJustified: 0,
      totalMissed: 0,
      percentage: 100,
    };
  }

  let totalAttended = 0;
  let totalJustified = 0;

  eligibleSessions.forEach((s) => {
    const isAttended = attendances.some((a) => a.sessionId === s.id && a.memberId === member.id);
    if (isAttended) {
      totalAttended++;
    } else {
      const isJustified = justifications.some(
        (j) => j.sessionId === s.id && j.memberId === member.id && j.status === 'Aprovado'
      );
      if (isJustified) {
        totalJustified++;
      }
    }
  });

  const totalMissed = eligibleSessions.length - totalAttended - totalJustified;
  // Regimental percentage calculation: (Attended + Justified) / Total
  const percentage = Math.round(((totalAttended + totalJustified) / eligibleSessions.length) * 100);

  return {
    totalEligible: eligibleSessions.length,
    totalAttended,
    totalJustified,
    totalMissed,
    percentage,
  };
}

/**
 * Detects members who have missed 3 or more CONSECUTIVE sessions without approved justification.
 * (Regulamento Geral alert)
 */
export function detectInactivityAlerts(
  members: Member[],
  sessions: Session[],
  attendances: AttendanceRecord[],
  justifications: Justification[]
): InactivityAlert[] {
  const alerts: InactivityAlert[] = [];

  // Sort past sessions by date descending
  const pastSessions = [...sessions]
    .filter((s) => s.date <= new Date().toISOString().split('T')[0])
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  members.forEach((member) => {
    if (member.status === 'Licenciado' || member.status === 'Placet' || member.status === 'Remido') {
      return; // License/Adormecido members exempted
    }

    // Filter sessions this member was eligible to attend
    const memberSessions = pastSessions.filter((s) => canDegreeAttend(member.degreeLevel, s.degreeLevel));

    let consecutiveAbsences = 0;
    const missedSessionIds: string[] = [];

    for (const session of memberSessions) {
      const attended = attendances.some((a) => a.sessionId === session.id && a.memberId === member.id);
      const justified = justifications.some(
        (j) => j.sessionId === session.id && j.memberId === member.id && j.status === 'Aprovado'
      );

      if (!attended && !justified) {
        consecutiveAbsences++;
        missedSessionIds.push(session.id);
      } else {
        // Streak broken
        break;
      }
    }

    if (consecutiveAbsences >= 3) {
      // Find last attended session date if any
      const lastAttendedAttendance = attendances
        .filter((a) => a.memberId === member.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

      let lastAttendedDate: string | undefined;
      if (lastAttendedAttendance) {
        const sess = sessions.find((s) => s.id === lastAttendedAttendance.sessionId);
        if (sess) lastAttendedDate = sess.date;
      }

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

/**
 * Calculates current real-time stats for a given session.
 */
export function calculateSessionStats(
  session: Session,
  members: Member[],
  attendances: AttendanceRecord[],
  visitors: any[],
  justifications: Justification[]
) {
  const eligibleMembers = members.filter(
    (m) => canDegreeAttend(m.degreeLevel, session.degreeLevel) && m.status !== 'Placet'
  );

  const sessionAttendances = attendances.filter((a) => a.sessionId === session.id);
  const sessionVisitors = visitors.filter((v) => v.sessionId === session.id);
  const sessionJustified = justifications.filter(
    (j) => j.sessionId === session.id && j.status === 'Aprovado'
  );

  const presentMemberIds = new Set(sessionAttendances.map((a) => a.memberId));
  const totalPresentMembers = presentMemberIds.size;
  const totalEligible = eligibleMembers.length;

  const percentagePresent = totalEligible > 0 ? Math.round((totalPresentMembers / totalEligible) * 100) : 0;

  return {
    totalEligible,
    totalPresentMembers,
    totalVisitors: sessionVisitors.length,
    totalJustified: sessionJustified.length,
    totalAbsent: Math.max(0, totalEligible - totalPresentMembers - sessionJustified.length),
    percentagePresent,
  };
}
