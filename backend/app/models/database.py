from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import get_settings
import os

settings = get_settings()

os.makedirs("data", exist_ok=True)
os.makedirs(settings.upload_dir, exist_ok=True)

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_indexes():
    """Create missing indexes for scale. Uses IF NOT EXISTS so safe to run on existing DBs."""
    stmts = [
        "CREATE INDEX IF NOT EXISTS idx_receipts_received_at ON receipts(received_at)",
        "CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status)",
        "CREATE INDEX IF NOT EXISTS idx_receipts_client_status ON receipts(client_id, status)",
        "CREATE INDEX IF NOT EXISTS idx_dp_client_date ON daily_payments(client_id, payment_date)",
        "CREATE INDEX IF NOT EXISTS idx_clients_registered_at ON clients(registered_at)",
        "CREATE INDEX IF NOT EXISTS idx_clients_active_frozen ON clients(active, frozen)",
    ]
    with engine.connect() as conn:
        for s in stmts:
            conn.execute(text(s))
        conn.commit()


def create_tables():
    Base.metadata.create_all(bind=engine)
    create_indexes()
