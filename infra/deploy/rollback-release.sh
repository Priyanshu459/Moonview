#!/usr/bin/env bash
set -euo pipefail

previous_release="${1:?absolute previous release path required}"

case "${previous_release}" in
  /opt/moonview/releases/*) ;;
  *) echo "Refusing rollback outside /opt/moonview/releases" >&2; exit 1 ;;
esac

test -d "${previous_release}"
ln -sfn "${previous_release}" /opt/moonview/current
systemctl restart moonview-api.service moonview-worker.service

echo "Rolled application symlink back to ${previous_release}."
echo "Database rollback is not automated; restore/migrate only after a manual compatibility review."
