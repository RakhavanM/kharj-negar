#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Complete one-time setup for encrypted weekly Kharj Negar backups.
# Run as root on the VPS. It does not require age on a personal computer.

readonly REPO="RakhavanM/kharj-negar-backups"
readonly PROJECT_DIR="${PROJECT_DIR:-/root/family-expenses}"
readonly ETC_DIR="/etc/kharj-negar"
readonly TOKEN_FILE="$ETC_DIR/github-backup-token"
readonly RECIPIENT_FILE="$ETC_DIR/age-recipient"
readonly IDENTITY_DIR="/root/kharj-negar-recovery"
readonly IDENTITY_FILE="$IDENTITY_DIR/age-identity"
readonly BACKUP_SCRIPT="/usr/local/sbin/kharj-negar-backup.sh"
readonly SERVICE_FILE="/etc/systemd/system/kharj-negar-backup.service"
readonly TIMER_FILE="/etc/systemd/system/kharj-negar-backup.timer"

log() { printf '[kharj-backup] %s\n' "$*"; }
die() { printf '[kharj-backup] ERROR: %s\n' "$*" >&2; exit 1; }

[[ "${EUID}" -eq 0 ]] || die "این اسکریپت باید با root اجرا شود."

install_age_if_needed() {
  if command -v age >/dev/null 2>&1 && command -v age-keygen >/dev/null 2>&1; then
    log "age روی VPS موجود است: $(age --version 2>/dev/null || true)"
    return
  fi

  command -v apt-get >/dev/null 2>&1 || die "age نصب نیست و apt-get در دسترس نیست."
  log "age فقط روی VPS نصب می‌شود."
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y age
  command -v age >/dev/null 2>&1 || die "نصب age موفق نبود."
  command -v age-keygen >/dev/null 2>&1 || die "age-keygen بعد از نصب پیدا نشد."
}

validate_token() {
  [[ -s "$TOKEN_FILE" ]] || die "فایل token وجود ندارد یا خالی است: $TOKEN_FILE"
  chmod 600 "$TOKEN_FILE"
  chown root:root "$TOKEN_FILE"

  BACKUP_TOKEN_FILE="$TOKEN_FILE" BACKUP_REPO="$REPO" python3 - <<'PY'
import json
import os
import sys
import urllib.error
import urllib.request

repo_name = os.environ["BACKUP_REPO"]
token = open(os.environ["BACKUP_TOKEN_FILE"], encoding="utf-8").read().strip()

if not token:
    print("GitHub token is empty.", file=sys.stderr)
    sys.exit(2)


def get_json(url: str):
    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "kharj-negar-weekly-backup-setup",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        print(f"GitHub token validation failed: HTTP {error.code}", file=sys.stderr)
        sys.exit(2)
    except Exception as error:
        print(f"GitHub token validation failed: {error}", file=sys.stderr)
        sys.exit(2)

repo = get_json(f"https://api.github.com/repos/{repo_name}")
if repo.get("full_name") != repo_name:
    print("Token cannot access the expected repository.", file=sys.stderr)
    sys.exit(2)
if repo.get("private") is not True:
    print("The backup repository is not private.", file=sys.stderr)
    sys.exit(2)
if repo.get("permissions", {}).get("push") is not True:
    print("Token does not have repository write permission.", file=sys.stderr)
    sys.exit(2)

print("GitHub token validation: OK")
print("Repository: private and writable")
PY
}

create_age_keypair() {
  install -d -o root -g root -m 700 "$ETC_DIR" "$IDENTITY_DIR"

  local has_identity=0
  local has_recipient=0
  [[ -s "$IDENTITY_FILE" ]] && has_identity=1
  [[ -s "$RECIPIENT_FILE" ]] && has_recipient=1

  if [[ "$has_identity" -eq 1 && "$has_recipient" -eq 1 ]]; then
    chmod 600 "$IDENTITY_FILE" "$RECIPIENT_FILE"
    chown root:root "$IDENTITY_FILE" "$RECIPIENT_FILE"
    local expected actual
    expected=$(age-keygen -y "$IDENTITY_FILE" 2>/dev/null) || die "age identity موجود معتبر نیست."
    actual=$(tr -d '[:space:]' < "$RECIPIENT_FILE")
    [[ "$expected" == "$actual" ]] || die "age identity و recipient با هم match نیستند."
    log "age keypair از قبل موجود و معتبر است."
    return
  fi

  [[ "$has_identity" -eq 0 && "$has_recipient" -eq 0 ]] || die "فقط یکی از age identity یا recipient موجود است؛ برای جلوگیری از overwrite متوقف شد."

  local temp_dir recipient
  temp_dir=$(mktemp -d)
  trap 'rm -rf "$temp_dir"' EXIT
  age-keygen -o "$temp_dir/age-identity" >/dev/null 2>&1
  recipient=$(awk '/^# public key:/{print $NF; exit}' "$temp_dir/age-identity")
  [[ "$recipient" == age1* ]] || die "استخراج age recipient موفق نبود."

  install -o root -g root -m 600 "$temp_dir/age-identity" "$IDENTITY_FILE"
  printf '%s\n' "$recipient" > "$temp_dir/age-recipient"
  install -o root -g root -m 600 "$temp_dir/age-recipient" "$RECIPIENT_FILE"
  trap - EXIT
  rm -rf "$temp_dir"

  log "age keypair ساخته شد."
  log "کلید خصوصی root-only: $IDENTITY_FILE"
  log "کلید عمومی برای backup: $RECIPIENT_FILE"
}

