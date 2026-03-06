// Mock Database with seed data for the Attendance Monitoring System
import * as XLSX from 'xlsx';

export interface Department {
  id: string;
  name: string;
  code: string;
  head?: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  credits: number;
}

export interface Faculty {
  id: string;
  name: string;
  email: string;
  password: string;
  departmentId: string;
  phone: string;
  subjects: string[]; // subject IDs
}

export interface Student {
  id: string;
  name: string;
  email: string;
  password: string;
  rollNumber: string;
  departmentId: string;
  section: string;
  phone: string;
  year: number;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin';
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  subjectId: string;
  facultyId: string;
  date: string;
  status: 'present' | 'absent';
  section: string;
}

export interface Database {
  departments: Department[];
  subjects: Subject[];
  faculty: Faculty[];
  students: Student[];
  admins: Admin[];
  attendance: AttendanceRecord[];
}

// Seed data
export const mockDatabase: Database = {
  departments: [
    { id: 'dept1', name: 'Computer Science Engineering', code: 'CSE', head: 'Dr. Sarah Johnson' },
    { id: 'dept2', name: 'Electrical Engineering', code: 'EE', head: 'Dr. Michael Brown' },
    { id: 'dept3', name: 'Mechanical Engineering', code: 'ME', head: 'Dr. Robert Wilson' },
    { id: 'dept4', name: 'Information Technology', code: 'IT', head: 'Dr. Emily Davis' },
  ],

  subjects: [
    { id: 'sub1', name: 'Data Structures & Algorithms', code: 'CSE301', departmentId: 'dept1', credits: 4 },
    { id: 'sub2', name: 'Database Management Systems', code: 'CSE302', departmentId: 'dept1', credits: 3 },
    { id: 'sub3', name: 'Operating Systems', code: 'CSE303', departmentId: 'dept1', credits: 4 },
    { id: 'sub4', name: 'Computer Networks', code: 'CSE304', departmentId: 'dept1', credits: 3 },
    { id: 'sub5', name: 'Software Engineering', code: 'CSE305', departmentId: 'dept1', credits: 3 },
    { id: 'sub6', name: 'Circuit Analysis', code: 'EE201', departmentId: 'dept2', credits: 4 },
    { id: 'sub7', name: 'Digital Electronics', code: 'EE202', departmentId: 'dept2', credits: 3 },
    { id: 'sub8', name: 'Power Systems', code: 'EE203', departmentId: 'dept2', credits: 4 },
  ],

  faculty: [
    {
      id: 'fac1',
      name: 'Dr. Alex Thompson',
      email: 'alex.thompson@university.edu',
      password: 'faculty123',
      departmentId: 'dept1',
      phone: '+1-555-0101',
      subjects: ['sub1', 'sub3']
    },
    {
      id: 'fac2',
      name: 'Prof. Lisa Martinez',
      email: 'lisa.martinez@university.edu',
      password: 'faculty123',
      departmentId: 'dept1',
      phone: '+1-555-0102',
      subjects: ['sub2', 'sub4']
    },
    {
      id: 'fac3',
      name: 'Dr. James Wilson',
      email: 'james.wilson@university.edu',
      password: 'faculty123',
      departmentId: 'dept1',
      phone: '+1-555-0103',
      subjects: ['sub5']
    },
    {
      id: 'fac4',
      name: 'Dr. Maria Garcia',
      email: 'maria.garcia@university.edu',
      password: 'faculty123',
      departmentId: 'dept2',
      phone: '+1-555-0104',
      subjects: ['sub6', 'sub7']
    },
  ],

  students: [
    {
      id: 'std1',
      name: 'John Smith',
      email: 'john.smith@student.university.edu',
      password: 'student123',
      rollNumber: 'CSE2021001',
      departmentId: 'dept1',
      section: 'A',
      phone: '+1-555-1001',
      year: 3
    },
    {
      id: 'std2',
      name: 'Emma Johnson',
      email: 'emma.johnson@student.university.edu',
      password: 'student123',
      rollNumber: 'CSE2021002',
      departmentId: 'dept1',
      section: 'A',
      phone: '+1-555-1002',
      year: 3
    },
    {
      id: 'std3',
      name: 'Michael Brown',
      email: 'michael.brown@student.university.edu',
      password: 'student123',
      rollNumber: 'CSE2021003',
      departmentId: 'dept1',
      section: 'A',
      phone: '+1-555-1003',
      year: 3
    },
    {
      id: 'std4',
      name: 'Sarah Davis',
      email: 'sarah.davis@student.university.edu',
      password: 'student123',
      rollNumber: 'CSE2021004',
      departmentId: 'dept1',
      section: 'A',
      phone: '+1-555-1004',
      year: 3
    },
    {
      id: 'std5',
      name: 'David Wilson',
      email: 'david.wilson@student.university.edu',
      password: 'student123',
      rollNumber: 'CSE2021005',
      departmentId: 'dept1',
      section: 'B',
      phone: '+1-555-1005',
      year: 3
    },
    // Adding more students for better demo
    ...Array.from({ length: 15 }, (_, i) => ({
      id: `std${i + 6}`,
      name: `Student ${i + 6}`,
      email: `student${i + 6}@student.university.edu`,
      password: 'student123',
      rollNumber: `CSE2021${String(i + 6).padStart(3, '0')}`,
      departmentId: 'dept1',
      section: i % 2 === 0 ? 'A' : 'B',
      phone: `+1-555-10${String(i + 6).padStart(2, '0')}`,
      year: 3
    }))
  ],

  admins: [
    {
      id: 'admin1',
      name: 'System Administrator',
      email: 'admin@university.edu',
      password: 'admin123',
      role: 'admin' as const
    }
  ],

  attendance: []
};

