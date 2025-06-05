import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from models import Base

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL") or f"postgresql://{os.getenv('PGUSER', 'shellide')}:{os.getenv('PGPASSWORD', 'shelluserpasswd')}@{os.getenv('PGHOST', 'localhost')}:{os.getenv('PGPORT', '5432')}/{os.getenv('PGDATABASE', 'shellide_db')}"

# Create engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=False  # Set to True for SQL debugging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Session:
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Create all tables in the database"""
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully")
    except Exception as e:
        print(f"Error creating database tables: {e}")

def drop_tables():
    """Drop all tables in the database"""
    try:
        Base.metadata.drop_all(bind=engine)
        print("Database tables dropped successfully")
    except Exception as e:
        print(f"Error dropping database tables: {e}")

def reset_database():
    """Reset the database by dropping and recreating all tables"""
    drop_tables()
    create_tables()

# Test database connection
def test_connection():
    """Test database connection"""
    try:
        with engine.connect() as connection:
            result = connection.execute("SELECT 1")
            print("Database connection successful")
            return True
    except Exception as e:
        print(f"Database connection failed: {e}")
        return False

if __name__ == "__main__":
    print(f"Database URL: {DATABASE_URL}")
    test_connection()
    create_tables()
