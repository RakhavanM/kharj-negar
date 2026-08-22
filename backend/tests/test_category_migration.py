from pathlib import Path


def test_category_migration_follows_savings_migration():
    source = (Path(__file__).parents[1] / "migrations/versions/0003_categories.py").read_text()
    assert 'revision: str = "0003_categories"' in source
    assert 'down_revision: Union[str, Sequence[str], None] = "0002_savings_assets"' in source


def test_category_migration_defines_household_scoped_unique_constraints():
    source = (Path(__file__).parents[1] / "migrations/versions/0003_categories.py").read_text()
    assert 'sa.UniqueConstraint("household_id", "code"' in source
    assert 'sa.UniqueConstraint("household_id", "name"' in source
    assert 'VALUES (:household_id, :created_by_id, :code, :name, TRUE' in source


def test_category_migration_is_idempotent_for_seed_rows():
    source = (Path(__file__).parents[1] / "migrations/versions/0003_categories.py").read_text()
    assert 'ON CONFLICT (household_id, code) DO NOTHING' in source
