import os

class Config:
    # ---------------- Database ----------------
    DATABASE_URL = os.getenv("DATABASE_URL")  # Supabase or Production URL

    if DATABASE_URL:
        # Use Supabase/PostgreSQL with SSL
        SQLALCHEMY_DATABASE_URI = f"{DATABASE_URL}?sslmode=require"
    else:
        # Fallback to local SQLite for development
        SQLALCHEMY_DATABASE_URI = "sqlite:///likebar.db"

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ---------------- Security ----------------
    # Salt for hashing IP addresses (change in production!)
    IP_SALT = os.getenv("IP_SALT", "change-me")

    # ---------------- CORS / Origins ----------------
    # Comma-separated allowed origins (default '*' = allow all)
    ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

    # ---------------- Optional: Debug ----------------
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"
