from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0015_subject_multi_departments'),
    ]

    operations = [
        migrations.CreateModel(
            name='AttendancePortalControl',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('freeze_faculty_portal', models.BooleanField(default=False)),
                ('freeze_student_portal', models.BooleanField(default=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
