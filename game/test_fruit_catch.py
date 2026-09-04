from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

# Verify Fruit Catch page access control
class FruitCatchAccessTests(TestCase):
    # Create the signed-in user used by access tests
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="fruit-catch-tester",
            email="fruit-catch-tester@example.com",
            password="Testpass123",
        )

    # Anonymous access should redirect to login
    def test_anonymous_user_is_redirected_to_login(self):
        response = self.client.get(reverse("fruit_catch"))

        expected_login_url = f"{reverse('login')}?next={reverse('fruit_catch')}"
        self.assertRedirects(response, expected_login_url)

    # Authenticated users should see the game root
    def test_authenticated_user_can_access_fruit_catch(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("fruit_catch"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'id="fruit-catch-root"')

    # The page should use the Fruit Catch template
    def test_fruit_catch_uses_expected_template(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("fruit_catch"))

        self.assertTemplateUsed(response, "game/fruit_catch.html")
