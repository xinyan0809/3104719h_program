from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse


class TargetShotAccessTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="target-shot-tester",
            email="target-shot-tester@example.com",
            password="Testpass123",
        )

    def test_anonymous_user_is_redirected_to_login(self):
        response = self.client.get(reverse("target_shot"))

        expected_login_url = f"{reverse('login')}?next={reverse('target_shot')}"
        self.assertRedirects(response, expected_login_url)

    def test_authenticated_user_can_access_target_shot(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("target_shot"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="target-shot-root"')

    def test_target_shot_uses_expected_template(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("target_shot"))

        self.assertTemplateUsed(response, "game/target_shot.html")

    def test_game_selection_links_to_target_shot(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("game_selection"))

        self.assertContains(response, f'href="{reverse("target_shot")}"')
        self.assertContains(response, "Target Shot")
