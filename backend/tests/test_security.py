from app.security import hash_password, token_hash, tokens_equal, verify_password


def test_password_hash_is_not_plaintext_and_verifies() -> None:
    password = "a-long-test-password-123"
    password_hash = hash_password(password)
    assert password_hash != password
    assert verify_password(password_hash, password)
    assert not verify_password(password_hash, "wrong-password")


def test_token_hash_and_constant_time_compare() -> None:
    token = "random-token"
    assert token_hash(token) == token_hash(token)
    assert tokens_equal(token, token)
    assert not tokens_equal(token, "other-token")
