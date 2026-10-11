import threading

from django.db import close_old_connections

from stats.services import recalculate_stats


def recalculate_stats_async():
    """Start statistics recalculation in a background thread."""

    def run():
        close_old_connections()
        try:
            recalculate_stats()
        finally:
            close_old_connections()

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    return thread
