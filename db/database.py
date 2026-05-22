import psycopg2
import psycopg2.extras
import os
from dotenv import load_dotenv
from contextlib import contextmanager

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
if "?sslmode" in DATABASE_URL and "sslmode=require" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("?sslmode", "?sslmode=require")

def get_connection():
    """Get a PostgreSQL connection with dict cursor."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn

@contextmanager
def get_db():
    """Context manager for database operations."""
    conn = get_connection()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