function generateSampleAttendance(students: Student[], subjects: Subject[], faculty: Faculty[]): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const studentIds = students.slice(0, 20).map(s => s.id);
  const subjectIds = subjects.slice(0, 5).map(s => s.id);
  const facultyIds = faculty.slice(0, 3).map(f => f.id);
  
  // Generate 30 days of attendance
  for (let day = 0; day < 30; day++) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    const dateStr = date.toISOString().split('T')[0];
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    subjectIds.forEach((subjectId, subIndex) => {
      studentIds.forEach((studentId, studentIndex) => {
        // Simulate different attendance patterns
        let attendanceRate = 0.85; // Base 85% attendance
        
        // Some students have lower attendance
        if (studentIndex > 15) attendanceRate = 0.70;
        if (studentIndex > 18) attendanceRate = 0.60;
        
        const isPresent = Math.random() < attendanceRate;
        
        records.push({
          id: `att_${day}_${subIndex}_${studentIndex}`,
          studentId,
          subjectId,
          facultyId: facultyIds[subIndex % facultyIds.length],
          date: dateStr,
          status: isPresent ? 'present' : 'absent',
          section: studentIndex % 2 === 0 ? 'A' : 'B'
        });
      });
    });
  }
  
  return records;
}

// Initialize attendance data after mockDatabase is created
mockDatabase.attendance = generateSampleAttendance(
  mockDatabase.students,
  mockDatabase.subjects,
  mockDatabase.faculty
);

// Database operations
class MockDbService {
  private data: Database;
  private readonly XLSX_FILENAME = 'attendance_data.xlsx';

  constructor() {
    // Try to load from localStorage first (for quick access)
    const stored = localStorage.getItem('attendanceDB');
    if (stored) {
      this.data = JSON.parse(stored);
    } else {
      // Fallback to mock data
      this.data = { ...mockDatabase };
      // Save initial data to localStorage
      this.save();
    }
  }

  private save() {
    // Save to localStorage for quick access
    localStorage.setItem('attendanceDB', JSON.stringify(this.data));
    // Note: XLSX export is now manual only (via admin panel)
  }

