/** CSV headers for subject-wise and section-wise attendance exports (opens in Excel). */
export const ATTENDANCE_REPORT_CSV_HEADERS = [
  'Roll number',
  'Name',
  'Branch',
  'Year',
  'Section',
  'Subject',
  'Total number of attended hours',
  'Total number of hours',
] as const;

export type AttendanceRecordForAgg = {
  student: number;
  subject: string;
  status: string;
  hours?: number | null;
  total_hours?: number | null;
};

/**
 * One row per (student, subject): sums attended hours and scheduled/total hours across all matching records.
 */
export function aggregateAttendanceHoursByStudentSubject(
  records: AttendanceRecordForAgg[],
): Array<{ studentId: number; subject: string; attended: number; total: number }> {
  const map = new Map<string, { studentId: number; subject: string; attended: number; total: number }>();
  for (const r of records) {
    const subj = (r.subject || '').trim();
    const key = `${r.student}|${subj}`;
    const sessionTotal = r.total_hours != null && Number(r.total_hours) > 0 ? Number(r.total_hours) : 1;
    const attended =
      r.hours != null
        ? Number(r.hours)
        : r.status?.toLowerCase() === 'present'
          ? sessionTotal
          : 0;
    const cur = map.get(key);
    if (cur) {
      cur.attended += attended;
      cur.total += sessionTotal;
    } else {
      map.set(key, { studentId: r.student, subject: subj, attended, total: sessionTotal });
    }
  }
  return [...map.values()];
}
