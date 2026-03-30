# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_alter_user_section_length'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_detained',
            field=models.BooleanField(default=False),
        ),
    ]