  // Export to XLSX file (manual export only - called via admin panel)
  private exportToExcelFile(): void {
    try {
      const workbook = XLSX.utils.book_new();

      // Export Students (with passwords)
      const studentsData = this.data.students.map(s => ({
        'Roll Number': s.rollNumber,
        'Name': s.name,
        'Email': s.email,
        'Password': s.password,
        'Department': this.data.departments.find(d => d.id === s.departmentId)?.name || '',
        'Section': s.section,
        'Year': s.year,
        'Phone': s.phone
      }));
      const studentsSheet = XLSX.utils.json_to_sheet(studentsData);
      XLSX.utils.book_append_sheet(workbook, studentsSheet, 'Students');

      // Export Faculty (with passwords)
      const facultyData = this.data.faculty.map(f => ({
        'Name': f.name,
        'Email': f.email,
        'Password': f.password,
        'Department': this.data.departments.find(d => d.id === f.departmentId)?.name || '',
        'Phone': f.phone,
        'Subjects': f.subjects.map(sId => this.data.subjects.find(s => s.id === sId)?.code).filter(Boolean).join(', ')
      }));
      const facultySheet = XLSX.utils.json_to_sheet(facultyData);
      XLSX.utils.book_append_sheet(workbook, facultySheet, 'Faculty');

      // Export Departments
      const departmentsSheet = XLSX.utils.json_to_sheet(this.data.departments.map(d => ({
        'Code': d.code,
        'Name': d.name,
        'Head': d.head || ''
      })));
      XLSX.utils.book_append_sheet(workbook, departmentsSheet, 'Departments');

      // Export Subjects
      const subjectsData = this.data.subjects.map(s => ({
        'Code': s.code,
        'Name': s.name,
        'Department': this.data.departments.find(d => d.id === s.departmentId)?.name || '',
        'Credits': s.credits
      }));
      const subjectsSheet = XLSX.utils.json_to_sheet(subjectsData);
      XLSX.utils.book_append_sheet(workbook, subjectsSheet, 'Subjects');

      // Export Admins
      const adminsSheet = XLSX.utils.json_to_sheet(this.data.admins.map(a => ({
        'Name': a.name,
        'Email': a.email,
        'Password': a.password
      })));
      XLSX.utils.book_append_sheet(workbook, adminsSheet, 'Admins');

      // Export Attendance Records
      const attendanceData = this.data.attendance.map(a => {
        const student = this.data.students.find(s => s.id === a.studentId);
        const subject = this.data.subjects.find(s => s.id === a.subjectId);
        const faculty = this.data.faculty.find(f => f.id === a.facultyId);
        return {
          'Date': a.date,
          'Student Roll Number': student?.rollNumber || '',
          'Student Name': student?.name || '',
          'Subject Code': subject?.code || '',
          'Subject Name': subject?.name || '',
          'Faculty': faculty?.name || '',
          'Status': a.status,
          'Section': a.section
        };
      });
      const attendanceSheet = XLSX.utils.json_to_sheet(attendanceData);
      XLSX.utils.book_append_sheet(workbook, attendanceSheet, 'Attendance');

      // Write file (will download in browser)
      XLSX.writeFile(workbook, this.XLSX_FILENAME);
    } catch (error) {
      console.error('Error exporting to XLSX:', error);
    }
  }

  // Load data from XLSX file
  async loadFromExcelFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Clear existing data
          this.data = {
            departments: [],
            subjects: [],
            faculty: [],
            students: [],
            admins: [],
            attendance: []
          };

          // Import Departments first (needed for other imports)
          if (workbook.SheetNames.includes('Departments')) {
            const deptSheet = workbook.Sheets['Departments'];
            const deptJson = XLSX.utils.sheet_to_json(deptSheet);
            
            deptJson.forEach((row: any, index: number) => {
              this.data.departments.push({
                id: `dept_${index + 1}`,
                code: row['Code'],
                name: row['Name'],
                head: row['Head'] || undefined
              });
            });
          }

          // Import Subjects
          if (workbook.SheetNames.includes('Subjects')) {
            const subjSheet = workbook.Sheets['Subjects'];
            const subjJson = XLSX.utils.sheet_to_json(subjSheet);
            
            subjJson.forEach((row: any, index: number) => {
              const dept = this.data.departments.find(d => 
                d.name === row['Department'] || d.code === row['Department']
              );
              if (dept) {
                this.data.subjects.push({
                  id: `sub_${index + 1}`,
                  code: row['Code'],
                  name: row['Name'],
                  departmentId: dept.id,
                  credits: row['Credits'] || 3
                });
              }
            });
          }

