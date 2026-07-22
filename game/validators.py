import re

from django.core.exceptions import ValidationError


class LetterAndNumberPasswordValidator:
    def validate(self, password, user=None):
        if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
            raise ValidationError(
                "Your password must contain both letters and numbers.",
                code="password_missing_letter_or_number",
            )

    def get_help_text(self):
        return "Your password must contain both letters and numbers."
