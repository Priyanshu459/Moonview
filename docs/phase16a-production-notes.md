# Phase 16A Production Notes

## Large Upload Strategy

Phase 16 initial deployment uses Cloudflare-proxied admin uploads, so production video uploads are capped at 100 MB with `STORAGE_MAX_FILE_SIZE_MB=100` and Nginx `client_max_body_size 100m`.

10 GB uploads require resumable/chunked upload support before production use. Do not add a DNS-only public upload bypass without a separate security review.

## HLS Revocation And Cache

Processing writes HLS output to `STORAGE_ROOT/hls-private`. Publish copies the approved HLS tree to `PUBLIC_MEDIA_ROOT/hls`, and unpublish removes that public tree. This doubles disk use for published HLS, but avoids symlink portability and cross-filesystem issues.

Nginx sends conservative no-store headers for `.m3u8` manifests. HLS segment URLs are immutable once public; immediate revocation of already cached segments requires publication-specific segment paths or explicit purge testing before any stronger claim is made.

## Backups

PostgreSQL backup:

```bash
pg_dump --format=custom --file=/var/backups/moonview/moonview-$(date +%Y%m%d%H%M%S).dump "$DATABASE_URL"
```

PostgreSQL restore:

```bash
createdb moonview_restore
pg_restore --dbname=moonview_restore --clean --if-exists /var/backups/moonview/<backup>.dump
```

Media backup:

```bash
rsync -a --delete /var/lib/moonview/storage/ /var/backups/moonview/storage/
rsync -a --delete /var/lib/moonview/public-media/ /var/backups/moonview/public-media/
```

Back up `/etc/moonview/moonview.env` separately in an encrypted secrets store. Never store database dumps, media backups, or secret files under `PUBLIC_MEDIA_ROOT`.
