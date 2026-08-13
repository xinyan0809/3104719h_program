from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse


class BodyDodgeAccessTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="body-dodge-tester",
            email="body-dodge-tester@example.com",
            password="Testpass123",
        )

    def test_anonymous_user_is_redirected_to_login(self):
        response = self.client.get(reverse("body_dodge"))

        expected_login_url = f"{reverse('login')}?next={reverse('body_dodge')}"
        self.assertRedirects(response, expected_login_url)

    def test_authenticated_user_can_access_body_dodge(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("body_dodge"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="body-dodge-root"')

    def test_body_dodge_uses_expected_template(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("body_dodge"))

        self.assertTemplateUsed(response, "game/body_dodge.html")

    def test_game_selection_links_to_body_dodge(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("game_selection"))

        self.assertContains(response, f'href="{reverse("body_dodge")}"')
        self.assertContains(response, "Body Dodge")
