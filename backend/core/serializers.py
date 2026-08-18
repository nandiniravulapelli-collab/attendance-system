
from rest_framework import serializers
from .models import User, Attendance, Department, Subject, Section, FacultyDepartmentSection, QRAttendanceSession, QRAttendanceRecord
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model

class RegisterSerializer(serializers.ModelSerializer):
    subjects = serializers.SerializerMethodField(read_only=True)
    sections = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'password', 'role',
            'full_name', 'roll_number', 'phone',
            'department', 'section', 'sections', 'year',
            'is_detained',
            'assigned_subject_ids', 'subjects'
        )
        extra_kwargs = {
            'password': {'write_only': True},
            'assigned_subject_ids': {'required': False},
            'is_detained': {'required': False},
        }

    def get_subjects(self, obj):
        s = (obj.assigned_subject_ids or '').strip()
        return [x.strip() for x in s.split(',') if x.strip()] if s else []

    def get_sections(self, obj):
        s = (obj.section or '').strip()
        return [x.strip() for x in s.split(',') if x.strip()] if s else []

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.visible_password = password
        user.save()
        return user

User = get_user_model()

from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    role = serializers.CharField()

    def validate(self, data):
        try:
            user = User.objects.get(email=data['email'])
        except User.DoesNotExist:
            raise serializers.ValidationError({"detail": "User not found. Use the same email you used when creating the account."})

        # Superusers can always sign in as admin; others must match stored role
        if data['role'] == 'admin' and user.is_superuser:
            pass  # allow
        elif user.role != data['role']:
            raise serializers.ValidationError({"detail": "Incorrect role selected. Choose Admin to sign in as administrator."})

        if not user.check_password(data['password']):
            raise serializers.ValidationError({"detail": "Invalid password."})

        data['user'] = user
        return data



class UserSerializer(serializers.ModelSerializer):
    """Read and update user (e.g. student details). No password exposure."""
    departments = serializers.SerializerMethodField(read_only=True)
    subjects = serializers.SerializerMethodField(read_only=True)
    sections = serializers.SerializerMethodField(read_only=True)
    faculty_department_sections = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'role',
            'full_name', 'roll_number', 'phone',
            'department', 'departments', 'section', 'sections', 'year',
            'is_detained',
            'assigned_subject_ids', 'subjects', 'faculty_department_sections'
        )
        read_only_fields = ('id', 'username', 'role')
        extra_kwargs = {'assigned_subject_ids': {'required': False}, 'is_detained': {'required': False}}

    def get_departments(self, obj):
        s = (obj.department or '').strip()
        return [x.strip() for x in s.split(',') if x.strip()]

    def get_subjects(self, obj):
        s = (obj.assigned_subject_ids or '').strip()
        if not s:
            return []
        return [x.strip() for x in s.split(',') if x.strip()]

    def get_sections(self, obj):
        s = (obj.section or '').strip()
        return [x.strip() for x in s.split(',') if x.strip()] if s else []

    def get_faculty_department_sections(self, obj):
        """Return faculty department-section assignments for faculty users."""
        if obj.role != 'faculty':
            return []
        assignments = FacultyDepartmentSection.objects.filter(faculty=obj).select_related('department', 'section')
        return [
            {
                'department_code': assignment.department.code,
                'section_name': assignment.section.name
            }
            for assignment in assignments
        ]

    def update(self, instance, validated_data):
        # Username/role are read-only on the serializer; email may be updated by allowed users.
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = '__all__'


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ('id', 'name', 'code')


class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = ('id', 'name')


class SubjectSerializer(serializers.ModelSerializer):
    departments = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), many=True)
    department_codes = serializers.SerializerMethodField(read_only=True)
    department_code = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Subject
        fields = ('id', 'name', 'code', 'departments', 'department_codes', 'department_code', 'year', 'semester')

    def get_department_codes(self, obj):
        codes = [d.code for d in obj.departments.all()]
        return sorted(codes)

    def get_department_code(self, obj):
        codes = self.get_department_codes(obj)
        return codes[0] if codes else ''

    def create(self, validated_data):
        departments = validated_data.pop('departments', [])
        subject = Subject.objects.create(**validated_data)
        if departments:
            subject.departments.set(departments)
        return subject

    def update(self, instance, validated_data):
        departments = validated_data.pop('departments', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if departments is not None:
            instance.departments.set(departments)
        return instance


class FacultyDepartmentSectionSerializer(serializers.ModelSerializer):
    """Serializer for faculty department-section assignments."""
    department_code = serializers.SerializerMethodField(read_only=True)
    section_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = FacultyDepartmentSection
        fields = ('id', 'faculty', 'department', 'section', 'department_code', 'section_name')
        read_only_fields = ('id', 'faculty')

    def get_department_code(self, obj):
        return obj.department.code if obj.department else None

    def get_section_name(self, obj):
        return obj.section.name if obj.section else None


class QRAttendanceSessionSerializer(serializers.ModelSerializer):
    """Serializer for QR attendance sessions."""
    faculty_name = serializers.SerializerMethodField(read_only=True)
    attendance_count = serializers.SerializerMethodField(read_only=True)
    is_expired = serializers.SerializerMethodField(read_only=True)
    branches = serializers.SerializerMethodField(read_only=True)
    duration_hours = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = QRAttendanceSession
        fields = (
            'id', 'faculty', 'faculty_name', 'subject', 'year', 'branch', 'branches', 'sections',
            'duration_minutes', 'duration_hours', 'start_time', 'end_time', 'is_active', 
            'current_qr_token', 'token_expires_at', 'token_refresh_interval',
            'attendance_count', 'is_expired'
        )
        read_only_fields = ('id', 'faculty', 'start_time', 'current_qr_token', 'token_expires_at')

    def get_faculty_name(self, obj):
        return obj.faculty.full_name or obj.faculty.username

    def get_attendance_count(self, obj):
        return obj.attendance_records.count()

    def get_is_expired(self, obj):
        from django.utils import timezone
        return timezone.now() > obj.end_time

    def get_branches(self, obj):
        # Return branches field if it exists, otherwise use branch field
        if hasattr(obj, 'branches') and obj.branches:
            return obj.branches
        elif obj.branch:
            return obj.branch
        return ''

    def get_duration_hours(self, obj):
        # Convert duration_minutes to hours
        return round(obj.duration_minutes / 60, 2)


class QRAttendanceRecordSerializer(serializers.ModelSerializer):
    """Serializer for QR attendance records."""
    student_name = serializers.SerializerMethodField(read_only=True)
    student_roll_number = serializers.SerializerMethodField(read_only=True)
    student_section = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = QRAttendanceRecord
        fields = (
            'id', 'session', 'student', 'student_name', 'student_roll_number', 
            'student_section', 'device_id', 'scanned_at'
        )
        read_only_fields = ('id', 'session', 'student', 'scanned_at')

    def get_student_name(self, obj):
        return obj.student.full_name or obj.student.username

    def get_student_roll_number(self, obj):
        return obj.student.roll_number

    def get_student_section(self, obj):
        return obj.student.section
