# Vercel serverless entry point — imports main FastAPI app
import sys
import os

# Add the project root to path so all modules resolve correctly
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app  # noqa: F401 — Vercel picks up 'app' automatically
