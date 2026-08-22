"""add household categories and seed the existing expense categories

Revision ID: 0003_categories
Revises: 0002_savings_assets
Create Date: 2026-08-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_categories"
down_revision: Union[str, Sequence[str], None] = "0002_savings_assets"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DEFAULT_CATEGORIES = (
    ("daily", "خرج روزمره", 10),
    ("installment", "قسط", 20),
    ("rent", "اجاره", 30),
    ("car", "ماشین", 40),
    ("home", "وسایل خانه", 50),
    ("debt", "قرض", 60),
    ("pet", "پت", 70),
    ("miscellaneous", "خرج متفرقه", 80),
)


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("household_id", sa.Integer(), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("household_id", "code", name="uq_categories_household_code"),
        sa.UniqueConstraint("household_id", "name", name="uq_categories_household_name"),
    )
    for column in ("household_id", "created_by_id", "code", "is_active", "sort_order"):
        op.create_index(f"ix_categories_{column}", "categories", [column], unique=False)

    categories = sa.table(
        "categories",
        sa.column("household_id", sa.Integer()),
        sa.column("created_by_id", sa.Integer()),
        sa.column("code", sa.String()),
        sa.column("name", sa.String()),
        sa.column("is_active", sa.Boolean()),
        sa.column("sort_order", sa.Integer()),
        sa.column("version", sa.Integer()),
    )
    bind = op.get_bind()
    households = bind.execute(sa.text("SELECT id FROM households ORDER BY id")).fetchall()
    for household in households:
        creator = bind.execute(
            sa.text("SELECT id FROM users WHERE household_id = :household_id ORDER BY id LIMIT 1"),
            {"household_id": household.id},
        ).first()
        if creator is None:
            continue
        for code, name, sort_order in DEFAULT_CATEGORIES:
            bind.execute(
                sa.text(
                    """
                    INSERT INTO categories (household_id, created_by_id, code, name, is_active, sort_order, version)
                    VALUES (:household_id, :created_by_id, :code, :name, TRUE, :sort_order, 1)
                    ON CONFLICT (household_id, code) DO NOTHING
                    """
                ),
                {
                    "household_id": household.id,
                    "created_by_id": creator.id,
                    "code": code,
                    "name": name,
                    "sort_order": sort_order,
                },
            )


def downgrade() -> None:
    for column in ("sort_order", "is_active", "code", "created_by_id", "household_id"):
        op.drop_index(f"ix_categories_{column}", table_name="categories")
    op.drop_table("categories")
