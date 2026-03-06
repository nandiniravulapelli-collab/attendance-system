import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

type ApiSubject = { id: number; name: string; code: string; department_code: string; year?: string; semester?: string };

export const FacultyLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('__all__');
  const [selectedSemester, setSelectedSemester] = useState<string>('__all__');
  const [attendanceData, setAttendanceData] = useState<Record<string, number>>({});
  const [sessionTotalHours, setSessionTotalHours] = useState<number>(1);
  const [apiStudents, setApiStudents] = useState<Array<{ id: number; full_name: string | null; roll_number: string | null; email: string; department: string | null; section: string | null; year: string | null }>>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<Array<{ student: number; subject: string; date: string; status: string; hours?: number | null; total_hours?: number | null }>>([]);
  const [apiSubjects, setApiSubjects] = useState<ApiSubject[]>([]);
  const [apiSections, setApiSections] = useState<Array<{ id: number; name: string }>>([]);
  const [isUploadingAttendance, setIsUploadingAttendance] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  const facultyId = user?.id && /^\d+$/.test(String(user.id)) ? Number(user.id) : null;

  // Faculty department from logged-in user (backend sends department on login)
  const facultyDeptCode = (user?.departmentId ?? '').toString().trim();

  // Subjects: from API, filtered by faculty's department so they can mark attendance
  const subjectsAll = facultyDeptCode && apiSubjects.length > 0
    ? apiSubjects.filter((s: { department_code?: string }) => s.department_code === facultyDeptCode)
    : apiSubjects;
  const subjects = selectedSemester && selectedSemester !== '__all__'
    ? subjectsAll.filter((s: { semester?: string }) => String(s.semester ?? '1') === selectedSemester)
    : subjectsAll;
  const validSubjectValue = subjects.some(s => String(s.id) === selectedSubject) ? selectedSubject : '';

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
    if (!facultyDeptCode) {
      setApiStudents([]);
      return;
    }
    setStudentsLoading(true);
    const params = new URLSearchParams({ role: 'student', department: facultyDeptCode });
    if (selectedSection) params.set('section', selectedSection);
    if (selectedYear && selectedYear !== '__all__') params.set('year', selectedYear);
    fetch(apiUrl(`/api/users/?${params}`), { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then((data: unknown) => setApiStudents(Array.isArray(data) ? data : []))
      .catch(() => setApiStudents([]))
      .finally(() => setStudentsLoading(false));
  }, [facultyDeptCode, selectedSection, selectedYear]);

  useEffect(() => {
    if (user?.role !== 'faculty' && user?.role !== 'admin') return;
    fetch(apiUrl('/api/attendance/'), { credentials: 'include' })
      .then(res => res.ok ? res.json() : { records: [] })
      .then((data: { records?: Array<{ student: number; subject: string; date: string; status: string; hours?: number | null; total_hours?: number | null }> }) => setAttendanceRecords(data?.records ?? []))
      .catch(() => setAttendanceRecords([]));
  }, [user?.role, activeTab]);

  const studentsInSection = apiStudents.map(s => ({ id: String(s.id), name: s.full_name || s.roll_number || '', rollNumber: s.roll_number || '', email: s.email, departmentId: s.department || '', section: s.section || '', year: s.year ? Number(s.year) : 0 }))
    .filter(s => selectedSection === '' || s.section === selectedSection);

  // Pre-fill attendance checkboxes from saved records when date/subject/section change
  const selectedSubj = subjects.find(s => String(s.id) === selectedSubject) as { code?: string; name?: string } | undefined;
  const subjectCodeForMatch = selectedSubj?.code ?? selectedSubject;
  const subjectNameForMatch = selectedSubj?.name ?? '';
  const studentsInSectionKey = studentsInSection.map(s => s.id).join(',');
  useEffect(() => {
    if (!selectedSubject || !selectedSection) {
      setAttendanceData({});
      return;
    }
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const initial: Record<string, number> = {};
    let sessionTotal = sessionTotalHours;
    const subjectMatches = (s: string) => {
      if (!s) return false;
      const t = s.trim().toLowerCase();
      return t === (subjectCodeForMatch ?? '').trim().toLowerCase() || (subjectNameForMatch && t === subjectNameForMatch.trim().toLowerCase());
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
  }, [selectedDate, selectedSubject, selectedSection, subjectCodeForMatch, subjectNameForMatch, attendanceRecords, studentsInSectionKey]);

  const handleAttendanceChange = (studentId: string, isPresent: boolean) => {
    setAttendanceData(prev => ({ ...prev, [studentId]: isPresent ? sessionTotalHours : 0 }));
  };
  const handleAttendanceHoursChange = (studentId: string, hours: number) => {
    const val = Math.max(0, Math.min(sessionTotalHours, hours));
    setAttendanceData(prev => ({ ...prev, [studentId]: val }));
  };

  const subjectCode = (subjects.find(s => String(s.id) === selectedSubject) as { code?: string } | undefined)?.code ?? selectedSubject;

  const handleSaveAttendance = async () => {
    if (!selectedSubject || !selectedSection) {
      toast({ title: 'Error', description: 'Please select subject and section', variant: 'destructive' });
      return;
    }
    const codeToSend = (subjects.find(s => String(s.id) === selectedSubject) as { code?: string } | undefined)?.code;
    if (!codeToSend) {
      toast({ title: 'Error', description: 'Invalid subject. Please select a subject from the list.', variant: 'destructive' });
      return;
    }
    if (studentsInSection.length === 0) {
      toast({ title: 'No students', description: 'No students in this section. Check department/section filters or add students in Admin.', variant: 'destructive' });
      return;
    }
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const payload = studentsInSection.map(student => {
      const hours = attendanceData[student.id] ?? 0;
      return {
        student: Number(student.id),
        subject: codeToSend,
        date: dateStr,
        status: hours > 0 ? 'present' : 'absent',
        hours,
        total_hours: sessionTotalHours,
      };
    });
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

  const studentIdToInfo = Object.fromEntries(apiStudents.map(s => [s.id, { name: s.full_name || s.roll_number || '', roll: s.roll_number || '', section: s.section || '' }]));

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
      <header className="bg-white border-b shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-success rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-success-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Faculty Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {user?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={() => setChangePasswordOpen(true)}>
              <Lock className="w-4 h-4 mr-2" />
              Change password
            </Button>
            <Button variant="outline" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="attendance">Mark Attendance</TabsTrigger>
            <TabsTrigger value="student-attendance">Student Attendance</TabsTrigger>
            <TabsTrigger value="reports">My Reports</TabsTrigger>
            <TabsTrigger value="subjects">My Subjects</TabsTrigger>
          </TabsList>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Mark Attendance</CardTitle>
                <CardDescription>Students are listed by your branch and selected year & section. Select date, year, semester, subject, and section.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
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
                    <Select value={validSubjectValue} onValueChange={(v) => v !== '__none__' && setSelectedSubject(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.length === 0 ? (
                          <SelectItem key="__none__" value="__none__" disabled className="text-muted-foreground">
                            {!facultyDeptCode ? 'Select department / log in again' : 'No subjects for your department — add in Admin → Subjects'}
                          </SelectItem>
                        ) : (
                          subjects.map((subject: { id: string | number; name: string; code: string }) => (
                            <SelectItem key={String(subject.id)} value={String(subject.id)}>
                              {subject.name} ({subject.code})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Section</label>
                    <Select value={selectedSection} onValueChange={setSelectedSection}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {(apiSections || []).map((s: { id: number; name: string }) => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))}
                        {(apiSections || []).length === 0 && (
                          <SelectItem value="__none__" disabled className="text-muted-foreground">No sections – add in Admin</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
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
            {selectedSubject && selectedSection && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Students in Section {selectedSection}</CardTitle>
                    <CardDescription>
                      {subjects.find(s => s.id === selectedSubject)?.name} - {format(selectedDate, 'PPP')} · {sessionTotalHours} hour(s)
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
                <CardDescription>Subject-wise percentage for each student and overall across all subjects. Data from your marked attendance.</CardDescription>
              </CardHeader>
              <CardContent>
                {studentsInSection.length === 0 ? (
                  <p className="text-muted-foreground">Select a section in Mark Attendance to see students here, or ensure students are registered in your class and branch.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-medium">Student</th>
                          <th className="text-left p-2 font-medium">Roll No</th>
                          {subjects.map((sub: { id: string | number; code: string }) => (
                            <th key={String(sub.id)} className="text-left p-2 font-medium">{sub.code} %</th>
                          ))}
                          <th className="text-left p-2 font-medium">Overall %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentsInSection.map(student => {
                          const sid = Number(student.id) || student.id;
                          const bySubject: Record<string, { present: number; total: number }> = {};
                          subjects.forEach((sub: { code: string; name?: string }) => { bySubject[sub.code] = { present: 0, total: 0 }; });
                          let totalAll = 0, presentAll = 0;
                          attendanceRecords.filter(r => String(r.student) === String(sid)).forEach(r => {
                            const present = r.status?.toLowerCase() === 'present';
                            const subjectCode = subjects.find((sub: { code: string; name?: string }) => sub.code === r.subject || sub.name === r.subject)?.code ?? r.subject;
                            if (bySubject[subjectCode]) {
                              bySubject[subjectCode].total++;
                              if (present) bySubject[subjectCode].present++;
                            }
                            totalAll++;
                            if (present) presentAll++;
                          });
                          return (
                            <tr key={student.id} className="border-b">
                              <td className="p-2">{student.name}</td>
                              <td className="p-2 font-mono">{student.rollNumber}</td>
                              {subjects.map((sub: { id: string | number; code: string }) => {
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
        </Tabs>
      </div>

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