from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings


def _get_fernet() -> Fernet | None:
    key = get_settings().face_encoding_encryption_key.strip()
    if not key:
        return None
    try:
        return Fernet(key.encode("utf-8"))
    except Exception:
        return None


def encrypt_face_encoding(raw_json: str) -> str:
    fernet = _get_fernet()
    if not fernet:
        return raw_json
    token = fernet.encrypt(raw_json.encode("utf-8")).decode("utf-8")
    return f"enc:{token}"


def decrypt_face_encoding(value: str) -> str:
    if not value.startswith("enc:"):
        return value

    fernet = _get_fernet()
    if not fernet:
        # Encryption key is missing - return empty to signal failure
        import sys
        print("WARNING: face_encoding_encryption_key is not configured", file=sys.stderr)
        return "[]"

    token = value[4:]
    try:
        return fernet.decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as e:
        # Token is invalid - decryption failed
        import sys
        print(f"WARNING: Failed to decrypt face encoding token (InvalidToken)", file=sys.stderr)
        return "[]"
