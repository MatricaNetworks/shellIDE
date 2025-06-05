import os
from typing import Optional

class Settings:
    # Database Configuration
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"postgresql://{os.getenv('PGUSER', 'shellide')}:"
        f"{os.getenv('PGPASSWORD', 'shelluserpasswd')}@"
        f"{os.getenv('PGHOST', 'localhost')}:"
        f"{os.getenv('PGPORT', '5432')}/"
        f"{os.getenv('PGDATABASE', 'shellide_db')}"
    )
    
    # Google OAuth Configuration
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    # JWT Configuration
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # OpenRouter Configuration
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    
    # Application Configuration
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    APP_NAME: str = "ShellIDE"
    APP_VERSION: str = "1.0.0"
    
    # Security Configuration
    ALLOWED_HOSTS: list = ["localhost", "127.0.0.1", "0.0.0.0"]
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5000"]
    
    # File System Configuration
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    MAX_PROJECT_SIZE: int = 500 * 1024 * 1024  # 500MB
    PROJECTS_DIR: str = os.path.join(os.getcwd(), "user_projects")
    
    # Terminal Configuration
    MAX_EXECUTION_TIME: int = 300  # 5 minutes
    MAX_OUTPUT_SIZE: int = 1024 * 1024  # 1MB
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    API_RATE_LIMIT_PER_MINUTE: int = 100
    
    def __init__(self):
        # Ensure required directories exist
        os.makedirs(self.PROJECTS_DIR, exist_ok=True)
        
        # Validate required environment variables
        if not self.GOOGLE_CLIENT_ID:
            print("WARNING: GOOGLE_CLIENT_ID not set")
        if not self.GOOGLE_CLIENT_SECRET:
            print("WARNING: GOOGLE_CLIENT_SECRET not set")
        if not self.OPENROUTER_API_KEY:
            print("WARNING: OPENROUTER_API_KEY not set")

# Create global settings instance
settings = Settings()

# Environment-specific configurations
if settings.DEBUG:
    print("🔧 Running in DEBUG mode")
    print(f"📊 Database URL: {settings.DATABASE_URL}")
    print(f"📁 Projects Directory: {settings.PROJECTS_DIR}")
