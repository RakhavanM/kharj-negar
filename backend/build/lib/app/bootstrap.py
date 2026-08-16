"""Create or update the two production users without putting passwords in git."""
import getpass
import sys

from sqlalchemy import select

from .db import SessionLocal
from .models import Household, User
from .security import hash_password


def prompt_password(username: str) -> str:
    while True:
        first = getpass.getpass(f"Password for {username}: ")
        second = getpass.getpass("Repeat password: ")
        if len(first) < 12:
            print("Password must be at least 12 characters.")
            continue
        if first != second:
            print("Passwords do not match.")
            continue
        return first


def main() -> None:
    db = SessionLocal()
    try:
        household = db.scalar(select(Household).limit(1))
        if household is None:
            household = Household(name="خانه رامین و مانا")
            db.add(household)
            db.flush()
        for username, person in (("ramin", "ramin"), ("mana", "mana")):
            user = db.scalar(select(User).where(User.username == username))
            password = prompt_password(username)
            if user is None:
                user = User(username=username, person=person, household_id=household.id, password_hash=hash_password(password))
                db.add(user)
            else:
                user.password_hash = hash_password(password)
                user.household_id = household.id
                user.person = person
                user.is_active = True
        db.commit()
        print("Users created or updated successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
