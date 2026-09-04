import tempfile
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from PIL import Image

from .models import UserProfile


class ProfilePageTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="profile-tester",
            email="profile-tester@example.com",
            password="Testpass123",
        )

    # Anonymous users should be required to log in
    def test_anonymous_user_is_redirected_to_login(self):
        response = self.client.get(reverse("user_profile"))

        expected_url = f"{reverse('login')}?next={reverse('user_profile')}"
        self.assertRedirects(response, expected_url)

    # Signed-in users should see their own profile
    def test_authenticated_user_can_access_profile(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("user_profile"))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "game/user_profile.html")
        self.assertContains(response, self.user.username)
        self.assertContains(response, self.user.email)

    def test_profile_displays_email_empty_state(self):
        self.user.email = ""
        self.user.save(update_fields=["email"])
        self.client.force_login(self.user)

        response = self.client.get(reverse("user_profile"))

        self.assertContains(response, "Not provided")

    # Email should remain disabled in edit mode
    def test_edit_mode_keeps_email_disabled(self):
        self.client.force_login(self.user)

        response = self.client.get(f"{reverse('user_profile')}?edit=1")

        self.assertContains(response, 'name="email"')
        self.assertContains(response, "disabled")

    def test_user_can_update_username_but_not_email(self):
        self.client.force_login(self.user)

        response = self.client.post(
            reverse("user_profile"),
            {
                "username": "updated-profile-tester",
                "email": "changed@example.com",
            },
        )

        self.assertRedirects(response, reverse("user_profile"))
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "updated-profile-tester")
        self.assertEqual(self.user.email, "profile-tester@example.com")

    def test_duplicate_username_is_rejected(self):
        get_user_model().objects.create_user(
            username="existing-user",
            password="Testpass123",
        )
        self.client.force_login(self.user)

        response = self.client.post(
            reverse("user_profile"),
            {"username": "existing-user"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "This username is already in use.")

    # A valid avatar should be saved under the media root
    def test_valid_avatar_is_saved(self):
        self.client.force_login(self.user)
        avatar = make_test_avatar()

        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                response = self.client.post(
                    reverse("user_profile"),
                    {"username": self.user.username, "avatar": avatar},
                )

                self.assertRedirects(response, reverse("user_profile"))
                profile = UserProfile.objects.get(user=self.user)
                self.assertTrue(profile.avatar.name.endswith(".png"))
                self.assertTrue(profile.avatar.storage.exists(profile.avatar.name))


def make_test_avatar():
    image_bytes = BytesIO()
    Image.new("RGB", (8, 8), color="#2457d6").save(image_bytes, format="PNG")
    return SimpleUploadedFile(
        "avatar.png",
        image_bytes.getvalue(),
        content_type="image/png",
    )
