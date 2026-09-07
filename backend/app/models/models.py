import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, JSON, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database.session import Base


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    datasets = relationship("Dataset", back_populates="owner", cascade="all, delete-orphan")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    owner_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # csv | xlsx
    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)

    # Profiling metadata (JSON blobs keep this schema-flexible across
    # arbitrarily different uploaded datasets)
    column_profile = Column(JSON, default=dict)     # per-column types/stats
    summary = Column(JSON, default=dict)             # high level counts
    missing_values = Column(Integer, default=0)
    duplicate_rows = Column(Integer, default=0)

    # What the automatic cleaning stage found/fixed before analysis ran
    # (duplicates removed, missing values imputed, formatting coerced, etc.)
    cleaning_report = Column(JSON, default=dict)

    dataset_domain = Column(String, nullable=True)   # e.g. "sales", "hr", "student"
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="datasets")
    analyses = relationship("AnalysisResult", back_populates="dataset", cascade="all, delete-orphan")
    dashboards = relationship("Dashboard", back_populates="dataset", cascade="all, delete-orphan")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    dataset_id = Column(UUID(as_uuid=False), ForeignKey("datasets.id"), nullable=False)

    correlations = Column(JSON, default=dict)
    anomalies = Column(JSON, default=list)
    trends = Column(JSON, default=list)
    clusters = Column(JSON, default=dict)
    insights = Column(JSON, default=list)   # natural-language insight strings + metadata
    created_at = Column(DateTime, default=datetime.utcnow)

    dataset = relationship("Dataset", back_populates="analyses")


class Dashboard(Base):
    __tablename__ = "dashboards"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    dataset_id = Column(UUID(as_uuid=False), ForeignKey("datasets.id"), nullable=False)
    title = Column(String, nullable=False)
    config = Column(JSON, nullable=False)  # full dashboard JSON (kpis/charts/insights/filters/layout)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    dataset = relationship("Dataset", back_populates="dashboards")
