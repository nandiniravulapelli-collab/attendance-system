import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import QRCode from 'react-qr-code';
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
  Lock,
  Scan,
  Camera
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { db } from '@/lib/mockDb';
import { toast } from '@/hooks/use-toast';
import { apiUrl } from '@/lib/api';
import { formatStudentSectionsDisplay, parseStudentSections } from '@/lib/studentSections';
import { format, parseISO } from 'date-fns';

export const StudentLayout: React.FC = () => {
  const { user, logout, updateSessionUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiProfile, setApiProfile] = useState<{
    full_name: string | null;
    roll_number: string | null;
    phone: string | null;
    department: string | null;
    section: string | null;
    sections?: string[];
    year: string | null;
    email: string;
    is_detained?: boolean;
  } | null>(null);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileEditForm, setProfileEditForm] = useState({
    full_name: '',
    roll_number: '',
    email: '',
    phone: '',
    department: '',
    sections: [] as string[],
    year: ''
  });
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [apiDepartments, setApiDepartments] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [apiSections, setApiSections] = useState<Array<{ id: number; name: string }>>([]);

  /** QR Attendance state for students */
  const [qrScanningOpen, setQrScanningOpen] = useState(false);
  const [qrSessionId, setQrSessionId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElementId = 'qr-scanner';

  const numericId = user?.id && /^\d+$/.test(String(user.id)) ? Number(user.id) : null;
  useEffect(() => {
    if (numericId == null || (activeTab !== 'profile' && activeTab !== 'dashboard')) return;
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

  const fetchDepartments = () => {
    fetch(apiUrl('/api/departments/'), { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then((data: unknown) => setApiDepartments(Array.isArray(data) ? data : []))
      .catch(() => setApiDepartments([]));
  };
  const fetchSections = () => {
    fetch(apiUrl('/api/sections/'), { credentials: 'include' })
      .then(res => res.ok ? res.json() : [])
      .then((data: unknown) => setApiSections(Array.isArray(data) ? data : []))
      .catch(() => setApiSections([]));
  };
  useEffect(() => {
    if (activeTab !== 'profile') return;
    fetchDepartments();
    fetchSections();
  }, [activeTab]);

  const handleOpenEditProfile = async () => {
    if (apiDepartments.length === 0) fetchDepartments();
    if (apiSections.length === 0) fetchSections();
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
        email: profile.email || user?.email || '',
        phone: profile.phone || '',
        department: profile.department || '',
        sections: parseStudentSections(profile),
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
        body: JSON.stringify({
          full_name: profileEditForm.full_name,
          roll_number: profileEditForm.roll_number,
          email: profileEditForm.email.trim() || undefined,
          phone: profileEditForm.phone,
          department: profileEditForm.department,
          year: profileEditForm.year,
          sections: profileEditForm.sections,
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setApiProfile(prev => prev ? { ...prev, ...updated } : null);
        updateSessionUser({
          email: typeof updated.email === 'string' ? updated.email : profileEditForm.email.trim(),
          name: typeof updated.full_name === 'string' ? updated.full_name : profileEditForm.full_name,
        });
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

  const departments = apiDepartments;
  const student = db.getStudents().find(s => s.id === user?.id);
  const department = departments.find(d => d.code === apiProfile?.department);
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
  const [showAllAttendanceOnDashboard, setShowAllAttendanceOnDashboard] = useState(false);
  const [dashboardSubjectFilters, setDashboardSubjectFilters] = useState<string[]>([]);
  const [isStudentAttendanceFrozen, setIsStudentAttendanceFrozen] = useState(false);
  useEffect(() => {
    fetch(apiUrl('/api/attendance-portal-freeze/'), { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setIsStudentAttendanceFrozen(Boolean(data?.freeze_student_portal)))
      .catch(() => setIsStudentAttendanceFrozen(false));
  }, []);

  useEffect(() => {
    if (isStudentAttendanceFrozen && (activeTab === 'dashboard' || activeTab === 'attendance')) {
      setActiveTab('subjects');
    }
  }, [isStudentAttendanceFrozen, activeTab]);

  useEffect(() => {
    if (numericId == null) return;
    if (isStudentAttendanceFrozen) {
      setApiAttendance(null);
      return;
    }
    const params = new URLSearchParams();
    if (fromDate) params.set('from_date', format(fromDate, 'yyyy-MM-dd'));
    if (toDate) params.set('to_date', format(toDate, 'yyyy-MM-dd'));
    const url = params.toString() ? apiUrl(`/api/attendance/?${params.toString()}`) : apiUrl('/api/attendance/');
    fetch(url, { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => setApiAttendance(data))
      .catch(() => setApiAttendance(null));
  }, [numericId, fromDate, toDate, isStudentAttendanceFrozen]);

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
  const displaySectionRaw = apiProfile ? formatStudentSectionsDisplay(apiProfile).replace(/^–$/, '') : (student?.section ?? '');
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
    {
      name: 'Present (classes)',
      value: Math.round(overallStats.attendedHours * 100) / 100,
      color: '#10B981',
    },
    {
      name: 'Absent (classes)',
      value: Math.max(
        0,
        Math.round((overallStats.totalHours - overallStats.attendedHours) * 100) / 100,
      ),
      color: '#EF4444',
    },
  ];

  const overallDateMetrics = (() => {
    if (!apiAttendance?.records?.length) {
      return { attendedDays: 0, totalDays: 0 };
    }
    const byDate: Record<string, { attended: number; total: number }> = {};
    apiAttendance.records.forEach(
      (r: { date?: string; status?: string; hours?: number | null; total_hours?: number | null }) => {
        const dateKey = String(r.date || '').slice(0, 10);
        if (!dateKey) return;
        const th = r.total_hours != null && Number(r.total_hours) > 0 ? Number(r.total_hours) : 1;
        const ah =
          r.hours != null ? Number(r.hours) : r.status?.toLowerCase() === 'present' ? th : 0;
        const clampedAh = Math.max(0, Math.min(th, ah));
        if (!byDate[dateKey]) byDate[dateKey] = { attended: 0, total: 0 };
        byDate[dateKey].total += th;
        byDate[dateKey].attended += clampedAh;
      },
    );
    const totalDays = Object.keys(byDate).length;
    const attendedDays = Object.values(byDate).filter(
      (d) => d.attended > 0 && d.total > 0,
    ).length;
    return { attendedDays, totalDays };
  })();

  const getAttendanceStatus = () => {
    if (overallPercentage >= 90) return { status: 'excellent', color: 'success', message: 'Excellent attendance!' };
    if (overallPercentage >= 85) return { status: 'good', color: 'primary', message: 'Good attendance' };
    if (overallPercentage >= 75) return { status: 'warning', color: 'warning', message: 'Attendance below recommended level' };
    return { status: 'critical', color: 'destructive', message: 'Critical: Attendance too low!' };
  };

  const attendanceStatus = getAttendanceStatus();

  const completeAttendance = apiAttendance?.records?.length
    ? [...apiAttendance.records]
        .sort((a, b) => (b.date > a.date ? 1 : -1))
        .map((r) => {
          const total = r.total_hours != null && Number(r.total_hours) > 0 ? Number(r.total_hours) : 1;
          const attended =
            r.hours != null ? Number(r.hours) : (r.status?.toLowerCase() === 'present' ? total : 0);
          return {
            subject: r.subject,
            date: r.date,
            status: r.status?.toLowerCase() || 'absent',
            attended: Math.max(0, Math.min(total, attended)),
            total,
          };
        })
    : db.getRecentAttendance(user?.id || '');
  const dashboardSubjectOptions = Array.from(
    new Set(completeAttendance.map((r) => String(r.subject || '').trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const completeAttendanceFilteredBySubject =
    dashboardSubjectFilters.length > 0
      ? completeAttendance.filter((r) => dashboardSubjectFilters.includes(String(r.subject || '').trim()))
      : completeAttendance;
  const hasDateFilter = !!fromDate || !!toDate;
  const attendanceToShowOnDashboard = hasDateFilter || showAllAttendanceOnDashboard
    ? completeAttendanceFilteredBySubject
    : completeAttendanceFilteredBySubject.slice(0, 10);

  // QR Attendance Handlers
  const handleQrMarkAttendance = async (qrData?: string) => {
    console.log('=== QR Attendance Mark Attendance Started ===');
    console.log('Input qrData:', qrData);
    console.log('Current qrSessionId:', qrSessionId);
    console.log('Current deviceId:', deviceId);
    console.log('Current user:', user);
    
    // If QR data is provided (from scan), use it; otherwise use manual entry
    const sessionInfo = qrData || qrSessionId;
    
    console.log('Session info to use:', sessionInfo);
    
    if (!sessionInfo) {
      console.error('No session info available');
      toast({ title: 'Validation Error', description: 'Please scan a valid QR code or enter session ID.', variant: 'destructive' });
      return;
    }

    // Validate session ID format - must be exactly 5 digits
    let sessionId: string;
    try {
      // Handle different input formats
      if (typeof sessionInfo === 'string') {
        // Remove any colons or tokens if present (from QR scan)
        const cleanSessionId = sessionInfo.split(':')[0];
        
        // For manual entry, require exactly 5 digits
        if (!cleanSessionId.match(/^\d{5}$/)) {
          console.error('Invalid session ID format:', cleanSessionId);
          toast({ title: 'Validation Error', description: 'Session ID must be exactly 5 digits (e.g., 12345).', variant: 'destructive' });
          return;
        }
        sessionId = cleanSessionId;
      } else {
        console.error('Invalid session ID type:', typeof sessionInfo);
        toast({ title: 'Validation Error', description: 'Invalid session ID format.', variant: 'destructive' });
        return;
      }
    } catch (e) {
      console.error('Error parsing session ID:', e);
      toast({ title: 'Validation Error', description: 'Invalid session ID format.', variant: 'destructive' });
      return;
    }
    
    console.log('Validated session ID:', sessionId);

    // Generate device ID if not provided
    const finalDeviceId = deviceId || `${user?.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('Final device ID:', finalDeviceId);
    setDeviceId(finalDeviceId);

    setIsScanning(true);
    setScanResult(null);

    try {
      const apiEndpoint = apiUrl('/api/qr-attendance/mark/');
      console.log('API Endpoint:', apiEndpoint);
      
      const payload = {
        session_id: sessionId,
        device_id: finalDeviceId
      };
      console.log('Request payload:', payload);

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      console.log('Response status:', res.status);
      console.log('Response headers:', Object.fromEntries(res.headers.entries()));

      let data;
      try {
        const text = await res.text();
        console.log('Response text:', text);
        
        // Check if response is HTML (error page) instead of JSON
        if (text.trim().startsWith('<')) {
          console.error('Received HTML instead of JSON, likely server error');
          data = { detail: 'Server error. Please contact administrator.' };
        } else {
          data = JSON.parse(text);
          console.log('Parsed response data:', data);
        }
      } catch (e) {
        console.error('Failed to parse JSON response:', e);
        data = { detail: 'Invalid response from server' };
      }

      if (res.ok) {
        console.log('Attendance marked successfully');
        setScanResult({
          success: true,
          message: data.detail || 'Attendance marked successfully!'
        });
        toast({ title: 'Success', description: 'Your attendance has been marked.' });
        setQrScanningOpen(false);
        setQrSessionId('');
        setCameraError(null);
        setShowManualEntry(false);
      } else {
        console.error('Attendance marking failed:', data);
        setScanResult({
          success: false,
          message: data.detail || 'Failed to mark attendance.'
        });
        toast({ title: 'Error', description: data.detail || 'Failed to mark attendance', variant: 'destructive' });
      }
    } catch (error) {
      console.error('QR attendance network error:', error);
      setScanResult({
        success: false,
        message: 'Network error. Please try again.'
      });
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' });
    } finally {
      setIsScanning(false);
      console.log('=== QR Attendance Mark Attendance Ended ===');
    }
  };

  const handleQrScan = (decodedText: string) => {
    console.log('QR Scan result:', decodedText);
    
    if (!decodedText) {
      console.error('No QR data extracted from result');
      toast({ title: 'Scan Error', description: 'Could not read QR code data. Please try again.', variant: 'destructive' });
      return;
    }
    
    // Parse the QR data to extract session ID
    // Expected format: "session_id:token" where session_id is 5 digits
    const parts = decodedText.split(':');
    const sessionId = parts[0]; // Extract session ID
    
    console.log('Extracted session ID from QR:', sessionId);
    
    // Validate session ID format - must be exactly 5 digits
    if (!sessionId || !sessionId.match(/^\d{5}$/)) {
      console.error('Invalid session ID from QR:', sessionId);
      toast({ title: 'Invalid QR Code', description: 'QR code must contain exactly 5 digits for session ID.', variant: 'destructive' });
      return;
    }
    
    console.log('Validated session ID from QR:', sessionId);
    
    // Stop scanning after successful detection
    if (qrScannerRef.current) {
      qrScannerRef.current.stop().catch(console.error);
      qrScannerRef.current = null;
    }
    
    handleQrMarkAttendance(sessionId);
  };

  const handleQrError = (error: any) => {
    console.error('QR Scanner error:', error);
    let errorMessage = 'Camera access not available. Please use manual entry.';
    
    if (error.name === 'NotAllowedError') {
      errorMessage = 'Camera permission denied. Please allow camera access or use manual entry.';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'No camera found on this device. Please use manual entry.';
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'Camera is already in use. Please close other camera apps or use manual entry.';
    } else if (error.name === 'OverconstrainedError') {
      errorMessage = 'Camera does not support required features. Please use manual entry.';
    } else if (error.name === 'StreamApiNotSupportedError') {
      errorMessage = 'Your browser does not support camera access. Please use manual entry.';
    }
    
    setCameraError(errorMessage);
    setShowManualEntry(true);
  };

  // QR Scanner initialization and cleanup
  useEffect(() => {
    if (qrScanningOpen && !showManualEntry) {
      const startScanner = async () => {
        try {
          console.log('Starting QR scanner...');
          const html5QrCode = new Html5Qrcode(scannerElementId);
          qrScannerRef.current = html5QrCode;
          
          const config = { fps: 10, qrbox: { width: 250, height: 250 } };
          
          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              console.log('QR Code detected:', decodedText);
              handleQrScan(decodedText);
            },
            (errorMessage) => {
              // Don't log frame errors to avoid console spam
              // console.log('QR Scanner error:', errorMessage);
            }
          );
          
          console.log('QR scanner started successfully');
          setCameraError(null);
        } catch (error) {
          console.error('Failed to start QR scanner:', error);
          setCameraError('Failed to start camera. Please use manual entry.');
          setShowManualEntry(true);
        }
      };
      
      startScanner();
      
      return () => {
        if (qrScannerRef.current) {
          console.log('Stopping QR scanner...');
          qrScannerRef.current.stop().catch(console.error);
          qrScannerRef.current = null;
        }
      };
    } else if (qrScannerRef.current) {
      // Stop scanner when dialog closes
      qrScannerRef.current.stop().catch(console.error);
      qrScannerRef.current = null;
    }
  }, [qrScanningOpen, showManualEntry]);

  // Generate device ID on mount
  useEffect(() => {
    const storedDeviceId = localStorage.getItem('qr_device_id');
    if (storedDeviceId) {
      setDeviceId(storedDeviceId);
    } else {
      const newDeviceId = `${user?.id || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setDeviceId(newDeviceId);
      localStorage.setItem('qr_device_id', newDeviceId);
    }
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-white/95 backdrop-blur-md shadow-soft">
        <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-foreground">{user?.name || 'Student'}</h1>
              <p className="text-sm text-muted-foreground">Welcome back</p>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <Button variant="outline" onClick={logout} className="rounded-xl w-full sm:w-auto">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex flex-wrap gap-1.5 h-auto p-1.5 rounded-xl bg-muted/80">
            <TabsTrigger value="dashboard" disabled={isStudentAttendanceFrozen}>Dashboard</TabsTrigger>
            <TabsTrigger value="attendance" disabled={isStudentAttendanceFrozen}>My Attendance</TabsTrigger>
            <TabsTrigger value="qr-attendance" disabled={isStudentAttendanceFrozen}>QR Attendance</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>
          {isStudentAttendanceFrozen && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Attendance portal frozen</AlertTitle>
              <AlertDescription>
                Admin has temporarily frozen student attendance access. You can still use Subjects and Profile.
              </AlertDescription>
            </Alert>
          )}

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {apiProfile?.is_detained && (
              <Alert variant="destructive" className="border-destructive/80">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Account marked as detained</AlertTitle>
                <AlertDescription>
                  Your record is listed as <strong>detained</strong>. You can still sign in to view your profile and past attendance, but you will not appear in class attendance lists until administration releases your account.
                </AlertDescription>
              </Alert>
            )}
            {/* Student Info Card */}
            <Card className="border-violet-200/50">
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
                    <p className="text-sm text-muted-foreground">Section(s)</p>
                    <p className="font-medium">{displaySectionRaw ? displaySectionRaw.split(',').map(s => s.trim()).filter(Boolean).join(', ') : '–'}</p>
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
                  <div className="text-2xl font-bold">
                    {Math.round(overallStats.totalHours * 100) / 100}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All subjects combined (1 hour = 1 class)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Classes Attended</CardTitle>
                  <CheckCircle className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">
                    {Math.round(overallStats.attendedHours * 100) / 100}
                  </div>
                  <p className="text-xs text-muted-foreground">Present in class (hours)</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Classes Missed</CardTitle>
                  <XCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {Math.max(
                      0,
                      Math.round((overallStats.totalHours - overallStats.attendedHours) * 100) /
                        100,
                    )}
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
                      <>
                        {' '}
                        · {(apiAttendance.total_attended_hours ?? 0).toFixed(1)} /{' '}
                        {apiAttendance.total_hours.toFixed(1)} hours · {overallDateMetrics.attendedDays}{' '}
                        / {overallDateMetrics.totalDays} days
                      </>
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

            {/* Complete Attendance */}
            <Card>
              <CardHeader>
                <CardTitle>Complete Attendance</CardTitle>
                <CardDescription>
                  Full attendance list. Use date filters to view attendance between specific dates.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 items-end mb-4">
                  <div className="space-y-1">
                    <Label>Subjects</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-56 justify-start text-left font-normal">
                          {dashboardSubjectFilters.length > 0
                            ? `${dashboardSubjectFilters.length} selected`
                            : 'All subjects'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-3 max-h-72 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Quick actions</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setDashboardSubjectFilters(dashboardSubjectOptions)}>Select all</Button>
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setDashboardSubjectFilters([])}>Clear</Button>
                          </div>
                        </div>
                        {dashboardSubjectOptions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No subjects in current attendance.</p>
                        ) : (
                          <div className="space-y-2">
                            {dashboardSubjectOptions.map((subject, idx) => (
                              <div key={subject} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`stu-dash-sub-${idx}`}
                                  checked={dashboardSubjectFilters.includes(subject)}
                                  onCheckedChange={(checked) =>
                                    setDashboardSubjectFilters(
                                      checked
                                        ? [...dashboardSubjectFilters, subject]
                                        : dashboardSubjectFilters.filter((v) => v !== subject),
                                    )
                                  }
                                />
                                <label htmlFor={`stu-dash-sub-${idx}`} className="text-sm cursor-pointer">{subject}</label>
                              </div>
                            ))}
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllAttendanceOnDashboard(prev => !prev)}
                    disabled={hasDateFilter}
                  >
                    {showAllAttendanceOnDashboard ? 'Show less' : 'Show all'}
                  </Button>
                </div>
                <div className="space-y-3">
                  {attendanceToShowOnDashboard.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No attendance records match the selected subject/date filters.</p>
                  ) : (
                    attendanceToShowOnDashboard.map((record, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <div>
                            <p className="font-medium">{record.subject}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(record.date), 'PPP')}
                            </p>
                            {'attended' in record && 'total' in record && (
                              <p className="text-xs text-muted-foreground">
                                Attended: {Number(record.attended).toFixed(2).replace(/\.00$/, '')} / {Number(record.total).toFixed(2).replace(/\.00$/, '')} classes (hours)
                              </p>
                            )}
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
                    ))
                  )}
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

          {/* QR Attendance Tab */}
          <TabsContent value="qr-attendance" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>QR Attendance</CardTitle>
                <CardDescription>Scan QR codes to mark your attendance quickly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8">
                  <div className="mb-4">
                    <Camera className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    When your faculty displays a QR code, scan it to mark your attendance automatically
                  </p>
                  <Button onClick={() => setQrScanningOpen(true)} size="lg">
                    <Scan className="w-4 h-4 mr-2" />
                    Scan QR Code
                  </Button>
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
                      <label className="text-sm font-medium text-muted-foreground">Section(s)</label>
                      <p className="text-lg font-medium">{displaySectionRaw ? displaySectionRaw.split(',').map(s => s.trim()).filter(Boolean).join(', ') : '–'}</p>
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
                  <DialogDescription>Update your name, roll number, email, phone, department, section(s), and year.</DialogDescription>
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
                    <Label>Email</Label>
                    <Input type="email" value={profileEditForm.email} onChange={e => setProfileEditForm(f => ({ ...f, email: e.target.value.trim() }))} placeholder="Email" autoComplete="email" />
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
                    <Label>Section(s)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal rounded-xl">
                          {profileEditForm.sections.length > 0 ? `${profileEditForm.sections.length} selected` : 'Select section(s)'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-3 max-h-64 overflow-y-auto" align="start">
                        {apiSections.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No sections yet. Ask admin to add sections.</p>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-end gap-2 mb-2">
                              <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={() => setProfileEditForm(f => ({ ...f, sections: apiSections.map(s => s.name) }))}>Select all</Button>
                              <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={() => setProfileEditForm(f => ({ ...f, sections: [] }))}>Clear all</Button>
                            </div>
                            {apiSections.map((s) => (
                              <div key={s.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`stu-sec-${s.id}`}
                                  checked={profileEditForm.sections.includes(s.name)}
                                  onCheckedChange={(checked) => {
                                    setProfileEditForm(f => ({
                                      ...f,
                                      sections: checked
                                        ? [...f.sections, s.name]
                                        : f.sections.filter((x) => x !== s.name),
                                    }));
                                  }}
                                />
                                <label htmlFor={`stu-sec-${s.id}`} className="text-sm cursor-pointer">{s.name}</label>
                              </div>
                            ))}
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
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

          {/* QR Scanning Dialog */}
          <Dialog open={qrScanningOpen} onOpenChange={setQrScanningOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Scan QR Code</DialogTitle>
                <DialogDescription>
                  {showManualEntry 
                    ? 'Enter session details manually' 
                    : 'Position the QR code within the camera frame to mark attendance'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {!showManualEntry ? (
                  <>
                    <div className="bg-black rounded-lg aspect-square flex items-center justify-center overflow-hidden relative">
                      {!cameraError ? (
                        <div id={scannerElementId} className="w-full h-full"></div>
                      ) : (
                        <div className="text-center text-white p-4">
                          <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm opacity-50">Camera unavailable</p>
                        </div>
                      )}
                    </div>
                    {cameraError && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Camera Error</AlertTitle>
                        <AlertDescription>{cameraError}</AlertDescription>
                      </Alert>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        console.log('Use Manual Entry clicked');
                        if (qrScannerRef.current) {
                          qrScannerRef.current.stop().catch(console.error);
                          qrScannerRef.current = null;
                        }
                        setShowManualEntry(true);
                      }}
                      className="w-full"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Use Manual Entry Instead
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="manual-session-id">Session ID</Label>
                      <Input
                        id="manual-session-id"
                        type="text"
                        value={qrSessionId}
                        onChange={(e) => {
                          // Only allow numbers
                          const value = e.target.value.replace(/\D/g, '');
                          // Limit to 5 digits
                          if (value.length <= 5) {
                            setQrSessionId(value);
                          }
                        }}
                        placeholder="Enter 5-digit session ID (e.g., 12345)"
                        maxLength={5}
                      />
                      <p className="text-xs text-muted-foreground">Session ID must be exactly 5 digits</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="device-id">Device ID</Label>
                      <Input
                        id="device-id"
                        value={deviceId}
                        onChange={(e) => setDeviceId(e.target.value)}
                        placeholder="Auto-generated for your device"
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        This identifies your device for this session only
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        console.log('Back to camera clicked');
                        setShowManualEntry(false);
                        setCameraError(null);
                        setScanResult(null);
                        setQrSessionId('');
                      }}
                      className="w-full"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Back to Camera Scan
                    </Button>
                  </>
                )}
                
                {scanResult && (
                  <Alert variant={scanResult.success ? 'default' : 'destructive'}>
                    {scanResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <AlertTitle>{scanResult.success ? 'Success' : 'Error'}</AlertTitle>
                    <AlertDescription>{scanResult.message}</AlertDescription>
                  </Alert>
                )}
                
                <Button 
                  onClick={() => {
                    console.log('Mark Attendance clicked');
                    handleQrMarkAttendance();
                  }} 
                  disabled={isScanning || !qrSessionId}
                  className="w-full"
                >
                  {isScanning ? 'Processing...' : 'Mark Attendance'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </Tabs>
      </div>
    </div>
  );
};