import json

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth import views as auth_views
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Max
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST

from .forms import RegistrationForm, RememberMeAuthenticationForm
from .models import GameRecord, UserProfile
from .profile_forms import ProfileUpdateForm


class RememberMeLoginView(auth_views.LoginView):
    template_name = "registration/login.html"
    authentication_form = RememberMeAuthenticationForm

    def form_valid(self, form):
        response = super().form_valid(form)
        if form.cleaned_data["remember_me"]:
            self.request.session.set_expiry(settings.SESSION_COOKIE_AGE)
        else:
            self.request.session.set_expiry(0)
        return response


@login_required
def home(request):
    return render(request, "game/home.html")


@login_required
@ensure_csrf_cookie
def fruit_catch(request):
    return render(request, "game/fruit_catch.html")


@login_required
@ensure_csrf_cookie
def target_shot(request):
    return render(request, "game/target_shot.html")


@login_required
@ensure_csrf_cookie
def body_dodge(request):
    return render(request, "game/body_dodge.html")


@login_required
def game_selection(request):
    return render(request, "game/game_selection.html")


@login_required
def user_profile(request):
    profile = UserProfile.objects.filter(user=request.user).first()
    is_editing = request.method == "POST" or request.GET.get("edit") == "1"

    if request.method == "POST":
        form = ProfileUpdateForm(
            request.POST,
            request.FILES,
            user=request.user,
        )
        if form.is_valid():
            form.save()
            messages.success(request, "Your profile has been updated.")
            return redirect("user_profile")
    else:
        form = ProfileUpdateForm(user=request.user)

    records = GameRecord.objects.filter(user=request.user)
    stats_by_game = {
        row["game_id"]: row
        for row in records.values("game_id").annotate(
            best_score=Max("score"),
            play_count=Count("id"),
        )
    }
    record_summaries = [
        {
            "game_id": game_id,
            "label": label,
            "best_score": stats_by_game.get(game_id, {}).get("best_score"),
            "play_count": stats_by_game.get(game_id, {}).get("play_count", 0),
        }
        for game_id, label in GameRecord.Game.choices
    ]

    return render(
        request,
        "game/user_profile.html",
        {
            "form": form,
            "profile": profile,
            "is_editing": is_editing,
            "record_summaries": record_summaries,
            "recent_records": records[:8],
        },
    )


@login_required
@require_POST
def save_game_record(request):
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid request body."}, status=400)

    if not isinstance(payload, dict):
        return JsonResponse({"error": "Invalid request body."}, status=400)

    game_id = payload.get("game_id")
    score = payload.get("score")
    duration_seconds = payload.get("duration_seconds")

    if game_id not in GameRecord.Game.values:
        return JsonResponse({"error": "Unknown game."}, status=400)
    if (
        not isinstance(score, int)
        or isinstance(score, bool)
        or not 0 <= score <= 1_000_000
    ):
        return JsonResponse({"error": "Invalid score."}, status=400)
    if (
        not isinstance(duration_seconds, int)
        or isinstance(duration_seconds, bool)
        or not 1 <= duration_seconds <= 3_600
    ):
        return JsonResponse({"error": "Invalid duration."}, status=400)

    record = GameRecord.objects.create(
        user=request.user,
        game_id=game_id,
        score=score,
        duration_seconds=duration_seconds,
    )
    return JsonResponse({"record_id": record.pk}, status=201)


def register(request):
    if request.user.is_authenticated:
        return redirect("home")

    if request.method == "POST":
        form = RegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect("home")
    else:
        form = RegistrationForm()

    return render(request, "registration/register.html", {"form": form})
