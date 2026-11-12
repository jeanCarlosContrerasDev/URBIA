"""Configuración de conexión a base de datos Microsoft SQL Server con SQLAlchemy y NullPool."""
import urllib.parse
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool

SERVER = "DESKTOP-E7LN67M"
DATABASE = "URBIXIA"
DRIVER = "ODBC Driver 17 for SQL Server"

# USER = "sa"               # <--- Tu usuario de SQL Server
# PASSWORD = "TuPassword"   # <--- Tu contraseña de SQL Server

odbc_str = (
    f"DRIVER={{{DRIVER}}};"
    f"SERVER={SERVER};"
    f"DATABASE={DATABASE};"
    "Trusted_Connection=yes;"
    "TrustServerCertificate=yes;"
)

# odbc_str = (
#     f"DRIVER={{{DRIVER}}};"
#     f"SERVER={SERVER};"
#     f"DATABASE={DATABASE};"
#     f"UID={USER};"
#     f"PWD={PASSWORD};"
#     "TrustServerCertificate=yes;"
# )

params = urllib.parse.quote_plus(odbc_str)
DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"

# NullPool previene bloqueos por retención de conexiones en Windows con pyodbc
engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