          // Import Admins
          if (workbook.SheetNames.includes('Admins')) {
            const adminSheet = workbook.Sheets['Admins'];
            const adminJson = XLSX.utils.sheet_to_json(adminSheet);
            
            adminJson.forEach((row: any, index: number) => {
              this.data.admins.push({
                id: `admin_${index + 1}`,
                name: row['Name'],
                email: row['Email'],
                password: row['Password'],
                role: 'admin' as const
              });
            });
          }

          // Import Students
          if (workbook.SheetNames.includes('Students')) {
            const studentsSheet = workbook.Sheets['Students'];
            const studentsJson = XLSX.utils.sheet_to_json(studentsSheet);
            
            studentsJson.forEach((row: any) => {
              const dept = this.data.departments.find(d => 
                d.name === row['Department'] || d.code === row['Department']
              );
              if (dept) {
                this.data.students.push({
                  id: `std_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name: row['Name'],
                  email: row['Email'],
                  password: row['Password'] || 'student123',
                  rollNumber: row['Roll Number'],
                  departmentId: dept.id,
                  section: row['Section'] || 'A',
                  phone: row['Phone'] || '',
                  year: row['Year'] || 1
                });
              }
            });
          }

          // Import Faculty
          if (workbook.SheetNames.includes('Faculty')) {
            const facultySheet = workbook.Sheets['Faculty'];
            const facultyJson = XLSX.utils.sheet_to_json(facultySheet);
            
            facultyJson.forEach((row: any) => {
              const dept = this.data.departments.find(d => 
                d.name === row['Department'] || d.code === row['Department']
              );
              if (dept) {
                const subjectCodes = (row['Subjects'] || '').toString().split(',').map((s: string) => s.trim());
                const subjectIds = subjectCodes
                  .map((code: string) => this.data.subjects.find(s => s.code === code)?.id)
                  .filter(Boolean) as string[];

                this.data.faculty.push({
                  id: `fac_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name: row['Name'],
                  email: row['Email'],
                  password: row['Password'] || 'faculty123',
                  departmentId: dept.id,
                  phone: row['Phone'] || '',
                  subjects: subjectIds
                });
              }
            });
          }

          // Import Attendance Records
          if (workbook.SheetNames.includes('Attendance')) {
            const attSheet = workbook.Sheets['Attendance'];
            const attJson = XLSX.utils.sheet_to_json(attSheet);
            
            attJson.forEach((row: any) => {
              const student = this.data.students.find(s => s.rollNumber === row['Student Roll Number']);
              const subject = this.data.subjects.find(s => s.code === row['Subject Code']);
              const faculty = this.data.faculty.find(f => f.name === row['Faculty']);
              
              if (student && subject && faculty) {
                this.data.attendance.push({
                  id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  studentId: student.id,
                  subjectId: subject.id,
                  facultyId: faculty.id,
                  date: row['Date'],
                  status: row['Status']?.toLowerCase() === 'present' ? 'present' : 'absent',
                  section: row['Section'] || student.section
                });
              }
            });
          }

          // Save to localStorage
          localStorage.setItem('attendanceDB', JSON.stringify(this.data));
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  // Authentication
  authenticate(email: string, password: string, role: 'admin' | 'faculty' | 'student') {
    let user = null;
    
    switch (role) {
      case 'admin':
        user = this.data.admins.find(a => a.email === email && a.password === password);
        break;
      case 'faculty':
        user = this.data.faculty.find(f => f.email === email && f.password === password);
        break;
      case 'student':
        user = this.data.students.find(s => s.email === email && s.password === password);
        break;
    }
    
    return user ? { ...user, role } : null;
  }

  // Getters
  getDepartments() { return this.data.departments; }
  getSubjects() { return this.data.subjects; }
  getFaculty() { return this.data.faculty; }
  getStudents() { return this.data.students; }
  getAttendance() { return this.data.attendance; }

