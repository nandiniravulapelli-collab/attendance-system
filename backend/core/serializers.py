
from rest_framework import serializers
from .models import User, Attendance, Department, Subject, Section
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

    class Meta:
        model = User
        fields = (
            'id', 'username', 'email', 'role',
            'full_name', 'roll_number', 'phone',
            'department', 'departments', 'section', 'sections', 'year',
            'is_detained',
            'assigned_subject_ids', 'subjects'
        )
        read_only_fields = ('id', 'username', 'email', 'role')
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

    def update(self, instance, validated_data):
        # Don't allow changing username/email/role via this serializer
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
    department_code = serializers.CharField(source='department.code', read_only=True)

    class Meta:
        model = Subject
        fields = ('id', 'name', 'code', 'department', 'department_code', 'year', 'semester')
