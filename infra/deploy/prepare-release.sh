#!/usr/bin/env bash
set -euo pipefail

release_id="${1:?release id required}"
release_dir="/opt/moonview/releases/${release_id}"

mkdir -p /opt/moonview/releases
mkdir -p /var/lib/moonview/storage /var/lib/moonview/public-media /var/lib/moonview/tmp
mkdir -p "${release_dir}"

echo "Copy the built release into: ${release_dir}"
echo "After verification, switch with: ln -sfn ${release_dir} /opt/moonview/current"
echo "Run database migrations explicitly; database rollback is never automatic."
