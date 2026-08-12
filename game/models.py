from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models


def avatar_upload_path(instance, filename):
    suffix = Path(filename).suffix.lower()
    return f"profile_avatars/user_{instance.user_id}/{uuid4().hex}{suffix}"


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