install_backup_files() {
  [[ -f "$PROJECT_DIR/deploy/backup-kharj-negar.sh" ]] || die "backup script پیدا نشد: $PROJECT_DIR/deploy/backup-kharj-negar.sh"
  [[ -f "$PROJECT_DIR/deploy/kharj-negar-backup.service" ]] || die "systemd service پیدا نشد."
  [[ -f "$PROJECT_DIR/deploy/kharj-negar-backup.timer" ]] || die "systemd timer پیدا نشد."

  install -o root -g root -m 700 "$PROJECT_DIR/deploy/backup-kharj-negar.sh" "$BACKUP_SCRIPT"
  install -o root -g root -m 644 "$PROJECT_DIR/deploy/kharj-negar-backup.service" "$SERVICE_FILE"
  install -o root -g root -m 644 "$PROJECT_DIR/deploy/kharj-negar-backup.timer" "$TIMER_FILE"
  bash -n "$BACKUP_SCRIPT"
  log "backup script و systemd unitها نصب شدند."
}

verify_latest_release() {
  BACKUP_TOKEN_FILE="$TOKEN_FILE" BACKUP_REPO="$REPO" python3 - <<'PY'
import json
import os
import sys
import urllib.request

repo = os.environ["BACKUP_REPO"]
token = open(os.environ["BACKUP_TOKEN_FILE"], encoding="utf-8").read().strip()
request = urllib.request.Request(
    "https://api.github.com/repos/" + repo + "/releases?per_page=100",
    headers={
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "kharj-negar-weekly-backup-setup",
    },
)
try:
    with urllib.request.urlopen(request, timeout=30) as response:
        releases = json.load(response)
except Exception as error:
    print("Could not verify GitHub releases: " + str(error), file=sys.stderr)
    sys.exit(2)
backup_releases = [r for r in releases if str(r.get("tag_name", "")).startswith("backup-")]
if not backup_releases:
    print("No backup release was found after the backup run.", file=sys.stderr)
    sys.exit(2)
latest = max(backup_releases, key=lambda r: r.get("published_at") or "")
assets = {asset.get("name"): asset for asset in latest.get("assets", [])}
archive_names = [name for name in assets if name.endswith(".tar.zst.age")]
checksum_names = [name for name in assets if name.endswith(".tar.zst.age.sha256")]
if len(archive_names) != 1 or len(checksum_names) != 1:
    print("Latest backup release does not contain exactly one encrypted archive and one checksum.", file=sys.stderr)
    sys.exit(2)
for name in archive_names + checksum_names:
    if int(assets[name].get("size", 0)) <= 0:
        print("GitHub asset has invalid size: " + name, file=sys.stderr)
        sys.exit(2)
print("backup_release=" + latest["tag_name"])
print("release_url=" + latest["html_url"])
for name in sorted(archive_names + checksum_names):
    print("asset=" + name + " bytes=" + str(assets[name]["size"]))
PY
}

main() {
  install_age_if_needed
  validate_token
  create_age_keypair
  install_backup_files

  systemctl daemon-reload
  systemctl enable --now kharj-negar-backup.timer
  log "weekly timer فعال شد."

  log "اولین backup در حال اجراست..."
  systemctl reset-failed kharj-negar-backup.service >/dev/null 2>&1 || true
  systemctl start kharj-negar-backup.service
  systemctl is-failed --quiet kharj-negar-backup.service && die "backup service failed شده است."
  log "اولین backup موفق بود."

  verify_latest_release
  log "راه‌اندازی backup هفتگی کامل شد."
  log "زمان اجرای بعدی:"
  systemctl list-timers --all kharj-negar-backup.timer --no-pager
  log "برای بازیابی، کلید خصوصی را خارج از VPS نیز در محل امن نگه دار: $IDENTITY_FILE"
}

main "$@"
