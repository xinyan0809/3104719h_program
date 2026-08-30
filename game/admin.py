from django.contrib import admin

from .models import GameRecord, UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'avatar')
    search_fields = ('user__username', 'user__email')
    autocomplete_fields = ('user',)


@admin.register(GameRecord)
class GameRecordAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'game_id',
        'score',
        'duration_seconds',
        'played_at',
    )
    list_filter = ('game_id', 'played_at')
    search_fields = ('user__username', 'user__email')
    autocomplete_fields = ('user',)
    readonly_fields = ('played_at',)
    date_hierarchy = 'played_at'
