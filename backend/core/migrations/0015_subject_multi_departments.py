from django.db import migrations, models


def forwards_copy_subject_departments(apps, schema_editor):
    Subject = apps.get_model('core', 'Subject')
    User = apps.get_model('core', 'User')
    for subject in Subject.objects.all():
        if getattr(subject, 'department_id', None):
            subject.departments.add(subject.department_id)

    canonical_by_key = {}
    duplicate_id_map = {}
    for subject in Subject.objects.all().order_by('id'):
        key = ((subject.code or '').strip().lower(), str(subject.year or '').strip(), str(subject.semester or '').strip())
        canonical = canonical_by_key.get(key)
        if canonical is None:
            canonical_by_key[key] = subject
            continue
        canonical.departments.add(*subject.departments.values_list('id', flat=True))
        duplicate_id_map[str(subject.id)] = str(canonical.id)
        subject.delete()

    if duplicate_id_map:
        for user in User.objects.exclude(assigned_subject_ids__isnull=True).exclude(assigned_subject_ids=''):
            tokens = [x.strip() for x in (user.assigned_subject_ids or '').split(',') if x.strip()]
            if not tokens:
                continue
            remapped = []
            seen = set()
            for token in tokens:
                next_token = duplicate_id_map.get(token, token)
                if next_token not in seen:
                    seen.add(next_token)
                    remapped.append(next_token)
            user.assigned_subject_ids = ','.join(remapped)
            user.save(update_fields=['assigned_subject_ids'])


def backwards_restore_subject_department(apps, schema_editor):
    Subject = apps.get_model('core', 'Subject')
    for subject in Subject.objects.all():
        first_department = subject.departments.order_by('id').first()
        subject.department_id = first_department.id if first_department else None
        subject.save(update_fields=['department'])


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0014_user_is_detained'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='subject',
            unique_together=set(),
        ),
        migrations.AddField(
            model_name='subject',
            name='departments',
            field=models.ManyToManyField(related_name='subjects', to='core.department'),
        ),
        migrations.RunPython(forwards_copy_subject_departments, backwards_restore_subject_department),
        migrations.RemoveField(
            model_name='subject',
            name='department',
        ),
        migrations.AlterUniqueTogether(
            name='subject',
            unique_together={('code', 'year', 'semester')},
        ),
    ]
