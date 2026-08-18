
from django.db import models
from django.contrib.auth.models import AbstractUser


class Department(models.Model):
    """Branch/Department (e.g. CSE, EE)."""
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return f"{self.code} - {self.name}"


class Section(models.Model):
    """Section name (e.g. A, 1, Alpha, Section-1). Accepts character, string, or number stored as string."""
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class Subject(models.Model):
    """Subject that can belong to one or more departments, per year and semester."""
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50)
    departments = models.ManyToManyField(Department, related_name='subjects')
    year = models.CharField(max_length=20, default='1', help_text='Academic year: 1, 2, 3, 4, etc.')
    semester = models.CharField(max_length=20, default='1', help_text='Semester within year: 1 or 2')

    class Meta:
        unique_together = [['code', 'year', 'semester']]

    def __str__(self):
        return f"{self.code} - {self.name} (Year {self.year}, Sem {self.semester})"


class User(AbstractUser):
    ROLE_CHOICES = (
        ('student', 'Student'),
        ('faculty', 'Faculty'),
        ('admin', 'Admin'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    full_name = models.CharField(max_length=150, blank=True, null=True)
    roll_number = models.CharField(max_length=50, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    # Comma-separated section names (e.g. "A,B") for students in multiple sections
    section = models.CharField(
        max_length=400, blank=True, null=True,
        help_text='Comma-separated section names for students in multiple sections.',
    )
    year = models.CharField(max_length=50, blank=True, null=True)
    # Stored only for admin visibility after password change (insecure; use with caution)
    visible_password = models.CharField(max_length=128, blank=True, null=True)
    # Comma-separated subject IDs assigned to faculty (e.g. "1,3,5")
    assigned_subject_ids = models.CharField(max_length=500, blank=True, null=True)
    # Students marked detained are excluded from attendance marking (faculty/admin); admin can toggle.
    is_detained = models.BooleanField(default=False)

class Attendance(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendances')
    subject = models.CharField(max_length=100)
    date = models.DateField()
    status = models.CharField(max_length=10)
    # Hours attended (out of total) for this record; optional for backward compatibility
    hours = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text='Number of hours the student attended (attended_hours).'
    )
    total_hours = models.DecimalField(
        max_digits=6, decimal_places=2, null=True, blank=True,
        help_text='Total hours for this session/date.'
    )

    def __str__(self):
        return f"{self.student.username} - {self.subject} - {self.date}"


class AttendancePortalControl(models.Model):
    """Singleton-like control for attendance portal access by role."""
    freeze_faculty_portal = models.BooleanField(default=False)
    freeze_student_portal = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return (
            f"AttendancePortalControl("
            f"faculty={self.freeze_faculty_portal}, "
            f"student={self.freeze_student_portal})"
        )


class FacultyDepartmentSection(models.Model):
    """Model to store faculty assignments to specific sections within departments."""
    faculty = models.ForeignKey(User, on_delete=models.CASCADE, related_name='faculty_department_sections')
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='faculty_assignments')
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='faculty_assignments')

    class Meta:
        unique_together = [['faculty', 'department', 'section']]
        verbose_name = 'Faculty Department Section'
        verbose_name_plural = 'Faculty Department Sections'

    def __str__(self):
        return f"{self.faculty.username} - {self.department.code} - {self.section.name}"


class QRAttendanceSession(models.Model):
    """Model to store QR attendance session information."""
    faculty = models.ForeignKey(User, on_delete=models.CASCADE, related_name='qr_attendance_sessions')
    subject = models.CharField(max_length=100)
    year = models.CharField(max_length=20)
    branch = models.CharField(max_length=100)
    branches = models.CharField(max_length=500, default='', blank=True, help_text='Comma-separated branch codes')
    sections = models.CharField(max_length=500, help_text='Comma-separated section names')
    duration_minutes = models.IntegerField()
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    current_qr_token = models.CharField(max_length=100, unique=True)
    token_expires_at = models.DateTimeField()
    token_refresh_interval = models.IntegerField(default=5, help_text='Token refresh interval in seconds')
    random_session_id = models.CharField(max_length=5, unique=True, help_text='Random 5-digit session ID for attendance')

    class Meta:
        verbose_name = 'QR Attendance Session'
        verbose_name_plural = 'QR Attendance Sessions'

    def __str__(self):
        return f"{self.faculty.username} - {self.subject} - {self.start_time}"


class QRAttendanceRecord(models.Model):
    """Model to store individual QR attendance records."""
    session = models.ForeignKey(QRAttendanceSession, on_delete=models.CASCADE, related_name='attendance_records')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='qr_attendance_records')
    device_id = models.CharField(max_length=255, help_text='Unique identifier for the device used')
    scanned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['session', 'student'], ['session', 'device_id']]
        verbose_name = 'QR Attendance Record'
        verbose_name_plural = 'QR Attendance Records'

    def __str__(self):
        return f"{self.student.username} - {self.session.subject} - {self.scanned_at}"
