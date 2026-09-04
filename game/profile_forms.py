from django import forms
from django.contrib.auth import get_user_model
from django.core.validators import FileExtensionValidator

from .models import UserProfile


MAX_AVATAR_SIZE = 5 * 1024 * 1024


#Manage username and avatar updates while keeping email read-only
class ProfileUpdateForm(forms.Form):
    username = forms.CharField(
        max_length=150,
        widget=forms.TextInput(
            attrs={
                "autocomplete": "username",
                "class": "profile-input",
            }
        ),
    )
    email = forms.EmailField(
        required=False,
        disabled=True,
        widget=forms.EmailInput(
            attrs={
                "autocomplete": "email",
                "class": "profile-input profile-input--disabled",
            }
        ),
    )
    avatar = forms.ImageField(
        required=False,
        validators=[FileExtensionValidator(["jpg", "jpeg", "png", "webp"])],
        widget=forms.FileInput(
            attrs={
                "accept": "image/png,image/jpeg,image/webp",
            }
        ),
    )

   # Populate initial values from the current user
    def __init__(self, *args, user, **kwargs):
        self.user = user
        initial = kwargs.setdefault("initial", {})
        initial.setdefault("username", user.username)
        initial.setdefault("email", user.email)
        super().__init__(*args, **kwargs)

    def clean_username(self):
        username = self.cleaned_data["username"].strip()
        user_model = get_user_model()
        username_exists = (
            user_model.objects.filter(username__iexact=username)
            .exclude(pk=self.user.pk)
            .exists()
        )
        if username_exists:
            raise forms.ValidationError("This username is already in use.")
        return username

    def clean_avatar(self):
        avatar = self.cleaned_data.get("avatar")
        if avatar and avatar.size > MAX_AVATAR_SIZE:
            raise forms.ValidationError("The image must be 5 MB or smaller.")
        return avatar

    # Save username and avatar, then remove the replaced file
    def save(self):
        self.user.username = self.cleaned_data["username"]
        self.user.save(update_fields=["username"])

        avatar = self.cleaned_data.get("avatar")
        if avatar:
            profile, _ = UserProfile.objects.get_or_create(user=self.user)
            previous_avatar_name = profile.avatar.name if profile.avatar else ""
            profile.avatar = avatar
            profile.save(update_fields=["avatar"])

            if previous_avatar_name and previous_avatar_name != profile.avatar.name:
                profile.avatar.storage.delete(previous_avatar_name)

        return self.user