  // Analytics
  getAttendanceStats() {
    const totalStudents = this.data.students.length;
    const totalFaculty = this.data.faculty.length;
    const totalAttendanceRecords = this.data.attendance.length;
    const presentRecords = this.data.attendance.filter(a => a.status === 'present').length;
    const overallAttendancePercentage = totalAttendanceRecords > 0 
      ? (presentRecords / totalAttendanceRecords) * 100 
      : 0;

    // Calculate defaulters (students with < 85% attendance)
    const defaulters = this.getDefaulters();

    return {
      totalStudents,
      totalFaculty,
      overallAttendancePercentage: Math.round(overallAttendancePercentage * 100) / 100,
      defaultersCount: defaulters.length,
      totalClasses: totalAttendanceRecords,
      presentClasses: presentRecords
    };
  }

  getDefaulters() {
    const studentAttendance = new Map();
    
    // Calculate attendance percentage for each student
    this.data.students.forEach(student => {
      const studentRecords = this.data.attendance.filter(a => a.studentId === student.id);
      const presentRecords = studentRecords.filter(a => a.status === 'present');
      const attendancePercentage = studentRecords.length > 0 
        ? (presentRecords.length / studentRecords.length) * 100 
        : 0;
      
      if (attendancePercentage < 85) {
        studentAttendance.set(student.id, {
          ...student,
          attendancePercentage: Math.round(attendancePercentage * 100) / 100,
          totalClasses: studentRecords.length,
          presentClasses: presentRecords.length
        });
      }
    });
    
    return Array.from(studentAttendance.values());
  }

  // CRUD operations
  addStudent(student: Omit<Student, 'id'>) {
    // Check if email already exists
    if (this.data.students.some(s => s.email === student.email)) {
      throw new Error('Email already registered');
    }
    // Check if roll number already exists
    if (this.data.students.some(s => s.rollNumber === student.rollNumber)) {
      throw new Error('Roll number already exists');
    }
    const newStudent = { ...student, id: `std_${Date.now()}` };
    this.data.students.push(newStudent);
    this.save(); // This will auto-export to XLSX
    return newStudent;
  }

  // Registration method - saves to XLSX automatically
  registerStudent(studentData: {
    name: string;
    email: string;
    password: string;
    rollNumber: string;
    departmentId: string;
    section: string;
    phone: string;
    year: number;
  }) {
    const newStudent = this.addStudent(studentData);
    // Data saved to localStorage (XLSX export is manual via admin panel)
    return newStudent;
  }

  // Add faculty method (Admin only)
  addFaculty(facultyData: Omit<Faculty, 'id'>) {
    // Check if email already exists
    if (this.data.faculty.some(f => f.email === facultyData.email)) {
      throw new Error('Email already registered');
    }
    const newFaculty = { ...facultyData, id: `fac_${Date.now()}` };
    this.data.faculty.push(newFaculty);
    this.save();
    return newFaculty;
  }

  // Update faculty method
  updateFaculty(id: string, updates: Partial<Faculty>) {
    const index = this.data.faculty.findIndex(f => f.id === id);
    if (index !== -1) {
      // Check email uniqueness if email is being updated
      if (updates.email && this.data.faculty.some((f, i) => f.email === updates.email && i !== index)) {
        throw new Error('Email already registered');
      }
      this.data.faculty[index] = { ...this.data.faculty[index], ...updates };
      this.save();
      return this.data.faculty[index];
    }
    return null;
  }

  // Delete faculty method
  deleteFaculty(id: string) {
    const index = this.data.faculty.findIndex(f => f.id === id);
    if (index !== -1) {
      this.data.faculty.splice(index, 1);
      // Also remove attendance records for this faculty
      this.data.attendance = this.data.attendance.filter(a => a.facultyId !== id);
      this.save();
      return true;
    }
    return false;
  }

  updateStudent(id: string, updates: Partial<Student>) {
    const index = this.data.students.findIndex(s => s.id === id);
    if (index !== -1) {
      this.data.students[index] = { ...this.data.students[index], ...updates };
      this.save();
      return this.data.students[index];
    }
    return null;
  }

  deleteStudent(id: string) {
    this.data.students = this.data.students.filter(s => s.id !== id);
    this.data.attendance = this.data.attendance.filter(a => a.studentId !== id);
    this.save();
  }

