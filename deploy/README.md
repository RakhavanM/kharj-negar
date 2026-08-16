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

The private backup repository is `RakhavanM/kharj-negar-backups`. The systemd timer is installed and enabled, but encrypted uploads remain intentionally disabled until an offline age recipient and a least-privilege GitHub token are installed as:

- `/etc/kharj-negar/age-recipient`
- `/etc/kharj-negar/github-backup-token`

The age private key must remain off-server.
