from django.conf import settings
from django.contrib.auth import login
from django.contrib.auth import views as auth_views
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from .forms import RegistrationForm, RememberMeAuthenticationForm


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
def game_selection(request):
    return render(request, "game/game_selection.html")


@login_required
def user_profile(request):
    return render(request, "game/user_profile.html")


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