  // Attendance operations
  markAttendance(records: Omit<AttendanceRecord, 'id'>[]) {
    const newRecords = records.map(record => ({
      ...record,
      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }));
    
    // Remove existing records for the same date/subject/section
    this.data.attendance = this.data.attendance.filter(existing => 
      !newRecords.some(newRecord => 
        existing.studentId === newRecord.studentId &&
        existing.subjectId === newRecord.subjectId &&
        existing.date === newRecord.date
      )
    );
    
    this.data.attendance.push(...newRecords);
    this.save();
    return newRecords;
  }

  getStudentAttendance(studentId: string) {
    const records = this.data.attendance.filter(a => a.studentId === studentId);
    const subjectWise = new Map();
    
    records.forEach(record => {
      const subject = this.data.subjects.find(s => s.id === record.subjectId);
      if (!subjectWise.has(record.subjectId)) {
        subjectWise.set(record.subjectId, {
          subject,
          total: 0,
          present: 0,
          percentage: 0
        });
      }
      
      const subjectData = subjectWise.get(record.subjectId);
      subjectData.total++;
      if (record.status === 'present') subjectData.present++;
      subjectData.percentage = Math.round((subjectData.present / subjectData.total) * 100 * 100) / 100;
    });
    
    return Array.from(subjectWise.values());
  }

