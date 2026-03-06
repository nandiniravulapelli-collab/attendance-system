import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import {
  BookOpen,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Users,
  LogOut,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Save,
  Lock
} from 'lucide-react';
import { db } from '@/lib/mockDb';
import { toast } from '@/hooks/use-toast';
import { apiUrl } from '@/lib/api';
import { format, parseISO } from 'date-fns';

export const StudentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiProfile, setApiProfile] = useState<{
    full_name: string | null;
    roll_number: string | null;
    phone: string | null;
    department: string | null;
    section: string | null;
    year: string | null;
    email: string;
  } | null>(null);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileEditForm, setProfileEditForm] = useState({
    full_name: '',
    roll_number: '',
    phone: '',
    department: '',
    section: '',
    year: ''
  });
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  const numericId = user?.id && /^\d+$/.test(String(user.id)) ? Number(user.id) : null;
  useEffect(() => {
    if (numericId == null || activeTab !== 'profile') return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(apiUrl(`/api/users/${numericId}/`), { credentials: 'include' });
        if (res.ok) setApiProfile(await res.json());
      } catch {
        setApiProfile(null);
      }
    };
    fetchProfile();
  }, [numericId, activeTab]);

  const handleOpenEditProfile = async () => {
    let profile = apiProfile;
    if (numericId != null && !profile) {
      try {
        const res = await fetch(apiUrl(`/api/users/${numericId}/`), { credentials: 'include' });
        if (res.ok) {
          profile = await res.json();
          setApiProfile(profile);
        }
      } catch {
        toast({ title: 'Could not load profile', variant: 'destructive' });
        return;
      }
    }
    if (profile) {
      setProfileEditForm({
        full_name: profile.full_name || '',
        roll_number: profile.roll_number || '',
        phone: profile.phone || '',
        department: profile.department || '',
        section: profile.section || '',
        year: profile.year || ''
      });
      setProfileEditOpen(true);
    }
  };

  const handleSaveEditProfile = async () => {
    if (numericId == null) return;
    try {
      const res = await fetch(apiUrl(`/api/users/${numericId}/`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileEditForm)
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

  const handleChangePassword = async () => {
    if (numericId == null) return;
    if (changePasswordForm.new_password !== changePasswordForm.confirm_password) {
      toast({ title: 'Passwords do not match', description: 'New password and confirm must match.', variant: 'destructive' });
      return;
    }
    if (changePasswordForm.new_password.length < 1) {
      toast({ title: 'Invalid password', description: 'Enter a new password.', variant: 'destructive' });
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/users/${numericId}/`), {
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

  const departments = db.getDepartments();
  const student = db.getStudents().find(s => s.id === user?.id);
  const department = departments.find(d => d.id === student?.departmentId || d.code === apiProfile?.department);
  const mockAttendance = db.getStudentAttendance(user?.id || '');

  const [apiAttendance, setApiAttendance] = useState<{
    records: Array<{ subject: string; date: string; status: string; hours?: number | null; total_hours?: number | null }>;
    total_classes: number;
    present_count: number;
    attendance_percentage: number;
    total_attended_hours?: number;
    total_hours?: number;
  } | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  useEffect(() => {
    if (numericId == null) return;
    const params = new URLSearchParams();
    if (fromDate) params.set('from_date', format(fromDate, 'yyyy-MM-dd'));
    if (toDate) params.set('to_date', format(toDate, 'yyyy-MM-dd'));
    const url = params.toString() ? apiUrl(`/api/attendance/?${params.toString()}`) : apiUrl('/api/attendance/');
    fetch(url, { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => setApiAttendance(data))
      .catch(() => setApiAttendance(null));
  }, [numericId, fromDate, toDate]);

  const bySubject: Record<string, { present: number; total: number; attendedHours: number; totalHours: number }> = {};
  if (apiAttendance?.records) {
    apiAttendance.records.forEach((r: { subject?: string; status?: string; hours?: number | null; total_hours?: number | null }) => {
      const sub = r.subject || 'Other';
      if (!bySubject[sub]) bySubject[sub] = { present: 0, total: 0, attendedHours: 0, totalHours: 0 };
      const th = r.total_hours != null && r.total_hours > 0 ? Number(r.total_hours) : 1;
      const ah = r.hours != null ? Number(r.hours) : (r.status?.toLowerCase() === 'present' ? 1 : 0);
      bySubject[sub].total++;
      if (r.status?.toLowerCase() === 'present') bySubject[sub].present++;
      bySubject[sub].attendedHours += ah;
      bySubject[sub].totalHours += th;
    });
  }
  const studentAttendance = apiAttendance?.records?.length
    ? Object.entries(bySubject).map(([sub, s]) => ({
        subject: { id: sub, code: sub, name: sub, credits: 0 },
        present: s.present,
        total: s.total,
        attendedHours: s.attendedHours,
        totalHours: s.totalHours,
        percentage: s.totalHours > 0 ? Math.round((s.attendedHours / s.totalHours) * 100 * 100) / 100 : 0
      }))
    : mockAttendance;

  const displayName = apiProfile?.full_name || user?.name || student?.name;
  const displayRoll = apiProfile?.roll_number || student?.rollNumber || user?.rollNumber;
  const displayPhone = apiProfile?.phone || student?.phone;
  const displaySection = apiProfile?.section || student?.section;
  const displayYear = apiProfile?.year || (student?.year != null ? String(student.year) : undefined);

  const overallStats = studentAttendance.reduce(
    (acc, subject) => {
      acc.totalClasses += subject.total;
      acc.presentClasses += subject.present;
      acc.attendedHours += (subject as { attendedHours?: number }).attendedHours ?? 0;
      acc.totalHours += (subject as { totalHours?: number }).totalHours ?? subject.total;
      return acc;
    },
    { totalClasses: 0, presentClasses: 0, attendedHours: 0, totalHours: 0 }
  );

  const overallPercentage = apiAttendance?.attendance_percentage != null
    ? Number(apiAttendance.attendance_percentage)
    : (overallStats.totalHours > 0
      ? Math.round((overallStats.attendedHours / overallStats.totalHours) * 100 * 100) / 100
      : (overallStats.totalClasses > 0 ? Math.round((overallStats.presentClasses / overallStats.totalClasses) * 100 * 100) / 100 : 0));

  const subjectChartData = studentAttendance.map(item => ({
    name: item.subject?.code || 'Unknown',
    percentage: item.percentage,
    present: item.present,
    absent: item.total - item.present
  }));

  const pieData = [
    { name: 'Present', value: overallStats.presentClasses, color: '#10B981' },
    { name: 'Absent', value: overallStats.totalClasses - overallStats.presentClasses, color: '#EF4444' }
  ];

  const getAttendanceStatus = () => {
    if (overallPercentage >= 90) return { status: 'excellent', color: 'success', message: 'Excellent attendance!' };
    if (overallPercentage >= 85) return { status: 'good', color: 'primary', message: 'Good attendance' };
    if (overallPercentage >= 75) return { status: 'warning', color: 'warning', message: 'Attendance below recommended level' };
    return { status: 'critical', color: 'destructive', message: 'Critical: Attendance too low!' };
  };

  const attendanceStatus = getAttendanceStatus();

  const recentAttendance = apiAttendance?.records?.length
    ? [...apiAttendance.records]
        .sort((a, b) => (b.date > a.date ? 1 : -1))
        .slice(0, 10)
        .map(r => ({ subject: r.subject, date: r.date, status: r.status?.toLowerCase() || 'absent' }))
    : db.getRecentAttendance(user?.id || '');

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Student Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {user?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
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
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="attendance">My Attendance</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Student Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Student Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Roll Number</p>
                    <p className="font-medium">{displayRoll || '–'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{department?.name || apiProfile?.department || '–'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Section</p>
                    <p className="font-medium">{displaySection != null ? `Section ${displaySection}` : '–'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Year</p>
                    <p className="font-medium">{displayYear ? `${displayYear} Year` : '–'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Attendance</p>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-2xl">{overallPercentage}%</p>
                      <Badge variant={attendanceStatus.color as any}>
                        {attendanceStatus.status.toUpperCase()}
                      </Badge>
                    </div>
                    {apiAttendance?.total_hours != null && apiAttendance.total_hours > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(apiAttendance.total_attended_hours ?? 0).toFixed(1)} / {apiAttendance.total_hours.toFixed(1)} hours
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
                  <Calendar className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overallStats.totalClasses}</div>
                  <p className="text-xs text-muted-foreground">All subjects combined</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Classes Attended</CardTitle>
                  <CheckCircle className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{overallStats.presentClasses}</div>
                  <p className="text-xs text-muted-foreground">Present in class</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Classes Missed</CardTitle>
                  <XCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {overallStats.totalClasses - overallStats.presentClasses}
                  </div>
                  <p className="text-xs text-muted-foreground">Absent from class</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overallPercentage}%</div>
                  <p className="text-xs text-muted-foreground">
                    {attendanceStatus.message}
                    {apiAttendance?.total_hours != null && apiAttendance.total_hours > 0 && (
                      <> · {(apiAttendance.total_attended_hours ?? 0).toFixed(1)} / {apiAttendance.total_hours.toFixed(1)} hours</>
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Attendance Warning */}
            {overallPercentage < 85 && (
              <Card className="border-warning bg-warning/5">
                <CardHeader>
                  <CardTitle className="flex items-center text-warning">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Attendance Warning
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    Your attendance is below the required 85%. You need to attend more classes to meet the minimum requirement.
                    {overallPercentage < 75 && (
                      <span className="block mt-2 font-medium text-destructive">
                        Warning: You may not be eligible to appear for exams if attendance doesn't improve.
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Subject-wise Attendance</CardTitle>
                  <CardDescription>Your attendance percentage by subject</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={subjectChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Overall Attendance Breakdown</CardTitle>
                  <CardDescription>Present vs Absent classes</CardDescription>
                </CardHeader>
                <CardContent>
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
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: item.color }}
                          />
                          {item.name}
                        </div>
                        <span className="font-medium">{item.value} classes</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Attendance */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance</CardTitle>
                <CardDescription>Your attendance for the last few classes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentAttendance.map((record, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <div>
                          <p className="font-medium">{record.subject}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(record.date), 'PPP')}
                          </p>
                        </div>
                      </div>
                      <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                        {record.status === 'present' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {record.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Attendance</CardTitle>
                <CardDescription>Subject-wise attendance breakdown. Filter by date range to see attendance between specific days.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 items-end mb-6">
                  <div className="space-y-1">
                    <Label>From date</Label>
                    <Input
                      type="date"
                      value={fromDate ? format(fromDate, 'yyyy-MM-dd') : ''}
                      onChange={e => {
                        const v = e.target.value;
                        setFromDate(v ? new Date(v) : null);
                      }}
                      className="w-40"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>To date</Label>
                    <Input
                      type="date"
                      value={toDate ? format(toDate, 'yyyy-MM-dd') : ''}
                      onChange={e => {
                        const v = e.target.value;
                        setToDate(v ? new Date(v) : null);
                      }}
                      className="w-40"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFromDate(null);
                      setToDate(null);
                    }}
                  >
                    Clear dates
                  </Button>
                </div>
                <div className="space-y-6">
                  {studentAttendance.map((item) => (
                    <div key={item.subject?.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{item.subject?.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Code: {item.subject?.code} • Credits: {item.subject?.credits}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{item.percentage}%</div>
                          <div className="text-sm text-muted-foreground">
                            {item.present} / {item.total} classes
                            {(item as { totalHours?: number }).totalHours != null && (item as { totalHours?: number }).totalHours > 0 && (
                              <> · {(item as { attendedHours?: number }).attendedHours?.toFixed(1) ?? '0'} / {(item as { totalHours?: number }).totalHours?.toFixed(1)} hours</>
                            )}
                          </div>
                        </div>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Present: {item.present}</span>
                        <span>Absent: {item.total - item.present}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects">
            <Card>
              <CardHeader>
                <CardTitle>My Subjects</CardTitle>
                <CardDescription>All subjects you are enrolled in</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {studentAttendance.map((item) => (
                    <div key={item.subject?.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <BookOpen className="w-8 h-8 text-primary" />
                        <div>
                          <div className="font-medium">{item.subject?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Code: {item.subject?.code} • Credits: {item.subject?.credits}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={item.percentage >= 85 ? 'default' : 'destructive'}>
                          {item.percentage}%
                        </Badge>
                        <div className="text-sm text-muted-foreground mt-1">
                          {item.present}/{item.total} classes
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Your academic and personal information</CardDescription>
                </div>
                {numericId != null && (
                  <Button variant="outline" size="sm" onClick={handleOpenEditProfile}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit my details
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                      <p className="text-lg font-medium">{displayName || '–'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Roll Number</label>
                      <p className="text-lg font-medium">{displayRoll || '–'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-lg font-medium">{apiProfile?.email ?? student?.email ?? user?.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <p className="text-lg font-medium">{displayPhone || '–'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Department</label>
                      <p className="text-lg font-medium">{department?.name ?? apiProfile?.department ?? '–'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Section</label>
                      <p className="text-lg font-medium">{displaySection != null ? `Section ${displaySection}` : '–'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Academic Year</label>
                      <p className="text-lg font-medium">{displayYear ? `${displayYear} Year` : '–'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Dialog open={profileEditOpen} onOpenChange={setProfileEditOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit your details</DialogTitle>
                  <DialogDescription>Update your name, roll number, phone, department, section, and year.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Full name</Label>
                    <Input value={profileEditForm.full_name} onChange={e => setProfileEditForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Full name" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Roll number</Label>
                    <Input value={profileEditForm.roll_number} onChange={e => setProfileEditForm(f => ({ ...f, roll_number: e.target.value }))} placeholder="Roll number" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Phone</Label>
                    <Input value={profileEditForm.phone} onChange={e => setProfileEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Department</Label>
                    <Select value={profileEditForm.department} onValueChange={v => setProfileEditForm(f => ({ ...f, department: v }))}>
                      <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map(d => (
                          <SelectItem key={d.id} value={d.code}>{d.code} – {d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Section</Label>
                    <Input value={profileEditForm.section} onChange={e => setProfileEditForm(f => ({ ...f, section: e.target.value }))} placeholder="e.g. A" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Year</Label>
                    <Input value={profileEditForm.year} onChange={e => setProfileEditForm(f => ({ ...f, year: e.target.value }))} placeholder="e.g. 2" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setProfileEditOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveEditProfile}><Save className="w-4 h-4 mr-2" /> Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="mt-4">
              <Button variant="outline" onClick={() => setChangePasswordOpen(true)}>
                <Lock className="w-4 h-4 mr-2" /> Change password
              </Button>
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
                  <Button onClick={handleChangePassword}>Change password</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};