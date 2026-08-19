import json

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse

from .models import GameRecord


class GameRecordTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username="record-tester",
            password="Testpass123",
        )
        cls.other_user = get_user_model().objects.create_user(
            username="other-record-tester",
            password="Testpass123",
        )

    def test_anonymous_record_request_is_redirected_to_login(self):
        response = self.client.post(
            reverse("save_game_record"),
            data=json.dumps(
                {
                    "game_id": GameRecord.Game.FRUIT_CATCH,
                    "score": 5,
                    "duration_seconds": 60,
                }
            ),
            content_type="application/json",
        )

        expected_url = (
            f"{reverse('login')}?next={reverse('save_game_record')}"
        )
        self.assertRedirects(response, expected_url)

    def test_authenticated_user_can_save_completed_game(self):
        csrf_client = Client(enforce_csrf_checks=True)
        csrf_client.force_login(self.user)
        game_page = csrf_client.get(reverse("target_shot"))
        csrf_token = game_page.cookies["csrftoken"].value

        response = csrf_client.post(
            reverse("save_game_record"),
            data=json.dumps(
                {
                    "game_id": GameRecord.Game.TARGET_SHOT,
                    "score": 12,
                    "duration_seconds": 60,
                }
            ),
            content_type="application/json",
            headers={"X-CSRFToken": csrf_token},
        )

        self.assertEqual(response.status_code, 201)
        record = GameRecord.objects.get()
        self.assertEqual(record.user, self.user)
        self.assertEqual(record.game_id, GameRecord.Game.TARGET_SHOT)
        self.assertEqual(record.score, 12)
        self.assertEqual(record.duration_seconds, 60)

    def test_invalid_game_record_is_rejected(self):
        self.client.force_login(self.user)

        response = self.client.post(
            reverse("save_game_record"),
            data=json.dumps(
                {
                    "game_id": "unknown-game",
                    "score": -1,
                    "duration_seconds": 0,
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(GameRecord.objects.exists())

    def test_profile_shows_only_current_users_records_and_best_score(self):
        GameRecord.objects.create(
            user=self.user,
            game_id=GameRecord.Game.FRUIT_CATCH,
            score=3,
            duration_seconds=60,
        )
        latest = GameRecord.objects.create(
            user=self.user,
            game_id=GameRecord.Game.FRUIT_CATCH,
            score=7,
            duration_seconds=60,
        )
        GameRecord.objects.create(
            user=self.other_user,
            game_id=GameRecord.Game.FRUIT_CATCH,
            score=99,
            duration_seconds=60,
        )
        self.client.force_login(self.user)

        response = self.client.get(reverse("user_profile"))

        summaries = {
            summary["game_id"]: summary
            for summary in response.context["record_summaries"]
        }
        fruit_summary = summaries[GameRecord.Game.FRUIT_CATCH]
        self.assertEqual(fruit_summary["best_score"], 7)
        self.assertEqual(fruit_summary["play_count"], 2)
        self.assertEqual(list(response.context["recent_records"])[0], latest)
        self.assertContains(response, "Game records")
        self.assertContains(response, "7")
        self.assertNotContains(response, "99 points")

    def test_game_pages_set_csrf_cookie_and_record_endpoint(self):
        self.client.force_login(self.user)

        for page_name in ("fruit_catch", "target_shot", "body_dodge"):
            with self.subTest(page=page_name):
                response = self.client.get(reverse(page_name))

                self.assertIn("csrftoken", response.cookies)
                self.assertContains(
                    response,
                    f'data-record-url="{reverse("save_game_record")}"',
                )
