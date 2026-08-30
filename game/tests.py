from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse


class CookieNoticeTemplateTests(TestCase):
    def test_login_page_includes_shared_cookie_notice(self):
        response = self.client.get(reverse("login"))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "partials/cookie_notice.html")
        self.assertContains(response, "PosePlay")
        self.assertContains(response, "Move your body. Control the game.")
        self.assertContains(response, 'id="cookie-notice"')
        self.assertContains(response, "Accept all cookies")
        self.assertContains(response, "Decline")
        self.assertContains(response, "game/vite/cookie-notice.js")


class AuthenticationLayoutTests(TestCase):
    def test_login_page_uses_shared_split_layout(self):
        response = self.client.get(reverse("login"))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "auth_base.html")
        self.assertContains(response, 'class="auth-visual"')
        self.assertContains(response, "game/images/login.png")
        self.assertNotContains(response, 'class="primary-nav"')


class RememberMeLoginTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="remember-tester",
            password="Testpass123",
        )

    def test_login_form_includes_remember_me_checkbox(self):
        response = self.client.get(reverse("login"))

        self.assertContains(response, 'name="remember_me"')
        self.assertContains(response, "Remember me")

    def test_login_without_remember_me_expires_at_browser_close(self):
        response = self.client.post(
            reverse("login"),
            {"username": self.user.username, "password": "Testpass123"},
        )

        self.assertRedirects(response, reverse("home"))
        self.assertTrue(self.client.session.get_expire_at_browser_close())

    def test_login_with_remember_me_uses_persistent_session(self):
        response = self.client.post(
            reverse("login"),
            {
                "username": self.user.username,
                "password": "Testpass123",
                "remember_me": "on",
            },
        )

        self.assertRedirects(response, reverse("home"))
        self.assertFalse(self.client.session.get_expire_at_browser_close())
