from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class Household(Base):
    __tablename__ = "households"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="household", cascade="all, delete-orphan")
    expenses: Mapped[list["Expense"]] = relationship(back_populates="household", cascade="all, delete-orphan")
    savings_assets: Mapped[list["SavingsAsset"]] = relationship(back_populates="household", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    household_id: Mapped[int] = mapped_column(ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    person: Mapped[str] = mapped_column(String(16), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    household: Mapped[Household] = relationship(back_populates="users")
    sessions: Mapped[list["AuthSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    created_expenses: Mapped[list["Expense"]] = relationship(back_populates="created_by")
    created_savings_assets: Mapped[list["SavingsAsset"]] = relationship(back_populates="created_by")


class AuthSession(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    csrf_token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped[User] = relationship(back_populates="sessions")


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    household_id: Mapped[int] = mapped_column(ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    amount_toman: Mapped[int] = mapped_column(Integer, nullable=False)
    person: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    note: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    household: Mapped[Household] = relationship(back_populates="expenses")
    created_by: Mapped[User] = relationship(back_populates="created_expenses")


class SavingsAsset(Base):
    __tablename__ = "savings_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    household_id: Mapped[int] = mapped_column(ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    asset_type: Mapped[str] = mapped_column(String(24), nullable=False, index=True)
    symbol: Mapped[str] = mapped_column(String(24), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(24, 12), nullable=False)
    unit: Mapped[str] = mapped_column(String(24), nullable=False)
    owner: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    as_of_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    note: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    created_by: Mapped[User] = relationship(back_populates="created_savings_assets")
    household: Mapped[Household] = relationship(back_populates="savings_assets")
