This directory holds locally stored media files during development.

Structure:
  media/
    originals/   - Raw uploaded video files before processing
    processed/   - Processed MP4 files (H.264/AAC)
    hls-private/ - private HLS segments and manifests
    tmp/         - processing workspaces
    posters/     - Movie/series poster images
    backdrops/   - Movie/series backdrop images
    thumbnails/  - Video thumbnails extracted by FFmpeg

IMPORTANT:
- All subdirectories except posters/, backdrops/, and thumbnails/ are
  excluded from git via .gitignore (large files).
- On Oracle Cloud, this directory maps to the mounted block volume.
- StorageService always uses storage KEYS (relative paths) — never
  absolute filesystem paths are exposed to clients.
