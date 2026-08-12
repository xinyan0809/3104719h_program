from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse


class AccountMenuTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="account-menu-tester",
            password="Testpass123",
        )

    def test_authenticated_navigation_uses_one_account_menu(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("home"))

        self.assertContains(response, 'class="account-menu"', count=1)
        self.assertContains(response, 'action="/logout/"', count=1)
        self.assertContains(response, "Log out", count=1)
        self.assertNotContains(response, "Signed in")

    def test_logout_from_account_menu_ends_session(self):
        self.client.force_login(self.user)

        response = self.client.post(reverse("logout"))

        self.assertRedirects(response, reverse("login"))
        self.assertNotIn("_auth_user_id", self.client.session)
