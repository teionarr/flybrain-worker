"""flyworker: hire a fly.

The web app lives in `flyworker.app` and is imported lazily so that the pure-logic
modules (consulting, reviews, table) do not require Flask or a running server.
"""

__all__ = ["app"]

__version__ = "0.1.0"


def _get_app():
    from .app import app

    return app


def __getattr__(name):
    # Allow `from flyworker import app` without importing Flask until it's needed.
    if name == "app":
        return _get_app()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
