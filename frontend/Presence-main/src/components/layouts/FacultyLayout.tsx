import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BookOpen,
  Users,
  Calendar as CalendarIcon,
  Save,
  Download,
  LogOut,
  GraduationCap,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  RefreshCw,
  Lock,
  TrendingUp,
  AlertTriangle,
  FileDown,
  Edit,
  UserCircle,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { formatStudentSectionsDisplay, studentMatchesAnySection } from '@/lib/studentSections';

type ApiSubject = { id: number; name: string; code: string; department_code: string; year?: string; semester?: string };

const SAT_YEAR_OPTIONS = ['1', '2', '3', '4'] as const;

export const FacultyLayout: React.FC = () => {
  const { user, logout, updateSessionUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBranches, setSelectedBranches] = useState<string[]>(['__all__']);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('__all__');
  const [selectedSemester, setSelectedSemester] = useState<string>('__all__');
  const [apiDepartments, setApiDepartments] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, number>>({});
  const [sessionTotalHours, setSessionTotalHours] = useState<number>(1);
  const [apiStudents, setApiStudents] = useState<Array<{ id: number; full_name: string | null; roll_number: string | null; email: string; department: string | null; section: string | null; sections?: string[]; year: string | null; is_detained?: boolean }>>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<Array<{ student: number; subject: string; date: string; status: string; hours?: number | null; total_hours?: number | null }>>([]);
  const [apiSubjects, setApiSubjects] = useState<ApiSubject[]>([]);
  const [apiSections, setApiSections] = useState<Array<{ id: number; name: string }>>([]);
  const [isUploadingAttendance, setIsUploadingAttendance] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [apiProfile, setApiProfile] = useState<{
    full_name?: string | null;
    phone?: string | null;
    username?: string | null;
    email?: string | null;
    departments?: string[];
    subjects?: string[];
  } | null>(null);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileEditForm, setProfileEditForm] = useState({ full_name: '', phone: '', username: '', email: '' });

  /** Student Attendance tab — multi-select filters (independent from Mark Attendance) */
  const [satSelectedBranches, setSatSelectedBranches] = useState<string[]>(['__all__']);
  const [satSelectedYears, setSatSelectedYears] = useState<string[]>([]);
  const [satSelectedSections, setSatSelectedSections] = useState<string[]>([]);
  const [satSelectedSubjectIds, setSatSelectedSubjectIds] = useState<string[]>([]);

  const facultyId = user?.id && /^\d+$/.test(String(user.id)) ? Number(user.id) : null;

  // Faculty departments from logged-in user (backend sends department as comma-separated on login)
  const facultyDeptCodes = (user?.departmentId ?? '')
    .toString()
    .split(',')
    .map((d: string) => d.trim())
    .filter(Boolean);

  const selectedBranchCodes = selectedBranches.includes('__all__')
    ? facultyDeptCodes
    : selectedBranches;

  // Subjects: from API, filtered by faculty's department(s) and selected branch(es)
  const subjectsAll = facultyDeptCodes.length > 0 && apiSubjects.length > 0
    ? apiSubjects.filter((s: { department_code?: string }) => facultyDeptCodes.includes(s.department_code ?? ''))
    : apiSubjects;
  const subjectsByBranch = selectedBranchCodes.length > 0
    ? subjectsAll.filter((s: { department_code?: string }) => selectedBranchCodes.includes(s.department_code ?? ''))
    : subjectsAll;
  const subjects = selectedSemester && selectedSemester !== '__all__'
    ? subjectsByBranch.filter((s: { semester?: string }) => String(s.semester ?? '1') === selectedSemester)
    : subjectsByBranch;
  const facultyBranchOptions = apiDepartments.filter((d: { code: string }) => facultyDeptCodes.includes(d.code));

  const satBranchCodes = useMemo(() => {
    if (satSelectedBranches.includes('__all__') || satSelectedBranches.length === 0) return facultyDeptCodes;
    return satSelectedBranches.filter((b) => b !== '__all__');
  }, [satSelectedBranches, facultyDeptCodes.join(',')]);

  const satSubjectOptions = useMemo(() => {
    return subjectsAll.filter((s) => {
      if (satBranchCodes.length > 0 && !satBranchCodes.includes(s.department_code ?? '')) return false;
      if (satSelectedYears.length > 0 && !satSelectedYears.includes(String(s.year ?? '1'))) return false;
      return true;
    });
  }, [subjectsAll, satBranchCodes.join(','), satSelectedYears.join(',')]);

  const satSubjectsForColumns = useMemo(() => {
    if (satSelectedSubjectIds.length === 0) return satSubjectOptions;
    const idSet = new Set(satSelectedSubjectIds);
    return satSubjectOptions.filter((s) => idSet.has(String(s.id)));
  }, [satSubjectOptions, satSelectedSubjectIds.join(',')]);

  const satStudentsRows = useMemo(() => {
    return apiStudents
      .filter((s) => !s.is_detained)
      .filter((s) => facultyDeptCodes.length === 0 || facultyDeptCodes.includes(s.department ?? ''))
      .filter((s) => satBranchCodes.length === 0 || satBranchCodes.includes(s.department ?? ''))
      .filter((s) => {
        if (satSelectedYears.length === 0) return true;
        const y = (s.year ?? '').toString().trim();
        return satSelectedYears.includes(y);
      })
      .filter((s) => satSelectedSections.length === 0 || studentMatchesAnySection(s, satSelectedSections))
      .map((s) => ({
        id: String(s.id),
        name: s.full_name || s.roll_number || '',
        rollNumber: s.roll_number || '',
        email: s.email,
        departmentId: s.department || '',
        section: s.section || '',
        year: s.year ? Number(s.year) : 0,
      }));
  }, [apiStudents, facultyDeptCodes.join(','), satBranchCodes.join(','), satSelectedYears.join(','), satSelectedSections.join(',')]);

  useEffect(() => {
    fetch(apiUrl('/api/subjects/'), { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then((data: unknown) => setApiSubjects(Array.isArray(data) ? data : []))
      .catch(() => setApiSubjects([]));
  }, []);

  useEffect(() => {
    fetch(apiUrl('/api/sections/'), { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then((data: unknown) => setApiSections(Array.isArray(data) ? data : []))
      .catch(() => setApiSections([]));
  }, []);

  useEffect(() => {
    fetch(apiUrl('/api/departments/'), { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then((data: unknown) => setApiDepartments(Array.isArray(data) ? data : []))
      .catch(() => setApiDepartments([]));
  }, []);

  useEffect(() => {
    if (facultyDeptCodes.length === 1 && (selectedBranches.length === 0 || selectedBranches.includes('__all__'))) {
      setSelectedBranches([facultyDeptCodes[0]]);
    }
  }, [facultyDeptCodes.length, selectedBranches.length]);

  useEffect(() => {
    if (facultyDeptCodes.length === 0) {
      setApiStudents([]);
      return;
    }
    setStudentsLoading(true);
    const params = new URLSearchParams({ role: 'student' });
    if (activeTab === 'student-attendance') {
      if (satBranchCodes.length === 1) params.set('department', satBranchCodes[0]);
      if (satSelectedYears.length === 1) params.set('year', satSelectedYears[0]);
    } else {
      if (selectedBranchCodes.length === 1) params.set('department', selectedBranchCodes[0]);
      if (selectedYear && selectedYear !== '__all__') params.set('year', selectedYear);
    }
    fetch(apiUrl(`/api/users/?${params}`), { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then((data: unknown) => setApiStudents(Array.isArray(data) ? data : []))
      .catch(() => setApiStudents([]))
      .finally(() => setStudentsLoading(false));
  }, [facultyDeptCodes.length, activeTab, selectedBranchCodes.join(','), selectedYear, satBranchCodes.join(','), satSelectedYears.join(',')]);

  useEffect(() => {
    if (user?.role !== 'faculty' && user?.role !== 'admin') return;
    fetch(apiUrl('/api/attendance/'), { credentials: 'include' })
      .then(res => res.ok ? res.json() : { records: [] })
      .then((data: { records?: Array<{ student: number; subject: string; date: string; status: string; hours?: number | null; total_hours?: number | null }> }) => setAttendanceRecords(data?.records ?? []))
      .catch(() => setAttendanceRecords([]));
  }, [user?.role, activeTab]);

  const studentsInSection = apiStudents
    .filter(s => !s.is_detained)
    .map(s => ({ id: String(s.id), name: s.full_name || s.roll_number || '', rollNumber: s.roll_number || '', email: s.email, departmentId: s.department || '', section: s.section || '', year: s.year ? Number(s.year) : 0 }))
    .filter(s => (selectedBranchCodes.length === 0 || selectedBranchCodes.includes(s.departmentId)))
    .filter(s => studentMatchesAnySection(s, selectedSections));

  // Pre-fill attendance checkboxes when one subject is selected.
  const selectedSubjectObjs = subjects.filter(s => selectedSubjects.includes(String(s.id)));
  const selectedSubjectCodes = selectedSubjectObjs.map(s => (s.code ?? '').trim().toLowerCase()).filter(Boolean);
  const selectedSubjectNames = selectedSubjectObjs.map(s => (s.name ?? '').trim().toLowerCase()).filter(Boolean);
  const studentsInSectionKey = studentsInSection.map(s => s.id).join(',');
  useEffect(() => {
    if (selectedSubjects.length !== 1 || selectedSections.length === 0) {
      setAttendanceData({});
      return;
    }
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const initial: Record<string, number> = {};
    let sessionTotal = sessionTotalHours;
    const subjectMatches = (s: string) => {
      if (!s) return false;
      const t = s.trim().toLowerCase();
      return selectedSubjectCodes.includes(t) || selectedSubjectNames.includes(t);
    };
    studentsInSection.forEach(student => {
      const record = attendanceRecords.find(
        r => (r.date === dateStr || (r.date && r.date.slice(0, 10) === dateStr)) && subjectMatches(r.subject ?? '') && Number(r.student) === Number(student.id)
      );
      if (record) {
        const th = record.total_hours != null && record.total_hours > 0 ? Number(record.total_hours) : 1;
        if (sessionTotal === sessionTotalHours) sessionTotal = th;
        const h = record.hours != null ? Number(record.hours) : (record.status?.toLowerCase() === 'present' ? th : 0);
        initial[student.id] = Math.min(h, th);
      } else {
        initial[student.id] = 0;
      }
    });
    setAttendanceData(initial);
    if (sessionTotal !== sessionTotalHours && sessionTotal >= 1) setSessionTotalHours(sessionTotal);
  }, [selectedDate, selectedSubjects.join(','), selectedSections.join(','), selectedSubjectCodes.join(','), selectedSubjectNames.join(','), attendanceRecords, studentsInSectionKey]);

  const handleAttendanceChange = (studentId: string, isPresent: boolean) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: isPresent ? sessionTotalHours : 0 }));
  };
  const handleAttendanceHoursChange = (studentId: string, hours: number) => {
    const val = Math.max(0, Math.min(sessionTotalHours, hours));
    setAttendanceData(prev => ({ ...prev, [studentId]: val }));
  };

  const handleSaveAttendance = async () => {
    if (selectedSubjects.length === 0 || selectedSections.length === 0) {
      toast({ title: 'Error', description: 'Please select at least one subject and one section.', variant: 'destructive' });
      return;
    }
    const codesToSend = subjects
      .filter(s => selectedSubjects.includes(String(s.id)))
      .map(s => s.code)
      .filter(Boolean);
    if (codesToSend.length === 0) {
      toast({ title: 'Error', description: 'Invalid subject selection.', variant: 'destructive' });
      return;
    }
    if (studentsInSection.length === 0) {
      toast({ title: 'No students', description: 'No students in this section. Check department/section filters or add students in Admin.', variant: 'destructive' });
      return;
    }
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const payload = codesToSend.flatMap(codeToSend =>
      studentsInSection.map(student => {
        const hours = attendanceData[student.id] ?? 0;
        return {
          student: Number(student.id),
          subject: codeToSend,
          date: dateStr,
          status: hours > 0 ? 'present' : 'absent',
          hours,
          total_hours: sessionTotalHours,
        };
      })
    );
    try {
      const res = await fetch(apiUrl('/api/attendance/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data.detail === 'string' ? data.detail : (data.errors ? JSON.stringify(data.errors) : 'Please try again.');
        toast({ title: 'Failed to save', description: String(msg), variant: 'destructive' });
        return;
      }
      fetch(apiUrl('/api/attendance/'), { credentials: 'include' })
        .then(r => r.ok ? r.json() : { records: [] })
        .then((d: { records?: Array<{ student: number; subject: string; date: string; status: string; hours?: number | null; total_hours?: number | null }> }) => setAttendanceRecords(d?.records ?? []))
        .catch(() => {});
      const savedCount = typeof data.created === 'number' ? data.created : payload.length;
      const errList = Array.isArray(data.errors) ? data.errors : [];
      if (errList.length > 0) {
        toast({
          title: savedCount > 0 ? 'Partially saved' : 'Save failed',
          description: savedCount > 0
            ? `Saved ${savedCount} students. ${errList.length} row(s) had errors.`
            : `${errList.length} row(s) had errors. Check student IDs and date format.`,
          variant: savedCount > 0 ? 'default' : 'destructive',
        });
      } else {
        toast({ title: 'Success', description: `Attendance saved for ${savedCount} students.` });
      }
    } catch {
      toast({ title: 'Failed to save', description: 'Network error.', variant: 'destructive' });
      return;
    }
    setAttendanceData({});
  };

  const handleSelectAll = (isPresent: boolean) => {
    const val = isPresent ? sessionTotalHours : 0;
    const newData: Record<string, number> = {};
    studentsInSection.forEach(student => { newData[student.id] = val; });
    setAttendanceData(newData);
  };

  const getAttendanceStats = () => {
    const totalStudents = studentsInSection.length;
    const presentCount = studentsInSection.filter(s => (attendanceData[s.id] ?? 0) > 0).length;
    const absentCount = totalStudents - presentCount;
    return { totalStudents, presentCount, absentCount };
  };

  const stats = getAttendanceStats();

  const studentIdToInfo = Object.fromEntries(apiStudents.map(s => [s.id, { name: s.full_name || s.roll_number || '', roll: s.roll_number || '', section: formatStudentSectionsDisplay(s).replace(/^–$/, '') }]));

  const downloadCsv = (filename: string, rows: string[][]) => {
    const header = rows[0];
    const body = rows.slice(1);
    const csv = [header.join(','), ...body.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadSubjectWise = () => {
    const rows: string[][] = [['Subject', 'Date', 'Roll No', 'Student Name', 'Section', 'Status']];
    const sorted = [...attendanceRecords].sort((a, b) => (a.subject || '').localeCompare(b.subject || '') || (a.date || '').localeCompare(b.date || ''));
    sorted.forEach(r => {
      const info = studentIdToInfo[r.student];
      rows.push([
        r.subject || '',
        r.date || '',
        info?.roll ?? '',
        info?.name ?? '',
        info?.section ?? '',
        r.status || ''
      ]);
    });
    if (rows.length <= 1) {
      toast({ title: 'No data', description: 'No attendance records to download.', variant: 'destructive' });
      return;
    }
    downloadCsv(`attendance_subject_wise_${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    toast({ title: 'Downloaded', description: 'Subject-wise report downloaded.' });
  };

  const handleDownloadSectionWise = () => {
    const rows: string[][] = [['Section', 'Subject', 'Date', 'Roll No', 'Student Name', 'Status']];
    const sorted = [...attendanceRecords].sort((a, b) => {
      const secA = studentIdToInfo[a.student]?.section ?? '';
      const secB = studentIdToInfo[b.student]?.section ?? '';
      return secA.localeCompare(secB) || (a.date || '').localeCompare(b.date || '') || (a.subject || '').localeCompare(b.subject || '');
    });
    sorted.forEach(r => {
      const info = studentIdToInfo[r.student];
      rows.push([
        info?.section ?? '',
        r.subject || '',
        r.date || '',
        info?.roll ?? '',
        info?.name ?? '',
        r.status || ''
      ]);
    });
    if (rows.length <= 1) {
      toast({ title: 'No data', description: 'No attendance records to download.', variant: 'destructive' });
      return;
    }
    downloadCsv(`attendance_section_wise_${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    toast({ title: 'Downloaded', description: 'Section-wise report downloaded.' });
  };

  const handleAttendanceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingAttendance(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(apiUrl('/api/attendance/bulk-upload/'), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          toast({
            title: 'Permission denied',
            description: 'You are not allowed to upload attendance. Log in as Faculty or Admin.',
            variant: 'destructive',
          });
          return;
        }
        const msg =
          (data && (data.detail || data.error)) ||
          'Upload failed. Use columns: roll_number, subject, date; and either status or attended_hours + total_hours.';
        toast({ title: 'Upload failed', description: String(msg), variant: 'destructive' });
        return;
      }

      const created = typeof data.created === 'number' ? data.created : 0;
      const skippedExisting = typeof data.skipped_existing === 'number' ? data.skipped_existing : 0;
      const skippedMissingStudent =
        typeof data.skipped_missing_student === 'number' ? data.skipped_missing_student : 0;
      const skippedMissingSubject =
        typeof data.skipped_missing_subject === 'number' ? data.skipped_missing_subject : 0;
      const skippedInvalid = typeof data.skipped_invalid === 'number' ? data.skipped_invalid : 0;
      const totalSkipped = skippedExisting + skippedMissingStudent + skippedMissingSubject + skippedInvalid;
      const errors: Array<{ row: number; reason: string }> = Array.isArray(data.errors) ? data.errors : [];

      const parts = [`Created ${created} records.`];
      if (totalSkipped > 0) parts.push(`Skipped ${totalSkipped} rows.`);
      let description = parts.join(' ');
      if (errors.length > 0) {
        const detail = errors.slice(0, 5).map((e: { row: number; reason: string }) => `Row ${e.row}: ${e.reason}`).join('. ');
        description += (description ? ' ' : '') + (errors.length > 5 ? `${detail} (+${errors.length - 5} more)` : detail);
      } else if (totalSkipped > 0) {
        const why: string[] = [];
        if (skippedMissingStudent > 0) why.push(`${skippedMissingStudent} student not found`);
        if (skippedMissingSubject > 0) why.push(`${skippedMissingSubject} subject not found`);
        if (skippedInvalid > 0) why.push(`${skippedInvalid} invalid`);
        if (skippedExisting > 0) why.push(`${skippedExisting} already exist`);
        if (why.length) description += ' — ' + why.join('; ');
      }

      toast({
        title: created > 0 ? 'Bulk attendance upload completed' : 'No records created',
        description: description,
        variant: created === 0 && totalSkipped > 0 ? 'destructive' : 'default',
      });

      fetch(apiUrl('/api/attendance/'), { credentials: 'include' })
        .then(r => (r.ok ? r.json() : { records: [] }))
        .then((d: { records?: Array<{ student: number; subject: string; date: string; status: string }> }) =>
          setAttendanceRecords(d?.records ?? []),
        )
        .catch(() => {});
    } catch {
      toast({
        title: 'Upload failed',
        description: 'Network error while uploading attendance Excel file.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAttendance(false);
      event.target.value = '';
    }
  };

  /** Students and attendance rows scoped to this faculty's branch(es) — used for dashboard analytics */
  const facultyScopedStudents = useMemo(() => {
    if (facultyDeptCodes.length === 0) return apiStudents;
    return apiStudents.filter((s) => facultyDeptCodes.includes(s.department ?? ''));
  }, [apiStudents, facultyDeptCodes.join(',')]);

  const facultyScopedStudentIds = useMemo(
    () => new Set(facultyScopedStudents.map((s) => s.id)),
    [facultyScopedStudents],
  );

  const facultyScopedRecords = useMemo(
    () => attendanceRecords.filter((r) => facultyScopedStudentIds.has(r.student)),
    [attendanceRecords, facultyScopedStudentIds],
  );

  const facultyDashboardMetrics = useMemo(() => {
    const records = facultyScopedRecords;
    const presentCount = records.filter((r) => String(r.status).toLowerCase() === 'present').length;
    const totalClasses = records.length;
    const attendancePercentage =
      totalClasses > 0 ? Math.round((presentCount / totalClasses) * 10000) / 100 : 0;

    const byStudent: Record<number, { present: number; total: number }> = {};
    records.forEach((r) => {
      const id = r.student;
      if (!byStudent[id]) byStudent[id] = { present: 0, total: 0 };
      byStudent[id].total++;
      if (String(r.status).toLowerCase() === 'present') byStudent[id].present++;
    });
    let defaultersCount = 0;
    facultyScopedStudents.forEach((s) => {
      const stat = byStudent[s.id] || { present: 0, total: 0 };
      const pct = stat.total > 0 ? (stat.present / stat.total) * 100 : 0;
      if (pct < 85) defaultersCount++;
    });

    return {
      attendancePercentage,
      presentCount,
      totalClasses,
      defaultersCount,
    };
  }, [facultyScopedRecords, facultyScopedStudents]);

  const facultyWeeklyTrend = useMemo(() => {
    const records = facultyScopedRecords;
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const byDate: Record<string, { present: number; total: number }> = {};
    records.forEach((r) => {
      const d = r.date ?? '';
      if (!d) return;
      if (!byDate[d]) byDate[d] = { present: 0, total: 0 };
      byDate[d].total++;
      if (String(r.status).toLowerCase() === 'present') byDate[d].present++;
    });
    const byDayOfWeek: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    Object.entries(byDate).forEach(([dateStr, { present, total }]) => {
      if (total === 0) return;
      const pct = (present / total) * 100;
      try {
        const day = new Date(dateStr).getDay();
        byDayOfWeek[day].push(pct);
      } catch {
        // skip invalid date
      }
    });
    return dayNames.map((name, i) => {
      const dayIndex = i === 6 ? 0 : i + 1;
      const arr = byDayOfWeek[dayIndex] || [];
      const avg = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      return { name, attendance: Math.round(avg * 10) / 10 };
    });
  }, [facultyScopedRecords]);

  const facultyDistributionPie = useMemo(() => {
    const records = facultyScopedRecords;
    const byStudent: Record<number, { present: number; total: number }> = {};
    records.forEach((r) => {
      const id = r.student;
      if (!byStudent[id]) byStudent[id] = { present: 0, total: 0 };
      byStudent[id].total++;
      if (String(r.status).toLowerCase() === 'present') byStudent[id].present++;
    });
    const list = facultyScopedStudents;
    const studentsWithPct = list.map((s) => {
      const stat = byStudent[s.id] || { present: 0, total: 0 };
      return stat.total > 0 ? (stat.present / stat.total) * 100 : 0;
    });
    const buckets = [
      { label: '90–100%', min: 90, max: 101, color: 'hsl(142, 76%, 36%)' },
      { label: '75–90%', min: 75, max: 90, color: 'hsl(142, 56%, 51%)' },
      { label: '50–75%', min: 50, max: 75, color: 'hsl(38, 92%, 50%)' },
      { label: 'Below 50%', min: 0, max: 50, color: 'hsl(0, 84%, 60%)' },
    ];
    const counts = buckets.map((b) => studentsWithPct.filter((p) => p >= b.min && p < b.max).length);
    const totalStudents = list.length;
    return buckets
      .map((b, i) => ({
        name: b.label,
        value: totalStudents > 0 ? Math.round((counts[i] / totalStudents) * 100) : 0,
        color: b.color,
      }))
      .filter((d) => d.value > 0);
  }, [facultyScopedRecords, facultyScopedStudents]);

  useEffect(() => {
    if (facultyId == null || activeTab !== 'profile') return;
    fetch(apiUrl(`/api/users/${facultyId}/`), { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setApiProfile(data))
      .catch(() => setApiProfile(null));
  }, [facultyId, activeTab]);

  useEffect(() => {
    if (apiProfile) {
      setProfileEditForm({
        full_name: apiProfile.full_name || '',
        phone: apiProfile.phone || '',
        username: apiProfile.username || '',
        email: apiProfile.email || user?.email || '',
      });
    }
  }, [apiProfile, user?.email]);

  const handleSaveProfile = async () => {
    if (facultyId == null) return;
    try {
      const res = await fetch(apiUrl(`/api/users/${facultyId}/`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: profileEditForm.full_name,
          phone: profileEditForm.phone,
          username: profileEditForm.username || undefined,
          email: profileEditForm.email.trim() || undefined,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setApiProfile((prev) => (prev ? { ...prev, ...updated } : null));
        updateSessionUser({
          email: typeof updated.email === 'string' ? updated.email : profileEditForm.email.trim(),
          name: typeof updated.full_name === 'string' ? updated.full_name : profileEditForm.full_name,
        });
        setProfileEditOpen(false);
        toast({ title: 'Profile updated', description: 'Your details have been saved.' });
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err.detail === 'string' ? err.detail : 'Please try again.';
        toast({ title: 'Update failed', description: msg, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Update failed', description: 'Network error.', variant: 'destructive' });
    }
  };

  const handleFacultyChangePassword = async () => {
    if (facultyId == null) return;
    if (changePasswordForm.new_password !== changePasswordForm.confirm_password) {
      toast({ title: 'Passwords do not match', description: 'New password and confirm must match.', variant: 'destructive' });
      return;
    }
    if (changePasswordForm.new_password.length < 1) {
      toast({ title: 'Invalid password', description: 'Enter a new password.', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/users/${facultyId}/`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          current_password: changePasswordForm.current_password,
          new_password: changePasswordForm.new_password
        })
      });
      if (res.ok) {
        setChangePasswordOpen(false);
        setChangePasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        toast({ title: 'Password changed', description: 'Your password has been updated.' });
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err.current_password?.[0] || err.detail || 'Failed to change password.';
        toast({ title: 'Password change failed', description: String(msg), variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Password change failed', description: 'Network error.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-white/95 backdrop-blur-md shadow-soft">
        <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-foreground">{user?.name || 'Faculty'}</h1>
              <p className="text-sm text-muted-foreground">Welcome back</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setChangePasswordOpen(true)} className="rounded-xl flex-1 sm:flex-none">
              <Lock className="w-4 h-4 mr-2" />
              Change password
            </Button>
            <Button variant="outline" onClick={logout} className="rounded-xl flex-1 sm:flex-none">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex flex-wrap gap-1.5 h-auto p-1.5 rounded-xl bg-muted/80">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="attendance">Mark Attendance</TabsTrigger>
            <TabsTrigger value="student-attendance">Student Attendance</TabsTrigger>
            <TabsTrigger value="reports">My Reports</TabsTrigger>
            <TabsTrigger value="subjects">My Subjects</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Dashboard — scoped to your branch(es), aligned with admin portal layout */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card className="overflow-hidden transition-all duration-300 hover:shadow-card-hover border-emerald-200/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">My students</CardTitle>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{studentsLoading ? '…' : facultyScopedStudents.length}</div>
                  <p className="text-xs text-muted-foreground">In your assigned branch(es)</p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden transition-all duration-300 hover:shadow-card-hover border-teal-200/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">My subjects</CardTitle>
                  <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-teal-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{subjectsAll.length}</div>
                  <p className="text-xs text-muted-foreground">Across your departments</p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden transition-all duration-300 hover:shadow-card-hover border-cyan-200/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Attendance (your scope)</CardTitle>
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-cyan-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {facultyDashboardMetrics.totalClasses > 0 ? `${facultyDashboardMetrics.attendancePercentage}%` : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {facultyDashboardMetrics.totalClasses > 0
                      ? `${facultyDashboardMetrics.presentCount} / ${facultyDashboardMetrics.totalClasses} records`
                      : 'No attendance data yet for your students'}
                  </p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden transition-all duration-300 hover:shadow-card-hover border-amber-200/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Defaulters</CardTitle>
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{facultyDashboardMetrics.defaultersCount}</div>
                  <p className="text-xs text-muted-foreground">Your students below 85%</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button className="rounded-xl" onClick={() => setActiveTab('attendance')}>
                <CalendarIcon className="w-4 h-4 mr-2" />
                Mark attendance
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => setActiveTab('student-attendance')}>
                <Users className="w-4 h-4 mr-2" />
                Student attendance table
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => setActiveTab('reports')}>
                <FileDown className="w-4 h-4 mr-2" />
                Reports & upload
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly attendance trend</CardTitle>
                  <CardDescription>Average attendance % by weekday (your students only)</CardDescription>
                </CardHeader>
                <CardContent>
                  {facultyScopedRecords.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">No trend data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={facultyWeeklyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="attendance" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Attendance distribution</CardTitle>
                  <CardDescription>Share of your students by attendance band</CardDescription>
                </CardHeader>
                <CardContent>
                  {facultyDistributionPie.length === 0 || facultyScopedStudents.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">No distribution data yet</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={facultyDistributionPie}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {facultyDistributionPie.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 space-y-2">
                        {facultyDistributionPie.map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                              {item.name}
                            </div>
                            <span className="font-medium">{item.value}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6 mt-6">
            {/* Controls */}
            <Card className="border-emerald-200/50">
              <CardHeader>
                <CardTitle>Mark Attendance</CardTitle>
                <CardDescription>Students are listed by your branch and selected year & section. Select branch, date, year, semester, subject, and section.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Branch</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          {selectedBranches.includes('__all__')
                            ? 'All branches'
                            : selectedBranches.length > 0
                              ? `${selectedBranches.length} selected`
                              : 'Select branch(es)'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-3">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="branch-all"
                              checked={selectedBranches.includes('__all__')}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedBranches(['__all__']);
                                } else {
                                  setSelectedBranches([]);
                                }
                                setSelectedSubjects([]);
                              }}
                            />
                            <label htmlFor="branch-all" className="text-sm font-medium cursor-pointer">All branches</label>
                          </div>
                          {facultyBranchOptions.map((d: { id: number; code: string; name: string }) => (
                            <div key={d.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`branch-${d.id}`}
                                checked={selectedBranches.includes('__all__') || selectedBranches.includes(d.code)}
                                onCheckedChange={(checked) => {
                                  const current = selectedBranches.includes('__all__') ? [] : selectedBranches;
                                  const next = checked
                                    ? [...current, d.code]
                                    : current.filter((v) => v !== d.code);
                                  setSelectedBranches(next);
                                  setSelectedSubjects([]);
                                }}
                              />
                              <label htmlFor={`branch-${d.id}`} className="text-sm cursor-pointer">
                                {d.code} – {d.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !selectedDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Year</label>
                    <Select value={selectedYear || '__all__'} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="All years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All years</SelectItem>
                        <SelectItem value="1">Year 1</SelectItem>
                        <SelectItem value="2">Year 2</SelectItem>
                        <SelectItem value="3">Year 3</SelectItem>
                        <SelectItem value="4">Year 4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Semester</label>
                    <Select value={selectedSemester || '__all__'} onValueChange={setSelectedSemester}>
                      <SelectTrigger>
                        <SelectValue placeholder="All semesters" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All semesters</SelectItem>
                        <SelectItem value="1">Sem 1</SelectItem>
                        <SelectItem value="2">Sem 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          {selectedSubjects.length > 0 ? `${selectedSubjects.length} selected` : 'Select subject(s)'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-3 max-h-72 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Quick actions</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setSelectedSubjects(subjects.map(s => String(s.id)))}>Select all</Button>
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setSelectedSubjects([])}>Clear all</Button>
                          </div>
                        </div>
                        {subjects.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            {facultyDeptCodes.length === 0 ? 'No departments assigned / log in again' : 'No subjects for selected branch(es).'}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {subjects.map((subject: { id: string | number; name: string; code: string }) => {
                              const id = String(subject.id);
                              return (
                                <div key={id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`subject-${id}`}
                                    checked={selectedSubjects.includes(id)}
                                    onCheckedChange={(checked) => {
                                      const next = checked
                                        ? [...selectedSubjects, id]
                                        : selectedSubjects.filter((v) => v !== id);
                                      setSelectedSubjects(next);
                                    }}
                                  />
                                  <label htmlFor={`subject-${id}`} className="text-sm cursor-pointer">
                                    {subject.name} ({subject.code})
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Section</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          {selectedSections.length > 0 ? `${selectedSections.length} selected` : 'Select section(s)'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Quick actions</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setSelectedSections((apiSections || []).map(s => s.name))}>Select all</Button>
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setSelectedSections([])}>Clear all</Button>
                          </div>
                        </div>
                        {(apiSections || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No sections – add in Admin</p>
                        ) : (
                          <div className="space-y-2">
                            {(apiSections || []).map((s: { id: number; name: string }) => (
                              <div key={s.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`section-${s.id}`}
                                  checked={selectedSections.includes(s.name)}
                                  onCheckedChange={(checked) => {
                                    const next = checked
                                      ? [...selectedSections, s.name]
                                      : selectedSections.filter((v) => v !== s.name);
                                    setSelectedSections(next);
                                  }}
                                />
                                <label htmlFor={`section-${s.id}`} className="text-sm cursor-pointer">{s.name}</label>
                              </div>
                            ))}
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Total hours (this class)</label>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={sessionTotalHours}
                      onChange={e => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v >= 1 && v <= 24) {
                          setSessionTotalHours(v);
                          setAttendanceData(prev => {
                            const next = { ...prev };
                            studentsInSection.forEach(s => {
                              const current = next[s.id] ?? 0;
                              next[s.id] = Math.min(current, v);
                            });
                            return next;
                          });
                        }
                      }}
                      className="w-20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quick Actions</label>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSelectAll(true)}
                        className="flex-1"
                      >
                        All Present ({sessionTotalHours} hr)
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSelectAll(false)}
                        className="flex-1"
                      >
                        All Absent
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                {studentsInSection.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 bg-primary/10 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{stats.totalStudents}</div>
                      <div className="text-sm text-muted-foreground">Total Students</div>
                    </div>
                    <div className="text-center p-4 bg-success/10 rounded-lg">
                      <div className="text-2xl font-bold text-success">{stats.presentCount}</div>
                      <div className="text-sm text-muted-foreground">Present</div>
                    </div>
                    <div className="text-center p-4 bg-destructive/10 rounded-lg">
                      <div className="text-2xl font-bold text-destructive">{stats.absentCount}</div>
                      <div className="text-sm text-muted-foreground">Absent</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Student List */}
            {selectedSubjects.length > 0 && selectedSections.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Students in Sections: {selectedSections.join(', ')}</CardTitle>
                    <CardDescription>
                      {selectedSubjectObjs.map(s => s.name).join(', ')} - {format(selectedDate, 'PPP')} · {sessionTotalHours} hour(s)
                    </CardDescription>
                  </div>
                  <Button onClick={handleSaveAttendance} disabled={studentsInSection.length === 0}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Attendance
                  </Button>
                </CardHeader>
                <CardContent>
                  {studentsLoading ? (
                    <p className="text-muted-foreground">Loading student list…</p>
                  ) : studentsInSection.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No students in this section. Students are assigned to class and branch when they register.</p>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {studentsInSection.map((student, index) => {
                        const attended = attendanceData[student.id] ?? 0;
                        return (
                          <div
                            key={student.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 flex-wrap gap-2"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-medium">{student.name}</div>
                                <div className="text-sm text-muted-foreground">{student.rollNumber}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`present-${student.id}`}
                                  checked={attended >= sessionTotalHours}
                                  onCheckedChange={(checked) => 
                                    handleAttendanceChange(student.id, checked === true)
                                  }
                                />
                                <label 
                                  htmlFor={`present-${student.id}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  Present
                                </label>
                              </div>
                            
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`absent-${student.id}`}
                                  checked={attended === 0}
                                  onCheckedChange={(checked) => 
                                    handleAttendanceChange(student.id, checked !== true)
                                  }
                                />
                                <label 
                                  htmlFor={`absent-${student.id}`}
                                  className="text-sm font-medium cursor-pointer"
                                >
                                  Absent
                                </label>
                              </div>
                              {sessionTotalHours > 1 && (
                                <div className="flex items-center gap-1">
                                  <label htmlFor={`hr-${student.id}`} className="text-sm text-muted-foreground">Attended (hrs):</label>
                                  <Input
                                    id={`hr-${student.id}`}
                                    type="number"
                                    min={0}
                                    max={sessionTotalHours}
                                    value={attended}
                                    onChange={e => handleAttendanceHoursChange(student.id, parseFloat(e.target.value) || 0)}
                                    className="w-16 h-8 text-center"
                                  />
                                  <span className="text-sm text-muted-foreground">/ {sessionTotalHours}</span>
                                </div>
                              )}
                              <div className="w-8 h-8 flex items-center justify-center">
                                {attended >= sessionTotalHours && <CheckCircle className="w-5 h-5 text-success" />}
                                {attended === 0 && <XCircle className="w-5 h-5 text-destructive" />}
                                {attended > 0 && attended < sessionTotalHours && <Clock className="w-5 h-5 text-muted-foreground" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Student Attendance: subject-wise and overall % */}
          <TabsContent value="student-attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Attendance by Subject</CardTitle>
                <CardDescription>
                  Filter by branch, year, section, and subject (multi-select). Overall % counts only the subjects shown in the table.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal rounded-xl">
                          {satSelectedBranches.includes('__all__') || satSelectedBranches.length === 0
                            ? 'All branches'
                            : satSelectedBranches.filter((b) => b !== '__all__').length > 0
                              ? `${satSelectedBranches.filter((b) => b !== '__all__').length} selected`
                              : 'Select branch(es)'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Quick actions</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { setSatSelectedBranches(['__all__']); setSatSelectedSubjectIds([]); }}>All</Button>
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { setSatSelectedBranches([]); setSatSelectedSubjectIds([]); }}>Clear</Button>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Checkbox
                            id="sat-branch-all"
                            checked={satSelectedBranches.includes('__all__') || satSelectedBranches.length === 0}
                            onCheckedChange={(c) => {
                              if (c) setSatSelectedBranches(['__all__']);
                              else setSatSelectedBranches([]);
                              setSatSelectedSubjectIds([]);
                            }}
                          />
                          <label htmlFor="sat-branch-all" className="text-sm font-medium cursor-pointer">All branches</label>
                        </div>
                        {facultyBranchOptions.map((d: { id: number; code: string; name: string }) => (
                          <div key={d.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`sat-branch-${d.id}`}
                              checked={satSelectedBranches.includes('__all__') || satSelectedBranches.includes(d.code)}
                              onCheckedChange={(checked) => {
                                const current = satSelectedBranches.includes('__all__') ? [] : satSelectedBranches.filter((b) => b !== '__all__');
                                const next = checked ? [...current, d.code] : current.filter((v) => v !== d.code);
                                setSatSelectedBranches(next);
                                setSatSelectedSubjectIds([]);
                              }}
                            />
                            <label htmlFor={`sat-branch-${d.id}`} className="text-sm cursor-pointer">{d.code} – {d.name}</label>
                          </div>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal rounded-xl">
                          {satSelectedYears.length === 0 ? 'All years' : `${satSelectedYears.length} selected`}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Quick actions</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { setSatSelectedYears([...SAT_YEAR_OPTIONS]); setSatSelectedSubjectIds([]); }}>All</Button>
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => { setSatSelectedYears([]); setSatSelectedSubjectIds([]); }}>Clear</Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {SAT_YEAR_OPTIONS.map((y) => (
                            <div key={y} className="flex items-center space-x-2">
                              <Checkbox
                                id={`sat-year-${y}`}
                                checked={satSelectedYears.includes(y)}
                                onCheckedChange={(checked) => {
                                  setSatSelectedYears((prev) => {
                                    const next = checked ? [...prev, y] : prev.filter((v) => v !== y);
                                    return next;
                                  });
                                  setSatSelectedSubjectIds([]);
                                }}
                              />
                              <label htmlFor={`sat-year-${y}`} className="text-sm cursor-pointer">Year {y}</label>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal rounded-xl">
                          {satSelectedSections.length === 0 ? 'All sections' : `${satSelectedSections.length} selected`}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3 max-h-72 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Quick actions</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setSatSelectedSections((apiSections || []).map((s) => s.name))}>All</Button>
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setSatSelectedSections([])}>Clear</Button>
                          </div>
                        </div>
                        {(apiSections || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No sections defined.</p>
                        ) : (
                          <div className="space-y-2">
                            {(apiSections || []).map((s: { id: number; name: string }) => (
                              <div key={s.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`sat-sec-${s.id}`}
                                  checked={satSelectedSections.includes(s.name)}
                                  onCheckedChange={(checked) => {
                                    setSatSelectedSections((prev) =>
                                      checked ? [...prev, s.name] : prev.filter((v) => v !== s.name),
                                    );
                                  }}
                                />
                                <label htmlFor={`sat-sec-${s.id}`} className="text-sm cursor-pointer">{s.name}</label>
                              </div>
                            ))}
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal rounded-xl">
                          {satSelectedSubjectIds.length === 0 ? 'All subjects (in scope)' : `${satSelectedSubjectIds.length} selected`}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-3 max-h-72 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Quick actions</span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={() => setSatSelectedSubjectIds(satSubjectOptions.map((s) => String(s.id)))}
                            >
                              All
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setSatSelectedSubjectIds([])}>Clear</Button>
                          </div>
                        </div>
                        {satSubjectOptions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No subjects for current branch/year filters.</p>
                        ) : (
                          <div className="space-y-2">
                            {satSubjectOptions.map((subject) => {
                              const id = String(subject.id);
                              const allIds = satSubjectOptions.map((s) => String(s.id));
                              const checked =
                                satSelectedSubjectIds.length === 0 || satSelectedSubjectIds.includes(id);
                              return (
                                <div key={id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`sat-subj-${id}`}
                                    checked={checked}
                                    onCheckedChange={(isChecked) => {
                                      if (satSelectedSubjectIds.length === 0) {
                                        if (!isChecked) setSatSelectedSubjectIds(allIds.filter((x) => x !== id));
                                        return;
                                      }
                                      if (isChecked) {
                                        const next = [...satSelectedSubjectIds, id];
                                        setSatSelectedSubjectIds(next.length >= allIds.length ? [] : next);
                                      } else {
                                        setSatSelectedSubjectIds(satSelectedSubjectIds.filter((v) => v !== id));
                                      }
                                    }}
                                  />
                                  <label htmlFor={`sat-subj-${id}`} className="text-sm cursor-pointer">
                                    {subject.name} ({subject.code})
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {studentsLoading ? (
                  <p className="text-muted-foreground">Loading students…</p>
                ) : satSubjectsForColumns.length === 0 ? (
                  <p className="text-muted-foreground">No subjects match the filters. Adjust branch or year, or clear subject filters.</p>
                ) : satStudentsRows.length === 0 ? (
                  <p className="text-muted-foreground">No students match the selected filters.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Student</th>
                          <th className="text-left p-2 font-medium">Roll No</th>
                          {satSubjectsForColumns.map((sub: { id: string | number; code: string }) => (
                            <th key={String(sub.id)} className="text-left p-2 font-medium">{sub.code} %</th>
                          ))}
                          <th className="text-left p-2 font-medium">Overall %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {satStudentsRows.map((student) => {
                          const sid = Number(student.id) || student.id;
                          const bySubject: Record<string, { present: number; total: number }> = {};
                          satSubjectsForColumns.forEach((sub: { code: string }) => {
                            bySubject[sub.code] = { present: 0, total: 0 };
                          });
                          let totalAll = 0;
                          let presentAll = 0;
                          attendanceRecords.filter((r) => String(r.student) === String(sid)).forEach((r) => {
                            const present = r.status?.toLowerCase() === 'present';
                            const rSub = (r.subject ?? '').trim();
                            const match = satSubjectsForColumns.find(
                              (sub: { code: string; name?: string }) =>
                                sub.code === rSub ||
                                sub.name === rSub ||
                                String(sub.code).toLowerCase() === rSub.toLowerCase() ||
                                String(sub.name ?? '').toLowerCase() === rSub.toLowerCase(),
                            );
                            if (match && bySubject[match.code]) {
                              bySubject[match.code].total++;
                              if (present) bySubject[match.code].present++;
                              totalAll++;
                              if (present) presentAll++;
                            }
                          });
                          return (
                            <tr key={student.id} className="border-b">
                              <td className="p-2">{student.name}</td>
                              <td className="p-2 font-mono">{student.rollNumber}</td>
                              {satSubjectsForColumns.map((sub: { id: string | number; code: string }) => {
                                const s = bySubject[sub.code];
                                const pct = s && s.total > 0 ? Math.round((s.present / s.total) * 100) : '–';
                                return <td key={String(sub.id)} className="p-2">{pct}</td>;
                              })}
                              <td className="p-2 font-medium">{totalAll > 0 ? Math.round((presentAll / totalAll) * 100) : '–'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Reports</CardTitle>
                <CardDescription>Download reports for your subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="h-auto p-4 flex-col" onClick={handleDownloadSubjectWise}>
                    <Download className="w-8 h-8 mb-2" />
                    <div className="text-center">
                      <div className="font-medium">Subject-wise Report</div>
                      <div className="text-sm text-muted-foreground">Download attendance by subject (CSV)</div>
                    </div>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex-col" onClick={handleDownloadSectionWise}>
                    <Download className="w-8 h-8 mb-2" />
                    <div className="text-center">
                      <div className="font-medium">Section-wise Report</div>
                      <div className="text-sm text-muted-foreground">Download attendance by section (CSV)</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Bulk Attendance Upload</CardTitle>
                <CardDescription>
                  Required: <code>roll_number</code>, <code>subject</code>, and <code>date</code> or <code>dates</code> (comma/semicolon separated). Use <code>attended_hours</code> + <code>total_hours</code> (single or multiple in same order as dates) or <code>status</code>. Duplicates skipped.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  The file is processed on the server. Existing attendance for the same student + subject + date is skipped.
                </p>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={handleAttendanceUpload}
                    disabled={isUploadingAttendance}
                    className="hidden"
                    id="attendance-bulk-upload"
                  />
                  <Button
                    asChild
                    variant="outline"
                    className="w-full md:w-auto"
                    disabled={isUploadingAttendance}
                  >
                    <label
                      htmlFor="attendance-bulk-upload"
                      className="cursor-pointer flex items-center justify-center"
                    >
                      {isUploadingAttendance ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Uploading attendance...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Attendance Excel
                        </>
                      )}
                    </label>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Make sure you are logged in as Faculty or Admin. If you are not logged in or use a wrong file
                  format, an error message will be shown.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Subjects</CardTitle>
                <CardDescription>Subjects assigned to you</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {subjects.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No subjects assigned yet.</p>
                      <p className="text-sm mt-1">Ask your admin to assign subjects in Admin → Manage Faculty → Edit your profile.</p>
                    </div>
                  ) : (
                    subjects.map((subject: { id: string | number; name: string; code: string; credits?: number }) => (
                      <div key={String(subject.id)} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <BookOpen className="w-8 h-8 text-primary" />
                          <div>
                            <div className="font-medium">{subject.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Code: {subject.code}{subject.credits != null ? ` • Credits: ${subject.credits}` : ''}
                            </div>
                          </div>
                        </div>
                        {subject.credits != null && <Badge variant="outline">{subject.credits} Credits</Badge>}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile */}
          <TabsContent value="profile" className="space-y-6 mt-6">
            <Card className="border-emerald-200/50">
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                    <UserCircle className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Your faculty account. Assigned subjects are managed by admin.</CardDescription>
                  </div>
                </div>
                {facultyId != null && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => {
                      setProfileEditForm({
                        full_name: apiProfile?.full_name || '',
                        phone: apiProfile?.phone || '',
                        username: apiProfile?.username || '',
                        email: apiProfile?.email || user?.email || '',
                      });
                      setProfileEditOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm text-muted-foreground">Username</label>
                    <p className="font-medium">{apiProfile?.username ?? '–'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Email</label>
                    <p className="font-medium">{apiProfile?.email ?? user?.email ?? '–'}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm text-muted-foreground">Full name</label>
                    <p className="font-medium">{apiProfile?.full_name ?? user?.name ?? '–'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Phone</label>
                    <p className="font-medium">{apiProfile?.phone ?? '–'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Branch(es)</label>
                    <p className="font-medium">
                      {apiProfile?.departments?.length
                        ? apiProfile.departments.join(', ')
                        : facultyDeptCodes.length
                          ? facultyDeptCodes.join(', ')
                          : '–'}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm text-muted-foreground">Assigned subjects (IDs/codes)</label>
                    <p className="font-medium text-sm leading-relaxed">
                      {apiProfile?.subjects?.length ? apiProfile.subjects.join(', ') : '–'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={profileEditOpen} onOpenChange={setProfileEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update your username, email, name, and phone.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Username</Label>
              <Input
                value={profileEditForm.username}
                onChange={(e) => setProfileEditForm((f) => ({ ...f, username: e.target.value.trim() }))}
                placeholder="Username (login)"
                autoComplete="username"
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={profileEditForm.email}
                onChange={(e) => setProfileEditForm((f) => ({ ...f, email: e.target.value.trim() }))}
                placeholder="Email"
                autoComplete="email"
              />
            </div>
            <div className="grid gap-2">
              <Label>Full name</Label>
              <Input
                value={profileEditForm.full_name}
                onChange={(e) => setProfileEditForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input
                value={profileEditForm.phone}
                onChange={(e) => setProfileEditForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Phone"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProfile} className="rounded-xl">
              <Save className="w-4 h-4 mr-2" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Current password</Label>
              <Input
                type="password"
                value={changePasswordForm.current_password}
                onChange={e => setChangePasswordForm(f => ({ ...f, current_password: e.target.value }))}
                placeholder="Current password"
              />
            </div>
            <div className="grid gap-2">
              <Label>New password</Label>
              <Input
                type="password"
                value={changePasswordForm.new_password}
                onChange={e => setChangePasswordForm(f => ({ ...f, new_password: e.target.value }))}
                placeholder="New password"
              />
            </div>
            <div className="grid gap-2">
              <Label>Confirm new password</Label>
              <Input
                type="password"
                value={changePasswordForm.confirm_password}
                onChange={e => setChangePasswordForm(f => ({ ...f, confirm_password: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>Cancel</Button>
            <Button onClick={handleFacultyChangePassword}>Change password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};