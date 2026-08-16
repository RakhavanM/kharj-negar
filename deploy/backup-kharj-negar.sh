#!/usr/bin/env bash
set -euo pipefail
umask 077

REPO="RakhavanM/kharj-negar-backups"
RECIPIENT_FILE="/etc/kharj-negar/age-recipient"
TOKEN_FILE="/etc/kharj-negar/github-backup-token"
BACKUP_DIR="/var/backups/kharj-negar"
RETENTION="${BACKUP_RETENTION:-7}"
LOCK_FILE="/run/lock/kharj-negar-backup.lock"

require_file() {
  [[ -r "$1" ]] || { printf 'Missing required file: %s\n' "$1" >&2; exit 2; }
}

require_file "$RECIPIENT_FILE"
require_file "$TOKEN_FILE"
mkdir -p "$BACKUP_DIR"
exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

recipient=$(tr -d '[:space:]' < "$RECIPIENT_FILE")
token=$(tr -d '\r\n' < "$TOKEN_FILE")
[[ "$recipient" == age1* ]] || { echo "Invalid age recipient" >&2; exit 2; }
[[ -n "$token" ]] || { echo "Empty GitHub token" >&2; exit 2; }

repo_json=$(curl -fsS -H "Authorization: Bearer $token" -H 'Accept: application/vnd.github+json' "https://api.github.com/repos/$REPO")
python3 -c 'import json,sys; assert json.load(sys.stdin)["private"] is True' <<<"$repo_json" || { echo "Backup repository is not private" >&2; exit 2; }

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
stage=$(mktemp -d)
archive="$BACKUP_DIR/kharj-negar-$timestamp.tar.zst.age"
checksum="$archive.sha256"
trap 'rm -rf "$stage"' EXIT

readarray -t db_env < <(python3 - <<'PY'
import os
from urllib.parse import unquote, urlsplit
parsed = urlsplit(os.environ["DATABASE_URL"].replace("postgresql+psycop://", "postgresql://"))
for key, value in {
    "PGHOST": parsed.hostname or "127.0.0.1",
    "PGPORT": str(parsed.port or 5432),
    "PGUSER": unquote(parsed.username or ""),
    "PGPASSWORD": unquote(parsed.password or ""),
    "PGDATABASE": parsed.path.lstrip("/"),
}.items():
    print(f"{key}={value}")
PY
)
for assignment in "${db_env[@]}"; do export "$assignment"; done

pg_dump --format=custom --no-owner --no-privileges --file="$stage/kharj-negar.dump" "$PGDATABASE"
pg_restore --list "$stage/kharj-negar.dump" > "$stage/kharj-negar.dump.list"
printf 'created_at=%s\nrepository=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$REPO" > "$stage/manifest.txt"

tar --numeric-owner --acls --xattrs -C "$stage" -cf - . | zstd -T0 -10 | age -r "$recipient" -o "$archive"
sha256sum "$archive" > "$checksum"

release=$(python3 - <<PY
import json
print(json.dumps({
  "tag_name": "backup-$timestamp",
  "name": "backup-$timestamp",
  "body": "Encrypted Kharj Negar PostgreSQL backup",
  "draft": False,
  "prerelease": False,
}))
PY
)
release_json=$(curl -fsS -X POST -H "Authorization: Bearer $token" -H 'Accept: application/vnd.github+json' -H 'Content-Type: application/json' "https://api.github.com/repos/$REPO/releases" -d "$release")
release_id=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<<"$release_json")

for asset in "$archive" "$checksum"; do
  curl -fsS -X POST \
    -H "Authorization: Bearer $token" \
    -H 'Content-Type: application/octet-stream' \
    "https://uploads.github.com/repos/$REPO/releases/$release_id/assets?name=$(basename "$asset")" \
    --data-binary "@$asset" >/dev/null
done

releases=$(curl -fsS -H "Authorization: Bearer $token" -H 'Accept: application/vnd.github+json' "https://api.github.com/repos/$REPO/releases?per_page=100")
RELEASES_JSON="$releases" python3 - "$RETENTION" "$token" "$REPO" <<'PY'
import json, os, subprocess, sys
keep = int(sys.argv[1])
token, repo = sys.argv[2:]
releases = json.loads(os.environ["RELEASES_JSON"])
old = sorted((r for r in releases if r.get("tag_name", "").startswith("backup-")), key=lambda r: r.get("published_at") or "", reverse=True)[keep:]
for release in old:
    subprocess.run(["curl", "-fsS", "-X", "DELETE", "-H", f"Authorization: Bearer {token}", f"https://api.github.com/repos/{repo}/releases/{release['id']}"], check=True, stdout=subprocess.DEVNULL)
PY

rm -f "$archive" "$checksum"
printf 'backup_release=backup-%s\nrepository=https://github.com/%s/releases/tag/backup-%s\n' "$timestamp" "$REPO" "$timestamp"
