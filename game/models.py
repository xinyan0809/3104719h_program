from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models


def avatar_upload_path(instance, filename):
    suffix = Path(filename).suffix.lower()
    return f"profile_avatars/user_{instance.user_id}/{uuid4().hex}{suffix}"


# Store one-to-one profile data
class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_profile",
    )
    avatar = models.ImageField(
        upload_to=avatar_upload_path,
        validators=[FileExtensionValidator(["jpg", "jpeg", "png", "webp"])],
        blank=True,
    )

    def __str__(self):
        return f"Profile for {self.user.get_username()}"

# Store score and duration for each completed game
class GameRecord(models.Model):
    class Game(models.TextChoices):
        FRUIT_CATCH = "fruit-catch", "Fruit Catch"
        TARGET_SHOT = "target-shot", "Target Shot"
        BODY_DODGE = "body-dodge", "Body Dodge"

    # Link the user
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="game_records",
    )
    game_id = models.CharField(max_length=20, choices=Game.choices)
    score = models.PositiveIntegerField()
    duration_seconds = models.PositiveIntegerField()
    played_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-played_at", "-pk"]
        indexes = [
            models.Index(
                fields=["user", "-played_at", "-id"],
                name="game_record_user_time_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.user.get_username()} - "
            f"{self.get_game_id_display()} ({self.score})"
        )
