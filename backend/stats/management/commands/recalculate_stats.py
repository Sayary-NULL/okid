from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from stats.services import recalculate_stats


class Command(BaseCommand):
    help = "Пересчитать таблицы агрегатов статистики с нуля."

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            help="Пересчитать статистику только для указанного пользователя.",
        )

    def handle(self, *args, **options):
        user = None
        username = options.get("username")
        if username:
            user = User.objects.filter(username=username).first()
            if user is None:
                raise CommandError(f"Пользователь «{username}» не найден.")
        created = recalculate_stats(user=user)
        self.stdout.write(
            self.style.SUCCESS(
                f"Статистика пересчитана. Создано строк: {created}."
            )
        )
