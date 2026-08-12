from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse


class NavigationPageTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="navigation-tester",
            email="navigation-tester@example.com",
            password="Testpass123",
        )

    def test_anonymous_user_is_redirected_from_game_selection(self):
        response = self.client.get(reverse("game_selection"))

        expected_url = f"{reverse('login')}?next={reverse('game_selection')}"
        self.assertRedirects(response, expected_url)

    def test_game_selection_links_to_fruit_catch(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("game_selection"))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "game/game_selection.html")
        self.assertContains(response, f'href="{reverse("fruit_catch")}"')
        self.assertContains(response, "Fruit Catch")

    def test_anonymous_user_is_redirected_from_profile(self):
        response = self.client.get(reverse("user_profile"))

        expected_url = f"{reverse('login')}?next={reverse('user_profile')}"
        self.assertRedirects(response, expected_url)

    def test_profile_displays_current_user(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("user_profile"))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "game/user_profile.html")
        self.assertContains(response, self.user.username)
        self.assertContains(response, self.user.email)

    def test_authenticated_navigation_uses_new_page_links(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("home"))

        self.assertContains(response, f'href="{reverse("game_selection")}"')
        self.assertContains(response, f'href="{reverse("user_profile")}"')
        self.assertContains(response, "Play Game")
        self.assertContains(response, "User Profile")
        self.assertNotContains(response, ">Pose Test<")
