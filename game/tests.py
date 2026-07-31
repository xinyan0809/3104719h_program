from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse


class PoseTestAccessTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="pose-tester",
            email="pose-tester@example.com",
            password="Testpass123",
        )

    def test_anonymous_user_is_redirected_to_login(self):
        response = self.client.get(reverse("pose_test"))

        expected_login_url = f"{reverse('login')}?next={reverse('pose_test')}"
        self.assertRedirects(response, expected_login_url)

    def test_authenticated_user_can_access_pose_test(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("pose_test"))

        self.assertEqual(response.status_code, 200)

    def test_pose_test_uses_expected_template(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("pose_test"))

        self.assertTemplateUsed(response, "game/pose_test.html")
