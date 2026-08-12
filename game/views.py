from django.conf import settings
from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth import views as auth_views
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from .forms import RegistrationForm, RememberMeAuthenticationForm
from .models import UserProfile
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
def pose_test(request):
    return render(request, "game/pose_test.html")


@login_required
def fruit_catch(request):
    return render(request, "game/fruit_catch.html")


@login_required
def target_shot(request):
    return render(request, "game/target_shot.html")


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

    return render(
        request,
        "game/user_profile.html",
        {"form": form, "profile": profile, "is_editing": is_editing},
    )


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
