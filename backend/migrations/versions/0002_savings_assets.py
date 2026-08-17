"""add independent savings assets table

Revision ID: 0002_savings_assets
Revises: 0001_initial
Create Date: 2026-08-16
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_savings_assets"
down_revision: Union[str, Sequence[str], None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "savings_assets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("household_id", sa.Integer(), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("asset_type", sa.String(length=24), nullable=False),
        sa.Column("symbol", sa.String(length=24), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=24, scale=12), nullable=False),
        sa.Column("unit", sa.String(length=24), nullable=False),
        sa.Column("owner", sa.String(length=16), nullable=False),
        sa.Column("as_of_date", sa.Date(), nullable=False),
        sa.Column("note", sa.Text(), server_default="", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("household_id", "created_by_id", "asset_type", "symbol", "owner", "as_of_date"):
        op.create_index(f"ix_savings_assets_{column}", "savings_assets", [column], unique=False)


def downgrade() -> None:
    for column in ("as_of_date", "owner", "symbol", "asset_type", "created_by_id", "household_id"):
        op.drop_index(f"ix_savings_assets_{column}", table_name="savings_assets")
    op.drop_table("savings_assets")
