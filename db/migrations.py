"""
Run this script once to create all tables and seed data in Supabase.
Usage: python -m db.migrations
"""
import os
import sys
from dotenv import load_dotenv
import bcrypt as _bcrypt

load_dotenv()

# Use direct URL for migrations (not pooled)
DIRECT_URL = os.environ.get("DIRECT_URL", os.environ.get("DATABASE_URL", "")).strip()
if "?sslmode" in DIRECT_URL and "sslmode=require" not in DIRECT_URL:
    DIRECT_URL = DIRECT_URL.replace("?sslmode", "?sslmode=require")

def run_migrations():
    import psycopg2
    conn = psycopg2.connect(DIRECT_URL)
    conn.autocommit = True
    cur = conn.cursor()

    print("🗑️ Dropping old v1 tables to ensure clean v2 schema...")
    cur.execute("""
        DROP TABLE IF EXISTS 
            tickets, orders, pipeline_logs, business_rules, 
            injection_rules, messages, conversations, admin_users 
        CASCADE;
    """)

    print("🔧 Creating v2 tables...")

    # Conversations
    cur.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(200) DEFAULT 'New Conversation',
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            message_count INTEGER DEFAULT 0,
            flagged BOOLEAN DEFAULT false,
            admin_notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    print("  ✅ conversations")

    # Messages
    cur.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
            role VARCHAR(20) NOT NULL,
            content TEXT NOT NULL,
            verdict VARCHAR(20),
            pipeline_steps JSONB,
            token_count INTEGER DEFAULT 0,
            retried BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    print("  ✅ messages")

    # Business rules (Content Policies)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS business_rules (
            id SERIAL PRIMARY KEY,
            rule_name VARCHAR(100) UNIQUE NOT NULL,
            value TEXT NOT NULL,
            description TEXT DEFAULT '',
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    print("  ✅ business_rules (content policies)")

    # Injection rules
    cur.execute("""
        CREATE TABLE IF NOT EXISTS injection_rules (
            id SERIAL PRIMARY KEY,
            pattern VARCHAR(500) UNIQUE NOT NULL,
            source VARCHAR(50) DEFAULT 'seed',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    print("  ✅ injection_rules")

    # Pipeline logs
    cur.execute("""
        CREATE TABLE IF NOT EXISTS pipeline_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
            step_name VARCHAR(50) NOT NULL,
            step_order INTEGER NOT NULL,
            status VARCHAR(20) NOT NULL,
            input_text TEXT,
            output_text TEXT,
            details JSONB DEFAULT '{}',
            duration_ms INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    print("  ✅ pipeline_logs")

    # Admin users
    cur.execute("""
        CREATE TABLE IF NOT EXISTS admin_users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(200) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    """)
    print("  ✅ admin_users")

    # ── Seed data ──
    print("\n🌱 Seeding data...")

    # Business rules (Content policies)
    rules = [
        ("max_response_length", "2000", "Maximum characters allowed in the assistant response"),
        ("blocked_topics", "politics, religion, illegal activities", "Comma-separated list of topics the assistant must refuse to discuss"),
        ("block:competitors", "openai, anthropic, google gemini", "Keyword block for competitor mentions"),
    ]
    for r in rules:
        cur.execute("""
            INSERT INTO business_rules (rule_name, value, description)
            VALUES (%s, %s, %s)
            ON CONFLICT (rule_name) DO NOTHING
        """, r)
    print(f"  ✅ {len(rules)} content policy rules")

    # Injection rules
    patterns = [
        ("ignore previous instructions", "seed"),
        ("bypass system", "seed"),
        ("you are now", "seed"),
        ("disregard all", "seed"),
        ("forget your instructions", "seed"),
    ]
    for p in patterns:
        cur.execute("""
            INSERT INTO injection_rules (pattern, source)
            VALUES (%s, %s)
            ON CONFLICT (pattern) DO NOTHING
        """, p)
    print(f"  ✅ {len(patterns)} injection rules")

    # Admin user
    admin_user = os.environ.get("ADMIN_USERNAME", "admin")
    admin_pass = os.environ.get("ADMIN_PASSWORD", "admin123")
    hashed = _bcrypt.hashpw(admin_pass.encode('utf-8'), _bcrypt.gensalt()).decode('utf-8')
    cur.execute("""
        INSERT INTO admin_users (username, password_hash)
        VALUES (%s, %s)
        ON CONFLICT (username) DO NOTHING
    """, (admin_user, hashed))
    print(f"  ✅ admin user: {admin_user}")

    cur.close()
    conn.close()
    print("\n🎉 Migration complete!")

if __name__ == "__main__":
    run_migrations()
