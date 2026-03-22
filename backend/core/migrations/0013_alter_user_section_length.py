# Generated manually for multi-section students (comma-separated values)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0012_user_assigned_subject_ids'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='section',
            field=models.CharField(blank=True, help_text='Comma-separated section names for students in multiple sections.', max_length=400, null=True),
        ),
    ]
