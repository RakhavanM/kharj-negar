# Deployment notes

## VPS layout

- Frontend: `/opt/kharj-negar/frontend`
- Backend: `/opt/kharj-negar/backend`
- Backend environment file: `/etc/kharj-negar/backend.env` (never commit)
- API: `127.0.0.1:8000`
- Service: `kharj-negar-api.service`
- Nginx: `kharjnegar.raminakhavan.ir`
- Database: PostgreSQL `kharj_negar`, local-only

## Initial production users

The first random passwords were written to `/root/kharj-negar-initial-credentials.txt` with mode `0600`. Read them directly over SSH and remove the file after storing the passwords in a password manager. They were never printed into agent output or committed.

## Backup

The private backup repository is `RakhavanM/kharj-negar-backups`. The backup system is configured for a **weekly Sunday run** via `kharj-negar-backup.timer`, with encrypted GitHub Release assets and seven-release retention.

Upload execution remains gated until these two root-only files are installed on the VPS:

- `/etc/kharj-negar/age-recipient`
- `/etc/kharj-negar/github-backup-token`

The age private key must remain off-server. The GitHub token should be fine-grained and restricted to `RakhavanM/kharj-negar-backups` release/content operations only.

The backup service is condition-gated, so it does not run or report a false success while those credentials are absent.

## Feature endpoints

- `POST /api/auth/change-password`
- `GET /api/summary?month=YYYY-MM` includes `comparison` against the previous Jalali month when data exists.
