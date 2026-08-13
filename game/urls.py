from django.contrib.auth import views as auth_views
from django.urls import path

from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("pose-test/", views.pose_test, name="pose_test"),
    path("games/", views.game_selection, name="game_selection"),
    path("fruit-catch/", views.fruit_catch, name="fruit_catch"),
    path("target-shot/", views.target_shot, name="target_shot"),
    path("body-dodge/", views.body_dodge, name="body_dodge"),
    path("profile/", views.user_profile, name="user_profile"),
    path("register/", views.register, name="register"),
    path("login/", views.RememberMeLoginView.as_view(), name="login"),
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
]
