from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("game", "0001_add_user_profile_avatar"),
    ]

    operations = [
        migrations.CreateModel(
            name="GameRecord",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "game_id",
                    models.CharField(
                        choices=[
                            ("fruit-catch", "Fruit Catch"),
                            ("target-shot", "Target Shot"),
                            ("body-dodge", "Body Dodge"),
                        ],
                        max_length=20,
                    ),
                ),
                ("score", models.PositiveIntegerField()),
                ("duration_seconds", models.PositiveIntegerField()),
                ("played_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="game_records",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-played_at", "-pk"],
                "indexes": [
                    models.Index(
                        fields=["user", "-played_at", "-id"],
                        name="game_record_user_time_idx",
                    ),
                ],
            },
        ),
    ]