  // Get weekly attendance trend (last 5 weekdays)
  getWeeklyAttendanceTrend() {
    const records = this.data.attendance;
    const last5Days: { name: string; attendance: number }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Get last 5 weekdays
    const dates: Date[] = [];
    let daysBack = 0;
    while (dates.length < 5) {
      const date = new Date();
      date.setDate(date.getDate() - daysBack);
      if (date.getDay() !== 0 && date.getDay() !== 6) { // Skip weekends
        dates.push(date);
      }
      daysBack++;
    }
    
    dates.reverse().forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dayRecords = records.filter(r => r.date === dateStr);
      const presentRecords = dayRecords.filter(r => r.status === 'present').length;
      const attendancePercentage = dayRecords.length > 0 
        ? Math.round((presentRecords / dayRecords.length) * 100)
        : 0;
      
      last5Days.push({
        name: dayNames[date.getDay()],
        attendance: attendancePercentage
      });
    });
    
    return last5Days;
  }

  // Get attendance distribution for pie chart
  getAttendanceDistribution() {
    const students = this.data.students;
    let excellent = 0; // >90%
    let good = 0; // 85-90%
    let average = 0; // 75-85%
    let poor = 0; // <75%
    
    students.forEach(student => {
      const records = this.data.attendance.filter(a => a.studentId === student.id);
      const presentRecords = records.filter(a => a.status === 'present').length;
      const attendancePercentage = records.length > 0 
        ? (presentRecords / records.length) * 100 
        : 0;
      
      if (attendancePercentage > 90) excellent++;
      else if (attendancePercentage >= 85) good++;
      else if (attendancePercentage >= 75) average++;
      else poor++;
    });
    
    const total = students.length;
    return [
      { name: 'Excellent (>90%)', value: total > 0 ? Math.round((excellent / total) * 100) : 0, color: '#10B981' },
      { name: 'Good (85-90%)', value: total > 0 ? Math.round((good / total) * 100) : 0, color: '#3B82F6' },
      { name: 'Average (75-85%)', value: total > 0 ? Math.round((average / total) * 100) : 0, color: '#F59E0B' },
      { name: 'Poor (<75%)', value: total > 0 ? Math.round((poor / total) * 100) : 0, color: '#EF4444' },
    ];
  }

  // Get recent attendance for a student (last 7 records)
  getRecentAttendance(studentId: string) {
    const records = this.data.attendance
      .filter(a => a.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);
    
    return records.map(record => {
      const subject = this.data.subjects.find(s => s.id === record.subjectId);
      return {
        date: record.date,
        subject: subject?.code || 'Unknown',
        status: record.status
      };
    });
  }

  // Export all data to Excel file (public method - includes passwords)
  exportToExcel(): void {
    this.exportToExcelFile();
  }

  // Import data from Excel file
  importFromExcel(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Import Students
          if (workbook.SheetNames.includes('Students')) {
            const studentsSheet = workbook.Sheets['Students'];
            const studentsJson = XLSX.utils.sheet_to_json(studentsSheet);
            
            studentsJson.forEach((row: any) => {
              const dept = this.data.departments.find(d => d.name === row['Department'] || d.code === row['Department']);
              if (dept && !this.data.students.some(s => s.rollNumber === row['Roll Number'])) {
                this.data.students.push({
                  id: `std_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name: row['Name'],
                  email: row['Email'],
                  password: 'student123', // Default password
                  rollNumber: row['Roll Number'],
                  departmentId: dept.id,
                  section: row['Section'] || 'A',
                  phone: row['Phone'] || '',
                  year: row['Year'] || 1
                });
              }
            });
          }

          // Import Faculty (with passwords)
          if (workbook.SheetNames.includes('Faculty')) {
            const facultySheet = workbook.Sheets['Faculty'];
            const facultyJson = XLSX.utils.sheet_to_json(facultySheet);
            
            facultyJson.forEach((row: any) => {
              const dept = this.data.departments.find(d => d.name === row['Department'] || d.code === row['Department']);
              if (dept) {
                const subjectCodes = (row['Subjects'] || '').toString().split(',').map((s: string) => s.trim());
                const subjectIds = subjectCodes
                  .map((code: string) => this.data.subjects.find(s => s.code === code)?.id)
                  .filter(Boolean) as string[];

                // Check if faculty exists, update if exists, add if new
                const existingIndex = this.data.faculty.findIndex(f => f.email === row['Email']);
                const facultyData = {
                  id: existingIndex >= 0 ? this.data.faculty[existingIndex].id : `fac_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  name: row['Name'],
                  email: row['Email'],
                  password: row['Password'] || 'faculty123',
                  departmentId: dept.id,
                  phone: row['Phone'] || '',
                  subjects: subjectIds
                };

                if (existingIndex >= 0) {
                  this.data.faculty[existingIndex] = facultyData;
                } else {
                  this.data.faculty.push(facultyData);
                }
              }
            });
          }

          // Import Departments
          if (workbook.SheetNames.includes('Departments')) {
            const deptSheet = workbook.Sheets['Departments'];
            const deptJson = XLSX.utils.sheet_to_json(deptSheet);
            
            deptJson.forEach((row: any) => {
              if (!this.data.departments.some(d => d.code === row['Code'])) {
                this.data.departments.push({
                  id: `dept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  code: row['Code'],
                  name: row['Name'],
                  head: row['Head'] || undefined
                });
              }
            });
          }

          // Import Subjects
          if (workbook.SheetNames.includes('Subjects')) {
            const subjSheet = workbook.Sheets['Subjects'];
            const subjJson = XLSX.utils.sheet_to_json(subjSheet);
            
            subjJson.forEach((row: any) => {
              const dept = this.data.departments.find(d => d.name === row['Department'] || d.code === row['Department']);
              if (dept && !this.data.subjects.some(s => s.code === row['Code'])) {
                this.data.subjects.push({
                  id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  code: row['Code'],
                  name: row['Name'],
                  departmentId: dept.id,
                  credits: row['Credits'] || 3
                });
              }
            });
          }

          // Import Attendance Records
          if (workbook.SheetNames.includes('Attendance')) {
            const attSheet = workbook.Sheets['Attendance'];
            const attJson = XLSX.utils.sheet_to_json(attSheet);
            
            attJson.forEach((row: any) => {
              const student = this.data.students.find(s => s.rollNumber === row['Student Roll Number']);
              const subject = this.data.subjects.find(s => s.code === row['Subject Code']);
              const faculty = this.data.faculty.find(f => f.name === row['Faculty']);
              
              if (student && subject && faculty) {
                // Check if record already exists
                const exists = this.data.attendance.some(a => 
                  a.studentId === student.id &&
                  a.subjectId === subject.id &&
                  a.date === row['Date']
                );

                if (!exists) {
                  this.data.attendance.push({
                    id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    studentId: student.id,
                    subjectId: subject.id,
                    facultyId: faculty.id,
                    date: row['Date'],
                    status: row['Status']?.toLowerCase() === 'present' ? 'present' : 'absent',
                    section: row['Section'] || student.section
                  });
                }
              }
            });
          }

          // Save to localStorage and export to XLSX
          this.save();
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  resetDatabase() {
    this.data = { ...mockDatabase };
    this.save();
  }
}

export const db = new MockDbService();