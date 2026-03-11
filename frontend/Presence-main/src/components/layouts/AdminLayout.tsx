import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
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
  Cell
} from 'recharts';
import {
  Users,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  Calendar as CalendarIcon,
  LogOut,
  Settings,
  UserPlus,
  Download,
  RefreshCw,
  Upload,
  FileSpreadsheet,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  CheckCircle,
  XCircle,
  Clock,
  Lock
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { apiUrl } from '@/lib/api';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isImporting, setIsImporting] = useState(false);
  const [isFacultyDialogOpen, setIsFacultyDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [facultyFormData, setFacultyFormData] = useState({
    name: '',
    email: '',
    password: '',
    departmentId: '',
    phone: '',
    subjects: [] as string[]
  });

  // Students from backend API (for edit after registration)
  const [apiStudents, setApiStudents] = useState<Array<{
    id: number;
    username: string;
    email: string;
    role: string;
    full_name: string | null;
    roll_number: string | null;
    phone: string | null;
    department: string | null;
    section: string | null;
    year: string | null;
    visible_password?: string | null;
  }>>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [studentEditOpen, setStudentEditOpen] = useState(false);
  const [studentEditForm, setStudentEditForm] = useState({
    full_name: '',
    roll_number: '',
    phone: '',
    department: '',
    section: '',
    year: '',
    new_password: ''
  });
  const [studentEditId, setStudentEditId] = useState<number | null>(null);
  const [studentDeleteOpen, setStudentDeleteOpen] = useState(false);
  const [studentDeleteId, setStudentDeleteId] = useState<number | null>(null);
  const [studentFilterDept, setStudentFilterDept] = useState<string>('__all__');
  const [studentFilterSection, setStudentFilterSection] = useState('');
  const [studentFilterYear, setStudentFilterYear] = useState('');
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addStudentForm, setAddStudentForm] = useState({
    full_name: '',
    roll_number: '',
    email: '',
    password: '',
    department: '',
    section: '',
    year: '1',
    phone: ''
  });

  // Branches (Departments) from API
  const [apiDepartments, setApiDepartments] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [branchEditOpen, setBranchEditOpen] = useState(false);
  const [branchDeleteOpen, setBranchDeleteOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: '', code: '' });
  const [branchEditId, setBranchEditId] = useState<number | null>(null);
  const [branchDeleteId, setBranchDeleteId] = useState<number | null>(null);

  // Subjects from API
  const [apiSubjects, setApiSubjects] = useState<Array<{ id: number; name: string; code: string; department: number; department_code: string; year: string; semester: string }>>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectEditOpen, setSubjectEditOpen] = useState(false);
  const [subjectDeleteOpen, setSubjectDeleteOpen] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', department: '', year: '1', semester: '1' });
  const [subjectEditId, setSubjectEditId] = useState<number | null>(null);
  const [subjectDeleteId, setSubjectDeleteId] = useState<number | null>(null);
  const [subjectFilterDept, setSubjectFilterDept] = useState<string>('__all__');
  const [subjectFilterYear, setSubjectFilterYear] = useState<string>('__all__');
  const [subjectFilterSemester, setSubjectFilterSemester] = useState<string>('__all__');
  const SUBJECT_YEARS = ['1', '2', '3', '4'];
  const SUBJECT_SEMESTERS = ['1', '2'];

  // Sections (admin-managed; name can be character, string, or number)
  const [apiSections, setApiSections] = useState<Array<{ id: number; name: string }>>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [addSectionName, setAddSectionName] = useState('');
  const [sectionDeleteOpen, setSectionDeleteOpen] = useState(false);
  const [sectionDeleteId, setSectionDeleteId] = useState<number | null>(null);

  // Faculty from backend API
  const [apiFaculty, setApiFaculty] = useState<Array<{
    id: number;
    username: string;
    email: string;
    role: string;
    full_name: string | null;
    phone: string | null;
    department: string | null;
    visible_password?: string | null;
  }>>([]);
  const [facultyLoading, setFacultyLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'students') return;
    setStudentsError(null);
    const fetchStudents = async () => {
      setStudentsLoading(true);
      try {
        const res = await fetch(apiUrl('/api/users/?role=student'), { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setApiStudents(Array.isArray(data) ? data : (data.results ?? []));
        } else if (res.status === 403) {
          setApiStudents([]);
          setStudentsError('Could not load students. Make sure you are logged in as Admin and that you use the same address for app and backend (e.g. both http://localhost or both http://127.0.0.1).');
        } else {
          setApiStudents([]);
          setStudentsError('Could not load students. Please try again.');
        }
      } catch {
        setApiStudents([]);
        setStudentsError('Network error. Is the backend running at ' + (typeof window !== 'undefined' ? window.location.hostname : '') + ':8000?');
      } finally {
        setStudentsLoading(false);
      }
    };
    fetchStudents();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'branches' && activeTab !== 'subjects' && activeTab !== 'sections' && activeTab !== 'students' && activeTab !== 'faculty' && activeTab !== 'mark-attendance') return;
    const fetchDepartments = async () => {
      setDepartmentsLoading(true);
      try {
        const res = await fetch(apiUrl('/api/departments/'), { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setApiDepartments(Array.isArray(data) ? data : []);
        } else setApiDepartments([]);
      } catch {
        setApiDepartments([]);
      } finally {
        setDepartmentsLoading(false);
      }
    };
    fetchDepartments();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'sections' && activeTab !== 'mark-attendance' && activeTab !== 'students') return;
    setSectionsLoading(true);
    fetch(apiUrl('/api/sections/'), { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => setApiSections(Array.isArray(data) ? data : []))
      .catch(() => setApiSections([]))
      .finally(() => setSectionsLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'faculty' && activeTab !== 'dashboard') return;
    setFacultyLoading(true);
    fetch(apiUrl('/api/users/?role=faculty'), { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => setApiFaculty(Array.isArray(data) ? data : []))
      .catch(() => setApiFaculty([]))
      .finally(() => setFacultyLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'subjects' && activeTab !== 'faculty' && activeTab !== 'mark-attendance') return;
    const fetchSubjects = async () => {
      setSubjectsLoading(true);
      try {
        let url = apiUrl('/api/subjects/');
        if (activeTab === 'subjects') {
          const params = new URLSearchParams();
          if (subjectFilterDept && subjectFilterDept !== '__all__') params.set('department', subjectFilterDept);
          if (subjectFilterYear && subjectFilterYear !== '__all__') params.set('year', subjectFilterYear);
          if (subjectFilterSemester && subjectFilterSemester !== '__all__') params.set('semester', subjectFilterSemester);
          if (params.toString()) url = apiUrl(`/api/subjects/?${params.toString()}`);
        }
        const res = await fetch(url, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setApiSubjects(Array.isArray(data) ? data : []);
        } else setApiSubjects([]);
      } catch {
        setApiSubjects([]);
      } finally {
        setSubjectsLoading(false);
      }
    };
    fetchSubjects();
  }, [activeTab, subjectFilterDept, subjectFilterYear, subjectFilterSemester]);

  const handleOpenEditStudent = (s: typeof apiStudents[0]) => {
    setStudentEditId(s.id);
    setStudentEditForm({
      full_name: s.full_name || '',
      roll_number: s.roll_number || '',
      phone: s.phone || '',
      department: s.department || '',
      section: s.section || '',
      year: s.year || '',
      new_password: ''
    });
    setStudentEditOpen(true);
  };

  const handleSaveEditStudent = async () => {
    if (studentEditId == null) return;
    const { new_password, ...rest } = studentEditForm;
    const body = { ...rest } as Record<string, unknown>;
    if (new_password && String(new_password).trim()) body.new_password = String(new_password).trim();
    try {
      const res = await fetch(apiUrl(`/api/users/${studentEditId}/`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const updated = await res.json();
        setApiStudents(prev => prev.map((s: { id: number }) => s.id === studentEditId ? { ...s, ...updated } : s));
        setStudentEditOpen(false);
        toast({ title: 'Student updated', description: 'Details saved successfully.' });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Update failed', description: typeof err.detail === 'string' ? err.detail : 'Please try again.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Update failed', description: 'Network error.', variant: 'destructive' });
    }
  };

  const handleSaveAddStudent = async () => {
    if (!addStudentForm.roll_number?.trim() || !addStudentForm.email?.trim()) {
      toast({ title: 'Required', description: 'Roll number and email are required.', variant: 'destructive' });
      return;
    }
    if (!addStudentForm.password?.trim()) {
      toast({ title: 'Required', description: 'Password is required.', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch(apiUrl('/api/register/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: addStudentForm.roll_number.trim(),
          role: 'student',
          full_name: addStudentForm.full_name.trim() || addStudentForm.roll_number.trim(),
          roll_number: addStudentForm.roll_number.trim(),
          email: addStudentForm.email.trim(),
          password: addStudentForm.password.trim(),
          phone: addStudentForm.phone.trim() || '',
          department: addStudentForm.department || '',
          section: addStudentForm.section || '',
          year: addStudentForm.year || '1'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setApiStudents(prev => [...prev, { id: data.id, username: data.username, email: data.email, role: 'student', full_name: data.full_name, roll_number: data.roll_number, phone: data.phone ?? null, department: data.department ?? null, section: data.section ?? null, year: data.year ?? null, visible_password: addStudentForm.password }]);
        setAddStudentOpen(false);
        setAddStudentForm({ full_name: '', roll_number: '', email: '', password: '', department: '', section: '', year: '1', phone: '' });
        toast({ title: 'Student added', description: 'New student can log in with email and password.' });
      } else {
        const msg = data.email?.[0] || data.roll_number?.[0] || data.username?.[0] || data.detail || 'Could not add student.';
        toast({ title: 'Add failed', description: String(msg), variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Add failed', description: 'Network error.', variant: 'destructive' });
    }
  };

  const handleDeleteStudentClick = (id: number) => {
    setStudentDeleteId(id);
    setStudentDeleteOpen(true);
  };

  const confirmDeleteStudent = async () => {
    if (studentDeleteId == null) return;
    try {
      const res = await fetch(apiUrl(`/api/users/${studentDeleteId}/`), { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setApiStudents(prev => prev.filter(s => s.id !== studentDeleteId));
        setStudentDeleteOpen(false);
        setStudentDeleteId(null);
        toast({ title: 'Student deleted', description: 'Student has been removed.' });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Delete failed', description: typeof err.detail === 'string' ? err.detail : 'Cannot delete.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Delete failed', description: 'Network error.', variant: 'destructive' });
    }
  };

  const handleAddBranch = () => {
    setBranchEditId(null);
    setBranchForm({ name: '', code: '' });
    setBranchEditOpen(true);
  };
  const handleEditBranch = (d: { id: number; name: string; code: string }) => {
    setBranchEditId(d.id);
    setBranchForm({ name: d.name, code: d.code });
    setBranchEditOpen(true);
  };
  const handleSaveBranch = async () => {
    if (!branchForm.name.trim() || !branchForm.code.trim()) {
      toast({ title: 'Validation', description: 'Name and code are required.', variant: 'destructive' });
      return;
    }
    try {
      if (branchEditId != null) {
        const res = await fetch(apiUrl(`/api/departments/${branchEditId}/`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(branchForm)
        });
        if (res.ok) {
          const updated = await res.json();
          setApiDepartments(prev => prev.map(d => d.id === branchEditId ? { ...d, ...updated } : d));
          setBranchEditOpen(false);
          toast({ title: 'Branch updated', description: 'Saved.' });
        } else {
          const e = await res.json().catch(() => ({}));
          toast({ title: 'Update failed', description: JSON.stringify(e), variant: 'destructive' });
        }
      } else {
        const res = await fetch(apiUrl('/api/departments/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(branchForm)
        });
        if (res.ok) {
          const created = await res.json();
          setApiDepartments(prev => [...prev, created]);
          setBranchEditOpen(false);
          toast({ title: 'Branch added', description: 'New branch created.' });
        } else {
          const e = await res.json().catch(() => ({}));
          toast({ title: 'Add failed', description: JSON.stringify(e), variant: 'destructive' });
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Network error.', variant: 'destructive' });
    }
  };
  const handleDeleteBranchClick = (id: number) => {
    setBranchDeleteId(id);
    setBranchDeleteOpen(true);
  };
  const confirmDeleteBranch = async () => {
    if (branchDeleteId == null) return;
    try {
      const res = await fetch(apiUrl(`/api/departments/${branchDeleteId}/`), { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setApiDepartments(prev => prev.filter(d => d.id !== branchDeleteId));
        setBranchDeleteOpen(false);
        setBranchDeleteId(null);
        toast({ title: 'Branch deleted', description: 'Removed.' });
      } else {
        const e = await res.json().catch(() => ({}));
        toast({ title: 'Delete failed', description: typeof e.detail === 'string' ? e.detail : 'Cannot delete (may have subjects).', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Delete failed', description: 'Network error.', variant: 'destructive' });
    }
  };

  const handleAddSubject = () => {
    setSubjectEditId(null);
    setSubjectForm({
      name: '',
      code: '',
      department: (subjectFilterDept && subjectFilterDept !== '__all__') ? subjectFilterDept : (apiDepartments[0]?.code ?? '__all__'),
      year: (subjectFilterYear && subjectFilterYear !== '__all__') ? subjectFilterYear : '1',
      semester: (subjectFilterSemester && subjectFilterSemester !== '__all__') ? subjectFilterSemester : '1'
    });
    setSubjectEditOpen(true);
  };
  const handleEditSubject = (s: typeof apiSubjects[0]) => {
    setSubjectEditId(s.id);
    setSubjectForm({ name: s.name, code: s.code, department: s.department_code, year: s.year ?? '1', semester: s.semester ?? '1' });
    setSubjectEditOpen(true);
  };
  const handleSaveSubject = async () => {
    if (!subjectForm.name.trim() || !subjectForm.code.trim() || !subjectForm.department) {
      toast({ title: 'Validation', description: 'Name, code and branch are required.', variant: 'destructive' });
      return;
    }
    if (!subjectForm.year || subjectForm.year === '__all__') {
      toast({ title: 'Validation', description: 'Please select a year.', variant: 'destructive' });
      return;
    }
    if (!subjectForm.semester || subjectForm.semester === '__all__') {
      toast({ title: 'Validation', description: 'Please select a semester.', variant: 'destructive' });
      return;
    }
    const deptId = apiDepartments.find(d => d.code === subjectForm.department)?.id ?? (typeof subjectForm.department === 'number' ? subjectForm.department : null);
    if (subjectEditId == null && !deptId) {
      toast({ title: 'Validation', description: 'Select a valid branch.', variant: 'destructive' });
      return;
    }
    try {
      const payload = { name: subjectForm.name.trim(), code: subjectForm.code.trim(), department: deptId ?? subjectForm.department, year: subjectForm.year, semester: subjectForm.semester };
      if (subjectEditId != null) {
        const res = await fetch(apiUrl(`/api/subjects/${subjectEditId}/`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const updated = await res.json();
          setApiSubjects(prev => prev.map(s => s.id === subjectEditId ? { ...s, ...updated } : s));
          setSubjectEditOpen(false);
          toast({ title: 'Subject updated', description: 'Saved.' });
        } else {
          const e = await res.json().catch(() => ({}));
          toast({ title: 'Update failed', description: JSON.stringify(e), variant: 'destructive' });
        }
      } else {
        const res = await fetch(apiUrl('/api/subjects/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const created = await res.json();
          setApiSubjects(prev => [...prev, created]);
          setSubjectEditOpen(false);
          toast({ title: 'Subject added', description: 'New subject created.' });
        } else {
          const e = await res.json().catch(() => ({}));
          toast({ title: 'Add failed', description: JSON.stringify(e), variant: 'destructive' });
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Network error.', variant: 'destructive' });
    }
  };
  const handleDeleteSubjectClick = (id: number) => {
    setSubjectDeleteId(id);
    setSubjectDeleteOpen(true);
  };
  const confirmDeleteSubject = async () => {
    if (subjectDeleteId == null) return;
    try {
      const res = await fetch(apiUrl(`/api/subjects/${subjectDeleteId}/`), { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setApiSubjects(prev => prev.filter(s => s.id !== subjectDeleteId));
        setSubjectDeleteOpen(false);
        setSubjectDeleteId(null);
        toast({ title: 'Subject deleted', description: 'Removed.' });
      } else {
        const e = await res.json().catch(() => ({}));
        toast({ title: 'Delete failed', description: typeof e.detail === 'string' ? e.detail : 'Cannot delete.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Delete failed', description: 'Network error.', variant: 'destructive' });
    }
  };

  const handleAddSection = () => {
    setAddSectionName('');
    setAddSectionOpen(true);
  };
  const handleSaveSection = async () => {
    const name = addSectionName.trim();
    if (!name) {
      toast({ title: 'Required', description: 'Enter a section name (e.g. A, 1, Alpha).', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch(apiUrl('/api/sections/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name })
      });
      let data: Record<string, unknown> = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (res.ok) {
        setApiSections(prev => [...prev, { id: (data as { id?: number }).id!, name: (data as { name?: string }).name! }]);
        setAddSectionOpen(false);
        setAddSectionName('');
        toast({ title: 'Section added', description: `"${(data as { name?: string }).name}" has been added.` });
      } else {
        const msg = Array.isArray(data.name) ? data.name[0] : typeof data.detail === 'string' ? data.detail : typeof data.detail === 'object' && data.detail != null ? JSON.stringify(data.detail) : res.status === 500 ? 'Server error. Run backend migrations: python manage.py migrate' : 'Could not add section.';
        toast({ title: 'Failed', description: String(msg), variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Failed', description: (e instanceof Error ? e.message : 'Network error.') + ' Is the backend running?', variant: 'destructive' });
    }
  };
  const confirmDeleteSection = async () => {
    if (sectionDeleteId == null) return;
    try {
      const res = await fetch(apiUrl(`/api/sections/${sectionDeleteId}/`), { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setApiSections(prev => prev.filter(s => s.id !== sectionDeleteId));
        setSectionDeleteOpen(false);
        setSectionDeleteId(null);
        toast({ title: 'Section deleted', description: 'Removed.' });
      } else {
        const e = await res.json().catch(() => ({}));
        toast({ title: 'Delete failed', description: typeof e.detail === 'string' ? e.detail : 'Could not delete.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Delete failed', description: 'Network error.', variant: 'destructive' });
    }
  };

  const [systemAttendance, setSystemAttendance] = useState<{ total_classes: number; present_count: number; attendance_percentage: number } | null>(null);
  const [backendStudentCount, setBackendStudentCount] = useState<number | null>(null);
  const [backendDefaulters, setBackendDefaulters] = useState<Array<{ id: number; full_name: string | null; roll_number: string | null; department: string | null; attendancePercentage: number; presentClasses: number; totalClasses: number }>>([]);

  useEffect(() => {
    if (activeTab !== 'dashboard') return;
    fetch(apiUrl('/api/attendance/'), { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then((data: { total_classes?: number; present_count?: number; attendance_percentage?: number } | null) =>
        data && typeof data.total_classes === 'number'
          ? setSystemAttendance({ total_classes: data.total_classes, present_count: data.present_count ?? 0, attendance_percentage: data.attendance_percentage ?? 0 })
          : setSystemAttendance(null)
      )
      .catch(() => setSystemAttendance(null));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'dashboard' && activeTab !== 'defaulters') return;
    Promise.all([
      fetch(apiUrl('/api/users/?role=student'), { credentials: 'include' }).then(r => r.ok ? r.json() : []),
      fetch(apiUrl('/api/attendance/'), { credentials: 'include' }).then(r => r.ok ? r.json() : { records: [] })
    ]).then(([studentsList, attData]: [Array<{ id: number; full_name?: string | null; roll_number?: string | null; department?: string | null }>, { records?: Array<{ student: number; status: string }> }]) => {
      const list = Array.isArray(studentsList) ? studentsList : [];
      setBackendStudentCount(list.length);
      const records = Array.isArray(attData?.records) ? attData.records : [];
      const byStudent: Record<number, { present: number; total: number }> = {};
      records.forEach((r: { student: number; status: string }) => {
        const id = r.student;
        if (!byStudent[id]) byStudent[id] = { present: 0, total: 0 };
        byStudent[id].total++;
        if (String(r.status).toLowerCase() === 'present') byStudent[id].present++;
      });
      const defaultersList = list
        .map((s: { id: number; full_name?: string | null; roll_number?: string | null; department?: string | null }) => {
          const stat = byStudent[s.id] || { present: 0, total: 0 };
          const pct = stat.total > 0 ? (stat.present / stat.total) * 100 : 0;
          return { ...s, attendancePercentage: Math.round(pct * 100) / 100, presentClasses: stat.present, totalClasses: stat.total };
        })
        .filter((s: { attendancePercentage: number }) => s.attendancePercentage < 85);
      setBackendDefaulters(defaultersList);
    }).catch(() => {
      setBackendStudentCount(null);
      setBackendDefaulters([]);
    });
  }, [activeTab]);

  const totalStudentsDisplay = backendStudentCount ?? 0;
  const defaultersCountDisplay = backendDefaulters.length;
  const defaultersToShow = backendDefaulters;

  const attendanceData: Array<{ name: string; attendance: number }> = [];
  const pieData: Array<{ name: string; value: number; color: string }> = [];

  // Mark Attendance (admin - same as faculty)
  const [attDept, setAttDept] = useState<string>('__all__');
  const [attDate, setAttDate] = useState<Date>(new Date());
  const [attYear, setAttYear] = useState<string>('__all__');
  const [attSemester, setAttSemester] = useState<string>('__all__');
  const [attSubject, setAttSubject] = useState<string>('');
  const [attSection, setAttSection] = useState<string>('');
  const [attData, setAttData] = useState<Record<string, number>>({});
  const [attStudents, setAttStudents] = useState<Array<{ id: number; full_name: string | null; roll_number: string | null; email: string; department: string | null; section: string | null; year: string | null }>>([]);
  const [attRecords, setAttRecords] = useState<Array<{ student: number; subject: string; date: string; status: string; hours?: number | null; total_hours?: number | null }>>([]);
  const [attSessionTotalHours, setAttSessionTotalHours] = useState<number>(1);
  const [attStudentsLoading, setAttStudentsLoading] = useState(false);
  const [isUploadingAttendance, setIsUploadingAttendance] = useState(false);

  const [attAllStudentsForReport, setAttAllStudentsForReport] = useState<Array<{ id: number; full_name: string | null; roll_number: string | null; section: string | null }>>([]);
  const [attReportFromDate, setAttReportFromDate] = useState<Date | null>(null);
  const [attReportToDate, setAttReportToDate] = useState<Date | null>(null);

  useEffect(() => {
    if (activeTab !== 'mark-attendance' && activeTab !== 'attendance-records' && activeTab !== 'reports') return;
    const params = new URLSearchParams();
    if (attReportFromDate) params.set('from_date', format(attReportFromDate, 'yyyy-MM-dd'));
    if (attReportToDate) params.set('to_date', format(attReportToDate, 'yyyy-MM-dd'));
    const attUrl = params.toString() ? apiUrl(`/api/attendance/?${params.toString()}`) : apiUrl('/api/attendance/');
    Promise.all([
      fetch(attUrl, { credentials: 'include' }).then(r => r.ok ? r.json() : { records: [] }),
      fetch(apiUrl('/api/users/?role=student'), { credentials: 'include' }).then(r => r.ok ? r.json() : [])
    ]).then(([attRes, studentsList]) => {
      setAttRecords(Array.isArray((attRes as { records?: unknown[] }).records) ? (attRes as { records: Array<{ student: number; subject: string; date: string; status: string }> }).records : []);
      setAttAllStudentsForReport(Array.isArray(studentsList) ? studentsList : []);
    }).catch(() => {
      setAttRecords([]);
      setAttAllStudentsForReport([]);
    });
  }, [activeTab, attReportFromDate, attReportToDate]);

  useEffect(() => {
    if (activeTab !== 'mark-attendance' || !attDept || attDept === '__all__') {
      setAttStudents([]);
      return;
    }
    setAttStudentsLoading(true);
    const params = new URLSearchParams({ role: 'student', department: attDept });
    if (attSection) params.set('section', attSection);
    if (attYear && attYear !== '__all__') params.set('year', attYear);
    fetch(apiUrl(`/api/users/?${params}`), { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then((data: unknown) => setAttStudents(Array.isArray(data) ? data : []))
      .catch(() => setAttStudents([]))
      .finally(() => setAttStudentsLoading(false));
  }, [activeTab, attDept, attSection, attYear]);

  const attSubjectsFiltered = (apiSubjects || []).filter((s: { department_code?: string }) => !attDept || attDept === '__all__' || s.department_code === attDept);
  const attSubjectsSem = attSemester && attSemester !== '__all__'
    ? attSubjectsFiltered.filter((s: { semester?: string }) => String(s.semester ?? '1') === attSemester)
    : attSubjectsFiltered;
  const attStudentsInSection = attStudents
    .map(s => ({ id: String(s.id), name: s.full_name || s.roll_number || '', rollNumber: s.roll_number || '', email: s.email, section: s.section || '' }))
    .filter(s => !attSection || s.section === attSection);
  const attSubjectCode = (attSubjectsSem.find((s: { id: number }) => String(s.id) === attSubject) as { code?: string } | undefined)?.code ?? attSubject;
  const attSubjectName = (attSubjectsSem.find((s: { id: number }) => String(s.id) === attSubject) as { name?: string } | undefined)?.name ?? '';

  useEffect(() => {
    if (!attSubject || !attSection) {
      setAttData({});
      return;
    }
    const dateStr = format(attDate, 'yyyy-MM-dd');
    const subjectMatches = (s: string) => {
      const t = (s || '').trim().toLowerCase();
      return t === (attSubjectCode ?? '').trim().toLowerCase() || (attSubjectName && t === attSubjectName.trim().toLowerCase());
    };
    const initial: Record<string, number> = {};
    let sessionTotal = attSessionTotalHours;
    attStudentsInSection.forEach(student => {
      const record = attRecords.find(
        r => (r.date === dateStr || (r.date && r.date.slice(0, 10) === dateStr)) && subjectMatches(r.subject ?? '') && Number(r.student) === Number(student.id)
      );
      if (record) {
        const th = record.total_hours != null && record.total_hours > 0 ? Number(record.total_hours) : 1;
        if (sessionTotal === attSessionTotalHours) sessionTotal = th;
        const h = record.hours != null ? Number(record.hours) : (record.status?.toLowerCase() === 'present' ? th : 0);
        initial[student.id] = Math.min(h, th);
      } else {
        initial[student.id] = 0;
      }
    });
    setAttData(initial);
    if (sessionTotal !== attSessionTotalHours && sessionTotal >= 1) setAttSessionTotalHours(sessionTotal);
  }, [attDate, attSubject, attSection, attSubjectCode, attSubjectName, attRecords, attStudentsInSection.map(s => s.id).join(',')]);

  const handleAttChange = (studentId: string, isPresent: boolean) => {
    setAttData(prev => ({ ...prev, [studentId]: isPresent ? attSessionTotalHours : 0 }));
  };
  const handleAttHoursChange = (studentId: string, hours: number) => {
    const val = Math.max(0, Math.min(attSessionTotalHours, hours));
    setAttData(prev => ({ ...prev, [studentId]: val }));
  };
  const handleAttSelectAll = (isPresent: boolean) => {
    const next: Record<string, number> = {};
    const val = isPresent ? attSessionTotalHours : 0;
    attStudentsInSection.forEach(s => { next[s.id] = val; });
    setAttData(next);
  };
  const handleAttSave = async () => {
    if (!attSubject || !attSection || !attSubjectCode) {
      toast({ title: 'Error', description: 'Select subject and section', variant: 'destructive' });
      return;
    }
    if (attStudentsInSection.length === 0) {
      toast({ title: 'No students', description: 'No students in this section.', variant: 'destructive' });
      return;
    }
    const dateStr = format(attDate, 'yyyy-MM-dd');
    const payload = attStudentsInSection.map(s => {
      const hours = attData[s.id] ?? 0;
      return {
        student: Number(s.id),
        subject: attSubjectCode,
        date: dateStr,
        status: hours > 0 ? 'present' : 'absent',
        hours,
        total_hours: attSessionTotalHours
      };
    });
    try {
      const res = await fetch(apiUrl('/api/attendance/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Failed to save', description: typeof data.detail === 'string' ? data.detail : 'Please try again.', variant: 'destructive' });
        return;
      }
      fetch(apiUrl('/api/attendance/'), { credentials: 'include' })
        .then(r => r.ok ? r.json() : { records: [] })
        .then((d: { records?: Array<{ student: number; subject: string; date: string; status: string }> }) => setAttRecords(d?.records ?? []))
        .catch(() => {});
      const savedCount = typeof data.created === 'number' ? data.created : payload.length;
      toast({ title: 'Success', description: `Attendance saved for ${savedCount} students.` });
      setAttData({});
    } catch {
      toast({ title: 'Failed to save', description: 'Network error.', variant: 'destructive' });
    }
  };

  const handleBulkAttendanceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingAttendance(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(apiUrl('/api/attendance/bulk-upload/'), { method: 'POST', credentials: 'include', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Upload failed', description: typeof data.detail === 'string' ? data.detail : 'Invalid file.', variant: 'destructive' });
        return;
      }
      const created = typeof data.created === 'number' ? data.created : 0;
      const skipped = (typeof data.skipped_existing === 'number' ? data.skipped_existing : 0) + (typeof data.skipped_invalid === 'number' ? data.skipped_invalid : 0);
      toast({ title: created > 0 ? 'Bulk upload completed' : 'No records created', description: `Created ${created}, skipped ${skipped} rows.` });
      setAttRecords(prev => prev.length ? prev : []); // refresh will happen when tab is re-opened
      fetch(apiUrl('/api/attendance/'), { credentials: 'include' })
        .then(r => r.ok ? r.json() : { records: [] })
        .then((d: { records?: Array<{ student: number; subject: string; date: string; status: string }> }) => setAttRecords(d?.records ?? []))
        .catch(() => {});
    } catch {
      toast({ title: 'Upload failed', description: 'Network error.', variant: 'destructive' });
    } finally {
      setIsUploadingAttendance(false);
      event.target.value = '';
    }
  };

  const attStudentIdToInfo = Object.fromEntries(
    (attAllStudentsForReport.length ? attAllStudentsForReport : apiStudents.length ? apiStudents : attStudents).map((s: { id: number; full_name?: string | null; roll_number?: string | null; section?: string | null }) => [s.id, { name: s.full_name || s.roll_number || '', roll: s.roll_number || '', section: s.section || '' }])
  );
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
    const sorted = [...attRecords].sort((a, b) => (a.subject || '').localeCompare(b.subject || '') || (a.date || '').localeCompare(b.date || ''));
    sorted.forEach(r => {
      const info = attStudentIdToInfo[r.student];
      rows.push([r.subject || '', r.date || '', info?.roll ?? '', info?.name ?? '', info?.section ?? '', r.status || '']);
    });
    if (rows.length <= 1) {
      toast({ title: 'No data', description: 'No attendance records.', variant: 'destructive' });
      return;
    }
    downloadCsv(`attendance_subject_wise_${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    toast({ title: 'Downloaded', description: 'Subject-wise report downloaded.' });
  };
  const handleDownloadSectionWise = () => {
    const rows: string[][] = [['Section', 'Subject', 'Date', 'Roll No', 'Student Name', 'Status']];
    const sorted = [...attRecords].sort((a, b) => {
      const secA = attStudentIdToInfo[a.student]?.section ?? '';
      const secB = attStudentIdToInfo[b.student]?.section ?? '';
      return secA.localeCompare(secB) || (a.date || '').localeCompare(b.date || '') || (a.subject || '').localeCompare(b.subject || '');
    });
    sorted.forEach(r => {
      const info = attStudentIdToInfo[r.student];
      rows.push([info?.section ?? '', r.subject || '', r.date || '', info?.roll ?? '', info?.name ?? '', r.status || '']);
    });
    if (rows.length <= 1) {
      toast({ title: 'No data', description: 'No attendance records.', variant: 'destructive' });
      return;
    }
    downloadCsv(`attendance_section_wise_${format(new Date(), 'yyyy-MM-dd')}.csv`, rows);
    toast({ title: 'Downloaded', description: 'Section-wise report downloaded.' });
  };

  // Admin Profile
  const adminId = user?.id && /^\d+$/.test(String(user.id)) ? Number(user.id) : null;
  const [apiProfile, setApiProfile] = useState<{ full_name?: string | null; phone?: string | null; username?: string | null } | null>(null);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileEditForm, setProfileEditForm] = useState({ full_name: '', phone: '', username: '' });
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  useEffect(() => {
    if (adminId == null || activeTab !== 'profile') return;
    fetch(apiUrl(`/api/users/${adminId}/`), { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(setApiProfile)
      .catch(() => setApiProfile(null));
  }, [adminId, activeTab]);

  useEffect(() => {
    if (apiProfile) {
      setProfileEditForm({ full_name: apiProfile.full_name || '', phone: apiProfile.phone || '', username: apiProfile.username || '' });
    }
  }, [apiProfile]);

  const handleSaveProfile = async () => {
    if (adminId == null) return;
    try {
      const res = await fetch(apiUrl(`/api/users/${adminId}/`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ full_name: profileEditForm.full_name, phone: profileEditForm.phone, username: profileEditForm.username || undefined })
      });
      if (res.ok) {
        const updated = await res.json();
        setApiProfile(prev => prev ? { ...prev, ...updated } : null);
        setProfileEditOpen(false);
        toast({ title: 'Profile updated', description: 'Your details have been saved.' });
      } else {
        toast({ title: 'Update failed', description: 'Please try again.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Update failed', description: 'Network error.', variant: 'destructive' });
    }
  };

  const handleAdminChangePassword = async () => {
    if (adminId == null) return;
    if (changePasswordForm.new_password !== changePasswordForm.confirm_password) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (!changePasswordForm.new_password.trim()) {
      toast({ title: 'Enter a new password', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/users/${adminId}/`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ current_password: changePasswordForm.current_password, new_password: changePasswordForm.new_password })
      });
      if (res.ok) {
        setChangePasswordOpen(false);
        setChangePasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        toast({ title: 'Password changed', description: 'Your password has been updated.' });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Password change failed', description: String(err.current_password?.[0] || err.detail || 'Failed'), variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Password change failed', description: 'Network error.', variant: 'destructive' });
    }
  };

  // Faculty Management Handlers
  const handleAddFaculty = () => {
    setSelectedFaculty(null);
    setFacultyFormData({
      name: '',
      email: '',
      password: '',
      departmentId: '',
      phone: '',
      subjects: []
    });
    setIsFacultyDialogOpen(true);
  };

  const handleEditFaculty = (facultyId: string) => {
    const member = apiFaculty.find(f => String(f.id) === facultyId);
    if (member) {
      setSelectedFaculty(facultyId);
      setFacultyFormData({
        name: member.full_name ?? member.username,
        email: member.email,
        password: '',
        departmentId: member.department ?? '',
        phone: member.phone ?? '',
        subjects: []
      });
      setIsFacultyDialogOpen(true);
    }
  };

  const handleDeleteFaculty = (facultyId: string) => {
    setSelectedFaculty(facultyId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteFaculty = async () => {
    if (!selectedFaculty) return;
    try {
      const res = await fetch(apiUrl(`/api/users/${selectedFaculty}/`), { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        setApiFaculty(prev => prev.filter(f => String(f.id) !== selectedFaculty));
        setIsDeleteDialogOpen(false);
        setSelectedFaculty(null);
        toast({ title: 'Faculty Deleted', description: 'Faculty member has been removed.' });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Delete Failed', description: typeof err.detail === 'string' ? err.detail : 'Could not delete.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Delete Failed', description: 'Network error.', variant: 'destructive' });
    }
  };

  const handleSaveFaculty = async () => {
    try {
      if (!facultyFormData.name || !facultyFormData.email || !facultyFormData.departmentId) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields.',
          variant: 'destructive'
        });
        return;
      }

      if (!selectedFaculty && !facultyFormData.password) {
        toast({
          title: 'Validation Error',
          description: 'Password is required for new faculty.',
          variant: 'destructive'
        });
        return;
      }

      if (selectedFaculty) {
        const res = await fetch(apiUrl(`/api/users/${selectedFaculty}/`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            full_name: facultyFormData.name,
            email: facultyFormData.email,
            ...(facultyFormData.password ? { new_password: facultyFormData.password } : {}),
            phone: facultyFormData.phone || '',
            department: facultyFormData.departmentId
          })
        });
        if (res.ok) {
          const updated = await res.json();
          setApiFaculty(prev => prev.map(f => f.id === Number(selectedFaculty) ? { ...f, ...updated } : f));
          toast({ title: 'Faculty Updated', description: 'Faculty member has been updated.' });
        } else {
          const err = await res.json().catch(() => ({}));
          toast({ title: 'Update Failed', description: typeof err.detail === 'string' ? err.detail : 'Please try again.', variant: 'destructive' });
          return;
        }
      } else {
        const deptCode = facultyFormData.departmentId;
        const res = await fetch(apiUrl('/api/register/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username: facultyFormData.email,
            email: facultyFormData.email,
            password: facultyFormData.password,
            role: 'faculty',
            full_name: facultyFormData.name,
            phone: facultyFormData.phone || '',
            department: deptCode,
            roll_number: '',
            section: '',
            year: ''
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data.email?.[0] || data.username?.[0] || data.detail || (typeof data === 'object' ? JSON.stringify(data) : 'Registration failed');
          toast({ title: 'Could not add faculty', description: String(msg), variant: 'destructive' });
          return;
        }
        setApiFaculty(prev => [...prev, { id: data.id, username: data.username ?? data.email, email: data.email, role: 'faculty', full_name: data.full_name ?? facultyFormData.name, phone: data.phone ?? null, department: data.department ?? deptCode }]);
        toast({ title: 'Faculty Added', description: 'New faculty member can now log in with their email and password.' });
      }

      setIsFacultyDialogOpen(false);
      setSelectedFaculty(null);
      setFacultyFormData({
        name: '',
        email: '',
        password: '',
        departmentId: '',
        phone: '',
        subjects: []
      });
    } catch (error: any) {
      toast({
        title: 'Operation Failed',
        description: error.message || 'An error occurred.',
        variant: 'destructive'
      });
    }
  };

  const toggleSubject = (subjectId: string) => {
    setFacultyFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subjectId)
        ? prev.subjects.filter(id => id !== subjectId)
        : [...prev.subjects, subjectId]
    }));
  };

  const handleImportFromExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(apiUrl('/api/students/bulk-upload/'), {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const created = typeof data.created === 'number' ? data.created : 0;
        const skippedExisting = typeof data.skipped_existing === 'number' ? data.skipped_existing : 0;
        const skippedInvalid = typeof data.skipped_invalid === 'number' ? data.skipped_invalid : 0;
        toast({
          title: 'Import completed',
          description: `Created ${created} students. Skipped ${skippedExisting} existing and ${skippedInvalid} invalid rows.`,
        });
        if (created > 0 && activeTab === 'students') {
          const r = await fetch(apiUrl('/api/users/?role=student'), { credentials: 'include' });
          if (r.ok) {
            const list = await r.json();
            setApiStudents(Array.isArray(list) ? list : []);
          }
        }
      } else {
        const message =
          (data && (data.detail || data.error)) ||
          'Import failed. Check that the Excel file has columns: full_name, roll_number, email, department, section, year.';
        toast({
          title: 'Import failed',
          description: String(message),
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Import failed',
        description: 'Network error while uploading file.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleExportToExcel = async () => {
    try {
      const res = await fetch(apiUrl('/api/export/attendance-data/'), {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = (data && (data.detail || data.error)) || 'Download failed. Make sure you are logged in as Admin.';
        toast({ title: 'Download failed', description: String(msg), variant: 'destructive' });
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'attendance_data.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: 'Download started', description: 'Excel file is downloading.' });
    } catch {
      toast({ title: 'Download failed', description: 'Network error while downloading Excel file.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Admin Dashboard</h1>
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
          <TabsList className="mb-8 flex flex-wrap">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="faculty">Manage Faculty</TabsTrigger>
            <TabsTrigger value="mark-attendance">Mark Attendance</TabsTrigger>
            <TabsTrigger value="attendance-records">Attendance Records</TabsTrigger>
            <TabsTrigger value="reports">Data Management</TabsTrigger>
            <TabsTrigger value="defaulters">Defaulters</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalStudentsDisplay}</div>
                  <p className="text-xs text-muted-foreground">Across all departments</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Faculty</CardTitle>
                  <GraduationCap className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{facultyLoading ? '…' : apiFaculty.length}</div>
                  <p className="text-xs text-muted-foreground">Active faculty</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemAttendance != null ? `${systemAttendance.attendance_percentage}%` : '—'}</div>
                  <p className="text-xs text-muted-foreground">
                    {systemAttendance != null ? `${systemAttendance.present_count} / ${systemAttendance.total_classes} records` : 'No attendance data yet'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Defaulters</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">{defaultersCountDisplay}</div>
                  <p className="text-xs text-muted-foreground">Students below 85%</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts - show when backend provides trend/distribution data */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Attendance Trend</CardTitle>
                  <CardDescription>Average attendance percentage by day</CardDescription>
                </CardHeader>
                <CardContent>
                  {attendanceData.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">No trend data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={attendanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="attendance" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Attendance Distribution</CardTitle>
                  <CardDescription>Student categorization by attendance percentage</CardDescription>
                </CardHeader>
                <CardContent>
                  {pieData.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">No distribution data yet</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 space-y-2">
                        {pieData.map((item, index) => (
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

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>Student Management</CardTitle>
                  <CardDescription>Add students (single or bulk import), view and manage by class. Only admin can add students.</CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => { setAddStudentForm({ full_name: '', roll_number: '', email: '', password: '', department: '', section: '', year: '1', phone: '' }); setAddStudentOpen(true); }}>
                    <UserPlus className="w-4 h-4 mr-2" /> Add Student
                  </Button>
                  <input type="file" accept=".xlsx" className="hidden" id="students-bulk-import" onChange={handleImportFromExcel} />
                  <Button variant="outline" asChild disabled={isImporting}>
                    <label htmlFor="students-bulk-import" className="cursor-pointer flex items-center">
                      {isImporting ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Importing…</> : <><Upload className="w-4 h-4 mr-2" /> Import from Excel</>}
                    </label>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <Label className="text-muted-foreground">Filter by class:</Label>
                  <Select value={studentFilterDept || '__all__'} onValueChange={setStudentFilterDept}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All departments</SelectItem>
                      {apiDepartments.map(d => (
                        <SelectItem key={String(d.id)} value={d.code}>{d.code} – {d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Section"
                    className="w-24"
                    value={studentFilterSection}
                    onChange={e => setStudentFilterSection(e.target.value)}
                  />
                  <Input
                    placeholder="Year"
                    className="w-24"
                    value={studentFilterYear}
                    onChange={e => setStudentFilterYear(e.target.value)}
                  />
                </div>
                {studentsLoading ? (
                  <p className="text-muted-foreground">Loading students…</p>
                ) : studentsError ? (
                  <p className="text-destructive">{studentsError}</p>
                ) : (() => {
                  const list = Array.isArray(apiStudents) ? apiStudents : [];
                  const filtered = list.filter(s => {
                    if (studentFilterDept && studentFilterDept !== '__all__' && s.department !== studentFilterDept) return false;
                    if (studentFilterSection.trim() && s.section !== studentFilterSection.trim()) return false;
                    if (studentFilterYear.trim() && s.year !== studentFilterYear.trim()) return false;
                    return true;
                  });
                  return filtered.length === 0 ? (
                    <p className="text-muted-foreground">No students match the filters. Add a student or import from Excel, or clear filters.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Roll Number</th>
                            <th className="text-left p-2">Name</th>
                            <th className="text-left p-2">Email</th>
                            <th className="text-left p-2">Department</th>
                            <th className="text-left p-2">Section</th>
                            <th className="text-left p-2">Year</th>
                            <th className="text-left p-2">Password</th>
                            <th className="text-left p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((student) => {
                            const dept = apiDepartments.find(d => d.code === student.department);
                            return (
                              <tr key={student.id} className="border-b">
                                <td className="p-2 font-mono text-sm">{student.roll_number || student.username}</td>
                                <td className="p-2">{student.full_name || student.username}</td>
                                <td className="p-2 text-sm text-muted-foreground">{student.email}</td>
                                <td className="p-2">{dept?.code ?? student.department}</td>
                                <td className="p-2"><Badge variant="secondary">{student.section || '–'}</Badge></td>
                                <td className="p-2">{student.year || '–'}</td>
                                <td className="p-2 font-mono text-sm">{student.visible_password ?? '—'}</td>
                                <td className="p-2 flex gap-1">
                                  <Button variant="outline" size="sm" onClick={() => handleOpenEditStudent(student)}>
                                    <Edit className="w-3 h-3 mr-1 inline" /> Edit
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDeleteStudentClick(student.id)} className="text-destructive hover:text-destructive">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
            {/* Add Student Dialog */}
            <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Student</DialogTitle>
                  <DialogDescription>Create a new student account. They can sign in with email and password.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Full name</Label>
                    <Input value={addStudentForm.full_name ?? ''} onChange={e => setAddStudentForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Full name" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Roll number *</Label>
                    <Input value={addStudentForm.roll_number ?? ''} onChange={e => setAddStudentForm(f => ({ ...f, roll_number: e.target.value }))} placeholder="e.g. CSE2021001" required />
                  </div>
                  <div className="grid gap-2">
                    <Label>Email *</Label>
                    <Input type="email" value={addStudentForm.email ?? ''} onChange={e => setAddStudentForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" required />
                  </div>
                  <div className="grid gap-2">
                    <Label>Password *</Label>
                    <Input type="password" value={addStudentForm.password ?? ''} onChange={e => setAddStudentForm(f => ({ ...f, password: e.target.value }))} placeholder="Login password" required />
                  </div>
                  <div className="grid gap-2">
                    <Label>Phone</Label>
                    <Input value={addStudentForm.phone ?? ''} onChange={e => setAddStudentForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Department</Label>
                    <Select value={addStudentForm.department || '__none__'} onValueChange={v => setAddStudentForm(f => ({ ...f, department: v === '__none__' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {(apiDepartments || []).map((d: { id: number; code: string; name: string }) => (
                          <SelectItem key={d.id} value={d.code}>{d.code} – {d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Section</Label>
                    <Select value={addStudentForm.section || '__none__'} onValueChange={v => setAddStudentForm(f => ({ ...f, section: v === '__none__' ? '' : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {(apiSections || []).map((s: { id: number; name: string }) => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Year</Label>
                    <Select value={addStudentForm.year || '1'} onValueChange={v => setAddStudentForm(f => ({ ...f, year: v }))}>
                      <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Year 1</SelectItem>
                        <SelectItem value="2">Year 2</SelectItem>
                        <SelectItem value="3">Year 3</SelectItem>
                        <SelectItem value="4">Year 4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddStudentOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveAddStudent}><Save className="w-4 h-4 mr-2" /> Add Student</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {/* Edit Student Dialog */}
            <Dialog open={studentEditOpen} onOpenChange={setStudentEditOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit student details</DialogTitle>
                  <DialogDescription>Update name, roll number, phone, department, section, and year.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Full name</Label>
                    <Input
                      value={studentEditForm.full_name}
                      onChange={e => setStudentEditForm(f => ({ ...f, full_name: e.target.value }))}
                      placeholder="Full name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Roll number</Label>
                    <Input
                      value={studentEditForm.roll_number}
                      onChange={e => setStudentEditForm(f => ({ ...f, roll_number: e.target.value }))}
                      placeholder="Roll number"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Phone</Label>
                    <Input
                      value={studentEditForm.phone}
                      onChange={e => setStudentEditForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="Phone"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Department</Label>
                    <Select value={studentEditForm.department} onValueChange={v => setStudentEditForm(f => ({ ...f, department: v }))}>
                      <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                      <SelectContent>
                        {apiDepartments.map((d: { id: string | number; name: string; code: string }) => (
                          <SelectItem key={String(d.id)} value={d.code}>{d.code} – {d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Section</Label>
                    <Input
                      value={studentEditForm.section}
                      onChange={e => setStudentEditForm(f => ({ ...f, section: e.target.value }))}
                      placeholder="e.g. A"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Year</Label>
                    <Input
                      value={studentEditForm.year}
                      onChange={e => setStudentEditForm(f => ({ ...f, year: e.target.value }))}
                      placeholder="e.g. 2"
                    />
                  </div>
                  {studentEditId != null && apiStudents.find((s: { id: number; visible_password?: string | null }) => s.id === studentEditId)?.visible_password && (
                    <div className="grid gap-2">
                      <Label>Password (visible to admin)</Label>
                      <p className="text-sm font-mono bg-muted px-3 py-2 rounded border">
                        {apiStudents.find((s: { id: number; visible_password?: string | null }) => s.id === studentEditId)?.visible_password}
                      </p>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label>New password (leave blank to keep current)</Label>
                    <Input
                      type="password"
                      value={studentEditForm.new_password}
                      onChange={e => setStudentEditForm(f => ({ ...f, new_password: e.target.value }))}
                      placeholder="Set new password"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setStudentEditOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveEditStudent}><Save className="w-4 h-4 mr-2" /> Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <AlertDialog open={studentDeleteOpen} onOpenChange={setStudentDeleteOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete student?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently remove the student and their attendance records. This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDeleteStudent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          {/* Branches Tab */}
          <TabsContent value="branches">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Branches (Departments)</CardTitle>
                  <CardDescription>Add, edit, or remove branches. Students and subjects use these departments.</CardDescription>
                </div>
                <Button onClick={handleAddBranch}><Plus className="w-4 h-4 mr-2" /> Add Branch</Button>
              </CardHeader>
              <CardContent>
                {departmentsLoading ? (
                  <p className="text-muted-foreground">Loading…</p>
                ) : apiDepartments.length === 0 ? (
                  <p className="text-muted-foreground">No branches yet. Add a branch to get started.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Code</th>
                          <th className="text-left p-3">Name</th>
                          <th className="text-left p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiDepartments.map((d) => (
                          <tr key={d.id} className="border-b">
                            <td className="p-3 font-mono font-medium">{d.code}</td>
                            <td className="p-3">{d.name}</td>
                            <td className="p-3 flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditBranch(d)}><Edit className="w-3 h-3 mr-1" /> Edit</Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteBranchClick(d.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            <Dialog open={branchEditOpen} onOpenChange={setBranchEditOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{branchEditId == null ? 'Add Branch' : 'Edit Branch'}</DialogTitle>
                  <DialogDescription>Department code is used in student and subject records.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Code</Label>
                    <Input value={branchForm.code} onChange={e => setBranchForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. CSE" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input value={branchForm.name} onChange={e => setBranchForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Computer Science Engineering" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setBranchEditOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveBranch}><Save className="w-4 h-4 mr-2" /> Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <AlertDialog open={branchDeleteOpen} onOpenChange={setBranchDeleteOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete branch?</AlertDialogTitle>
                  <AlertDialogDescription>This will remove the branch. Delete or reassign its subjects first.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDeleteBranch} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          {/* Sections Tab */}
          <TabsContent value="sections">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Sections</CardTitle>
                  <CardDescription>Add or remove sections. Section name can be a character (e.g. A), a string (e.g. Alpha), or a number (e.g. 1). Used in Mark Attendance and student assignment.</CardDescription>
                </div>
                <Button onClick={handleAddSection}><Plus className="w-4 h-4 mr-2" /> Add Section</Button>
              </CardHeader>
              <CardContent>
                {sectionsLoading ? (
                  <p className="text-muted-foreground">Loading…</p>
                ) : apiSections.length === 0 ? (
                  <p className="text-muted-foreground">No sections yet. Click &quot;Add Section&quot; to add one (e.g. A, 1, Alpha).</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Name</th>
                          <th className="text-left p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiSections.map((s) => (
                          <tr key={s.id} className="border-b">
                            <td className="p-3 font-medium">{s.name}</td>
                            <td className="p-3">
                              <Button variant="outline" size="sm" onClick={() => { setSectionDeleteId(s.id); setSectionDeleteOpen(true); }} className="text-destructive hover:text-destructive">
                                <Trash2 className="w-3 h-3 mr-1 inline" /> Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Section</DialogTitle>
                  <DialogDescription>Enter section name: a character (A), string (Alpha), or number (1).</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Section name</Label>
                    <Input
                      value={addSectionName}
                      onChange={e => setAddSectionName(e.target.value)}
                      placeholder="e.g. A, 1, Alpha, Section-1"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddSectionOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveSection}><Save className="w-4 h-4 mr-2" /> Add Section</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <AlertDialog open={sectionDeleteOpen} onOpenChange={setSectionDeleteOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete section?</AlertDialogTitle>
                  <AlertDialogDescription>This will remove the section from the list. Students already assigned to this section will keep their section value; you can edit them if needed.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDeleteSection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Subjects by Branch</CardTitle>
                  <CardDescription>Add, edit, or remove subjects per branch, year, and semester. Each year has 2 semesters.</CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <Select value={subjectFilterDept || '__all__'} onValueChange={setSubjectFilterDept}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All branches</SelectItem>
                      {apiDepartments.map(d => <SelectItem key={d.id} value={d.code}>{d.code} – {d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={subjectFilterYear || '__all__'} onValueChange={setSubjectFilterYear}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="All years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All years</SelectItem>
                      {SUBJECT_YEARS.map(y => <SelectItem key={y} value={y}>Year {y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={subjectFilterSemester || '__all__'} onValueChange={setSubjectFilterSemester}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="All sems" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All semesters</SelectItem>
                      {SUBJECT_SEMESTERS.map(sem => <SelectItem key={sem} value={sem}>Sem {sem}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddSubject} disabled={apiDepartments.length === 0}><Plus className="w-4 h-4 mr-2" /> Add Subject</Button>
                </div>
              </CardHeader>
              <CardContent>
                {apiDepartments.length === 0 ? (
                  <p className="text-muted-foreground">Add branches first, then add subjects.</p>
                ) : subjectsLoading ? (
                  <p className="text-muted-foreground">Loading…</p>
                ) : (Array.isArray(apiSubjects) ? apiSubjects : []).length === 0 ? (
                  <p className="text-muted-foreground">No subjects yet. Select a branch and add a subject.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Code</th>
                          <th className="text-left p-3">Name</th>
                          <th className="text-left p-3">Branch</th>
                          <th className="text-left p-3">Year</th>
                          <th className="text-left p-3">Sem</th>
                          <th className="text-left p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(apiSubjects) ? apiSubjects : []).map((s) => (
                          <tr key={s.id} className="border-b">
                            <td className="p-3 font-mono font-medium">{s.code}</td>
                            <td className="p-3">{s.name}</td>
                            <td className="p-3"><Badge variant="secondary">{s.department_code}</Badge></td>
                            <td className="p-3"><Badge variant="outline">Year {s.year ?? '1'}</Badge></td>
                            <td className="p-3"><Badge variant="outline">Sem {s.semester ?? '1'}</Badge></td>
                            <td className="p-3 flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditSubject(s)}><Edit className="w-3 h-3 mr-1" /> Edit</Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteSubjectClick(s.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            <Dialog open={subjectEditOpen} onOpenChange={setSubjectEditOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{subjectEditId == null ? 'Add Subject' : 'Edit Subject'}</DialogTitle>
                  <DialogDescription>Subject code is unique per branch, year, and semester. Each year has 2 semesters.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Branch</Label>
                    <Select value={subjectForm.department || '__all__'} onValueChange={v => setSubjectForm(f => ({ ...f, department: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Select branch</SelectItem>
                        {apiDepartments.map(d => <SelectItem key={d.id} value={d.code}>{d.code} – {d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Year</Label>
                      <Select value={subjectForm.year || '1'} onValueChange={v => setSubjectForm(f => ({ ...f, year: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                        <SelectContent>
                          {SUBJECT_YEARS.map(y => <SelectItem key={y} value={y}>Year {y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Semester</Label>
                      <Select value={subjectForm.semester || '1'} onValueChange={v => setSubjectForm(f => ({ ...f, semester: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select sem" /></SelectTrigger>
                        <SelectContent>
                          {SUBJECT_SEMESTERS.map(sem => <SelectItem key={sem} value={sem}>Semester {sem}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Code</Label>
                    <Input value={subjectForm.code} onChange={e => setSubjectForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. CSE301" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input value={subjectForm.name} onChange={e => setSubjectForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Data Structures" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSubjectEditOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveSubject}><Save className="w-4 h-4 mr-2" /> Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <AlertDialog open={subjectDeleteOpen} onOpenChange={setSubjectDeleteOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete subject?</AlertDialogTitle>
                  <AlertDialogDescription>This will remove the subject. Attendance records may still reference the subject name.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDeleteSubject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          {/* Faculty Tab */}
          <TabsContent value="faculty">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Faculty Management</CardTitle>
                    <CardDescription>Add, edit, or remove faculty members</CardDescription>
                  </div>
                  <Button onClick={handleAddFaculty}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Faculty
                  </Button>
                </CardHeader>
                <CardContent>
                  {facultyLoading ? (
                    <p className="text-muted-foreground">Loading faculty…</p>
                  ) : apiFaculty.length === 0 ? (
                    <div className="text-center py-12">
                      <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No faculty members found</p>
                      <Button onClick={handleAddFaculty}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Faculty Member
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3">Name</th>
                            <th className="text-left p-3">Email</th>
                            <th className="text-left p-3">Department</th>
                            <th className="text-left p-3">Password</th>
                            <th className="text-left p-3">Subjects</th>
                            <th className="text-left p-3">Contact</th>
                            <th className="text-left p-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apiFaculty.map((member) => (
                            <tr key={member.id} className="border-b hover:bg-muted/50">
                              <td className="p-3 font-medium">{member.full_name ?? member.username}</td>
                              <td className="p-3 text-sm text-muted-foreground">{member.email}</td>
                              <td className="p-3">
                                <Badge variant="secondary">{member.department ?? 'N/A'}</Badge>
                              </td>
                              <td className="p-3 font-mono text-sm">{member.visible_password ?? '—'}</td>
                              <td className="p-3">
                                <span className="text-xs text-muted-foreground">—</span>
                              </td>
                              <td className="p-3 text-sm">{member.phone ?? '—'}</td>
                              <td className="p-3">
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" onClick={() => handleEditFaculty(String(member.id))}>
                                    <Edit className="w-3 h-3 mr-1" /> Edit
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDeleteFaculty(String(member.id))} className="text-destructive hover:text-destructive">
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Add/Edit Faculty Dialog */}
            <Dialog open={isFacultyDialogOpen} onOpenChange={setIsFacultyDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {selectedFaculty ? 'Edit Faculty Member' : 'Add New Faculty Member'}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedFaculty 
                      ? 'Update faculty member information. Leave password blank to keep current password.'
                      : 'Fill in the details to add a new faculty member.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="faculty-name">Full Name *</Label>
                      <Input
                        id="faculty-name"
                        value={facultyFormData.name}
                        onChange={(e) => setFacultyFormData({...facultyFormData, name: e.target.value})}
                        placeholder="Dr. John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="faculty-email">Email *</Label>
                      <Input
                        id="faculty-email"
                        type="email"
                        value={facultyFormData.email}
                        onChange={(e) => setFacultyFormData({...facultyFormData, email: e.target.value})}
                        placeholder="john.doe@university.edu"
                      />
                    </div>
                  </div>

                  {selectedFaculty && apiFaculty.find((f: { id: number; visible_password?: string | null }) => f.id === Number(selectedFaculty))?.visible_password && (
                    <div className="space-y-2">
                      <Label>Password (visible to admin)</Label>
                      <p className="text-sm font-mono bg-muted px-3 py-2 rounded border">
                        {apiFaculty.find((f: { id: number; visible_password?: string | null }) => f.id === Number(selectedFaculty))?.visible_password}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="faculty-password">
                        Password {selectedFaculty ? '(leave blank to keep current)' : '*'}
                      </Label>
                      <Input
                        id="faculty-password"
                        type="password"
                        value={facultyFormData.password}
                        onChange={(e) => setFacultyFormData({...facultyFormData, password: e.target.value})}
                        placeholder={selectedFaculty ? "Leave blank to keep current" : "Enter password"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="faculty-phone">Phone</Label>
                      <Input
                        id="faculty-phone"
                        type="tel"
                        value={facultyFormData.phone}
                        onChange={(e) => setFacultyFormData({...facultyFormData, phone: e.target.value})}
                        placeholder="+1-555-0100"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="faculty-department">Department *</Label>
                    <Select 
                      value={facultyFormData.departmentId} 
                      onValueChange={(value) => setFacultyFormData({...facultyFormData, departmentId: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {apiDepartments.map((dept: { id: string | number; code: string; name: string }) => (
                          <SelectItem key={String(dept.id)} value={dept.code}>
                            {dept.code} - {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Assigned Subjects</Label>
                    <p className="text-xs text-muted-foreground">Subjects from the Subjects tab (by branch, year, semester)</p>
                    <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                      {(() => {
                        const facultyDeptCode = facultyFormData.departmentId;
                        const assignableSubjects = (Array.isArray(apiSubjects) ? apiSubjects : []).filter(
                          (s: { department_code: string }) => s.department_code === facultyDeptCode
                        );
                        if (assignableSubjects.length === 0) {
                          return <p className="text-sm text-muted-foreground">No subjects for this branch. Add subjects in the Subjects tab first.</p>;
                        }
                        return (
                          <div className="grid grid-cols-2 gap-3">
                            {assignableSubjects.map((subject: { id: number; code: string; name: string; year?: string; semester?: string }) => (
                              <div key={subject.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`subject-${subject.id}`}
                                  checked={facultyFormData.subjects.includes(String(subject.id))}
                                  onCheckedChange={() => toggleSubject(String(subject.id))}
                                />
                                <label
                                  htmlFor={`subject-${subject.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {subject.code} - {subject.name}{subject.year != null ? ` (Y${subject.year} S${subject.semester ?? '1'})` : ''}
                                </label>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsFacultyDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveFaculty}>
                    <Save className="w-4 h-4 mr-2" />
                    {selectedFaculty ? 'Update' : 'Add'} Faculty
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the faculty member
                    and all associated attendance records.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDeleteFaculty} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          {/* Mark Attendance Tab (same as Faculty) */}
          <TabsContent value="mark-attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mark Attendance</CardTitle>
                <CardDescription>Select department, date, year, semester, subject, and section. Then mark students present/absent.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Department</label>
                    <Select value={attDept || '__all__'} onValueChange={(v) => setAttDept(v || '__all__')}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Select department</SelectItem>
                        {(apiDepartments || []).map((d: { id: number; code: string; name: string }) => (
                          <SelectItem key={d.id} value={d.code}>{d.code} – {d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !attDate && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {attDate ? format(attDate, 'PPP') : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={attDate} onSelect={(d) => d && setAttDate(d)} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Year</label>
                    <Select value={attYear} onValueChange={setAttYear}>
                      <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
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
                    <Select value={attSemester} onValueChange={setAttSemester}>
                      <SelectTrigger><SelectValue placeholder="Semester" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All</SelectItem>
                        <SelectItem value="1">Sem 1</SelectItem>
                        <SelectItem value="2">Sem 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <Select value={attSubject || '__none__'} onValueChange={(v) => setAttSubject(v === '__none__' ? '' : (v || ''))}>
                      <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" disabled className="text-muted-foreground">
                          {attDept === '__all__' ? 'Select department first' : (attSubjectsSem || []).length === 0 ? 'No subjects' : 'Select subject'}
                        </SelectItem>
                        {(attSubjectsSem || []).map((s: { id: number; name: string; code: string }) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name} ({s.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Section</label>
                    <Select value={attSection} onValueChange={setAttSection}>
                      <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                      <SelectContent>
                        {(apiSections || []).map((s: { id: number; name: string }) => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))}
                        {(apiSections || []).length === 0 && (
                          <SelectItem value="__none__" disabled className="text-muted-foreground">Add sections in Sections tab</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 items-end mb-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Total hours (this class)</label>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={attSessionTotalHours}
                      onChange={e => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v >= 1 && v <= 24) {
                          setAttSessionTotalHours(v);
                          setAttData(prev => {
                            const next = { ...prev };
                            attStudentsInSection.forEach(s => {
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
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleAttSelectAll(true)}>All Present ({attSessionTotalHours} hr)</Button>
                    <Button variant="outline" size="sm" onClick={() => handleAttSelectAll(false)}>All Absent</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            {attSubject && attSection && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Students in Section {attSection}</CardTitle>
                    <CardDescription>{attSubjectsSem.find((s: { id: number }) => String(s.id) === attSubject)?.name} – {format(attDate, 'PPP')} · {attSessionTotalHours} hour(s)</CardDescription>
                  </div>
                  <Button onClick={handleAttSave} disabled={attStudentsInSection.length === 0}>
                    <Save className="w-4 h-4 mr-2" /> Save Attendance
                  </Button>
                </CardHeader>
                <CardContent>
                  {attStudentsLoading ? (
                    <p className="text-muted-foreground">Loading students…</p>
                  ) : attStudentsInSection.length === 0 ? (
                    <p className="text-muted-foreground">No students in this section. Select department and section.</p>
                  ) : (
                    <div className="grid gap-2">
                      {attStudentsInSection.map((student, idx) => {
                        const attended = attData[student.id] ?? 0;
                        return (
                          <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 flex-wrap gap-2">
                            <div className="flex items-center space-x-4">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">{idx + 1}</div>
                              <div>
                                <div className="font-medium">{student.name}</div>
                                <div className="text-sm text-muted-foreground">{student.rollNumber}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex items-center space-x-2">
                                <Checkbox id={`att-p-${student.id}`} checked={attended >= attSessionTotalHours} onCheckedChange={(c) => handleAttChange(student.id, c === true)} />
                                <label htmlFor={`att-p-${student.id}`} className="text-sm font-medium cursor-pointer">Present</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id={`att-a-${student.id}`} checked={attended === 0} onCheckedChange={(c) => handleAttChange(student.id, c !== true)} />
                                <label htmlFor={`att-a-${student.id}`} className="text-sm font-medium cursor-pointer">Absent</label>
                              </div>
                              {attSessionTotalHours > 1 && (
                                <div className="flex items-center gap-1">
                                  <label htmlFor={`att-hr-${student.id}`} className="text-sm text-muted-foreground">Attended (hrs):</label>
                                  <Input
                                    id={`att-hr-${student.id}`}
                                    type="number"
                                    min={0}
                                    max={attSessionTotalHours}
                                    value={attended}
                                    onChange={e => handleAttHoursChange(student.id, parseFloat(e.target.value) || 0)}
                                    className="w-16 h-8 text-center"
                                  />
                                  <span className="text-sm text-muted-foreground">/ {attSessionTotalHours}</span>
                                </div>
                              )}
                              <div className="w-8 h-8 flex items-center justify-center">
                                {attended >= attSessionTotalHours && <CheckCircle className="w-5 h-5 text-success" />}
                                {attended === 0 && <XCircle className="w-5 h-5 text-destructive" />}
                                {attended > 0 && attended < attSessionTotalHours && <Clock className="w-5 h-5 text-muted-foreground" />}
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
            <Card>
              <CardHeader>
                <CardTitle>Bulk Attendance Upload</CardTitle>
                <CardDescription>Upload an Excel (.xlsx) file with roll_number, subject, date/dates, and attended_hours/total_hours or status.</CardDescription>
              </CardHeader>
              <CardContent>
                <input type="file" accept=".xlsx" onChange={handleBulkAttendanceUpload} disabled={isUploadingAttendance} className="hidden" id="admin-bulk-attendance" />
                <Button asChild variant="outline" disabled={isUploadingAttendance}>
                  <label htmlFor="admin-bulk-attendance" className="cursor-pointer flex items-center justify-center">
                    {isUploadingAttendance ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4 mr-2" /> Upload Attendance Excel</>}
                  </label>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Records Tab */}
          <TabsContent value="attendance-records" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Attendance Records</CardTitle>
                <CardDescription>System-wide attendance entries. Filter by date range to see attendance between specific days.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 items-end mb-4">
                  <div className="space-y-1">
                    <Label>From date</Label>
                    <Input
                      type="date"
                      value={attReportFromDate ? format(attReportFromDate, 'yyyy-MM-dd') : ''}
                      onChange={e => {
                        const v = e.target.value;
                        setAttReportFromDate(v ? new Date(v) : null);
                      }}
                      className="w-40"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>To date</Label>
                    <Input
                      type="date"
                      value={attReportToDate ? format(attReportToDate, 'yyyy-MM-dd') : ''}
                      onChange={e => {
                        const v = e.target.value;
                        setAttReportToDate(v ? new Date(v) : null);
                      }}
                      className="w-40"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAttReportFromDate(null);
                      setAttReportToDate(null);
                    }}
                  >
                    Clear dates
                  </Button>
                </div>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Student ID</th>
                        <th className="text-left p-2">Student</th>
                        <th className="text-left p-2">Subject</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attRecords.slice(0, 500).map((r, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-2">{r.date}</td>
                          <td className="p-2 font-mono">{r.student}</td>
                          <td className="p-2">{attStudentIdToInfo[r.student]?.name ?? '–'}</td>
                          <td className="p-2">{r.subject}</td>
                          <td className="p-2"><Badge variant={r.status?.toLowerCase() === 'present' ? 'default' : 'destructive'}>{r.status || '–'}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {attRecords.length > 500 && <p className="text-sm text-muted-foreground mt-2">Showing first 500 of {attRecords.length} records.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="grid gap-6">
              {/* Excel Export/Import */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileSpreadsheet className="w-5 h-5 mr-2" />
                    Excel Data Management
                  </CardTitle>
                  <CardDescription>Export all data to Excel or import data from Excel file</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="font-medium">Export Data to Excel</h3>
                      <p className="text-sm text-muted-foreground">
                        Download all data (including passwords) to Excel file.
                      </p>
                      <p className="text-xs font-medium text-primary">
                        File: <code className="bg-primary/10 px-1 py-0.5 rounded">attendance_data.xlsx</code>
                      </p>
                      <Button 
                        onClick={handleExportToExcel}
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Excel File
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium">Import Data</h3>
                      <p className="text-sm text-muted-foreground">
                        Upload Excel file to import/update all data. Credentials will be imported from the file.
                      </p>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleImportFromExcel}
                          disabled={isImporting}
                          className="hidden"
                          id="excel-import"
                        />
                        <Button 
                          asChild
                          variant="outline"
                          className="w-full"
                          disabled={isImporting}
                        >
                          <label htmlFor="excel-import" className="cursor-pointer flex items-center justify-center">
                            {isImporting ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Importing...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4 mr-2" />
                                Import from Excel
                              </>
                            )}
                          </label>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Excel File Format:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>The Excel file should contain sheets: <strong>Students, Faculty, Admins, Departments, Subjects, Attendance</strong></li>
                      <li><strong>Students:</strong> Roll Number, Name, Email, <span className="text-primary font-semibold">Password</span>, Department, Section, Year, Phone</li>
                      <li><strong>Faculty:</strong> Name, Email, <span className="text-primary font-semibold">Password</span>, Department, Phone, Subjects</li>
                      <li><strong>Admins:</strong> Name, Email, <span className="text-primary font-semibold">Password</span></li>
                      <li><strong>Departments:</strong> Code, Name, Head</li>
                      <li><strong>Subjects:</strong> Code, Name, Department, Credits</li>
                      <li><strong>Attendance:</strong> Date, Student Roll Number, Subject Code, Faculty, Status, Section</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Note:</strong> Data is stored in browser localStorage. Use "Download Excel File" to export all data including credentials.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Other Reports */}
              <Card>
                <CardHeader>
                  <CardTitle>Generate Reports</CardTitle>
                  <CardDescription>Download attendance and analytics reports</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Button variant="outline" className="justify-start h-auto p-4 flex-col items-start" onClick={handleDownloadSubjectWise}>
                      <Download className="w-5 h-5 mb-2 self-center" />
                      <div className="text-left">
                        <div className="font-medium">Subject-wise Report</div>
                        <div className="text-sm text-muted-foreground">Attendance by subject (CSV)</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto p-4 flex-col items-start" onClick={handleDownloadSectionWise}>
                      <Download className="w-5 h-5 mb-2 self-center" />
                      <div className="text-left">
                        <div className="font-medium">Section-wise Report</div>
                        <div className="text-sm text-muted-foreground">Attendance by section (CSV)</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-auto p-4 flex-col items-start" onClick={() => setActiveTab('defaulters')}>
                      <Download className="w-5 h-5 mb-2 self-center" />
                      <div className="text-left">
                        <div className="font-medium">Defaulters List</div>
                        <div className="text-sm text-muted-foreground">Students below 85%</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bulk Attendance Upload</CardTitle>
                  <CardDescription>Upload Excel (.xlsx) with roll_number, subject, date/dates, attended_hours/total_hours or status.</CardDescription>
                </CardHeader>
                <CardContent>
                  <input type="file" accept=".xlsx" onChange={handleBulkAttendanceUpload} disabled={isUploadingAttendance} className="hidden" id="reports-bulk-attendance" />
                  <Button asChild variant="outline" disabled={isUploadingAttendance}>
                    <label htmlFor="reports-bulk-attendance" className="cursor-pointer flex items-center justify-center">
                      {isUploadingAttendance ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4 mr-2" /> Upload Attendance Excel</>}
                    </label>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Defaulters Tab */}
          <TabsContent value="defaulters">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Defaulters</CardTitle>
                <CardDescription>Students with less than 85% attendance</CardDescription>
              </CardHeader>
              <CardContent>
                {defaultersToShow.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No defaulters found. Great job!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Roll Number</th>
                          <th className="text-left p-2">Name</th>
                          <th className="text-left p-2">Department</th>
                          <th className="text-left p-2">Attendance %</th>
                          <th className="text-left p-2">Classes</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {defaultersToShow.map((student) => (
                            <tr key={student.id} className="border-b">
                              <td className="p-2 font-mono text-sm">{student.roll_number ?? '–'}</td>
                              <td className="p-2">{student.full_name ?? '–'}</td>
                              <td className="p-2">{student.department ?? '–'}</td>
                              <td className="p-2">
                                <Badge variant="destructive">{student.attendancePercentage}%</Badge>
                              </td>
                              <td className="p-2 text-sm">{student.presentClasses} / {student.totalClasses}</td>
                              <td className="p-2">
                                <Badge variant="outline" className="text-warning border-warning">Warning Sent</Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Your admin account details</CardDescription>
                </div>
                {adminId != null && (
                  <Button variant="outline" size="sm" onClick={() => { setProfileEditForm({ full_name: apiProfile?.full_name || '', phone: apiProfile?.phone || '', username: apiProfile?.username || '' }); setProfileEditOpen(true); }}>
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Username</label>
                    <p className="font-medium">{apiProfile?.username ?? '–'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Full Name</label>
                    <p className="font-medium">{apiProfile?.full_name ?? user?.name ?? '–'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Email</label>
                    <p className="font-medium">{user?.email ?? '–'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Phone</label>
                    <p className="font-medium">{apiProfile?.phone ?? '–'}</p>
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
            <DialogDescription>Update your username, name and phone.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Username</Label>
              <Input value={profileEditForm.username} onChange={e => setProfileEditForm(f => ({ ...f, username: e.target.value.trim() }))} placeholder="Username (for login display)" autoComplete="username" />
            </div>
            <div className="grid gap-2">
              <Label>Full name</Label>
              <Input value={profileEditForm.full_name} onChange={e => setProfileEditForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Full name" />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input value={profileEditForm.phone} onChange={e => setProfileEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProfile}><Save className="w-4 h-4 mr-2" /> Save</Button>
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
              <Input type="password" value={changePasswordForm.current_password} onChange={e => setChangePasswordForm(f => ({ ...f, current_password: e.target.value }))} placeholder="Current password" />
            </div>
            <div className="grid gap-2">
              <Label>New password</Label>
              <Input type="password" value={changePasswordForm.new_password} onChange={e => setChangePasswordForm(f => ({ ...f, new_password: e.target.value }))} placeholder="New password" />
            </div>
            <div className="grid gap-2">
              <Label>Confirm new password</Label>
              <Input type="password" value={changePasswordForm.confirm_password} onChange={e => setChangePasswordForm(f => ({ ...f, confirm_password: e.target.value }))} placeholder="Confirm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>Cancel</Button>
            <Button onClick={handleAdminChangePassword}>Change password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};