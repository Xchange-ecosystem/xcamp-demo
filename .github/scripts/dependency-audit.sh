#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"
allowlist=.github/audit-allowlist.txt

if [ ! -f "$allowlist" ]; then
  echo "::error file=$allowlist::Dependency audit allowlist is missing."
  exit 1
fi

raw_audit=$(mktemp)
trap 'rm -f "$raw_audit"' EXIT
# A non-zero status is expected while known advisories are present. The final,
# filtered invocation below remains the blocking audit gate.
bun audit --json > "$raw_audit" || true

current_date=$(date -u +%F)
ignore_args=()
entries=0
while IFS= read -r line; do
  case "$line" in
    ""|\#*) continue ;;
  esac
  entries=$((entries + 1))
  id=$(printf '%s\n' "$line" | cut -d '|' -f 1 | xargs)
  review_by=$(printf '%s\n' "$line" | sed -nE 's/.*REVIEW-BY=([0-9]{4}-[0-9]{2}-[0-9]{2}).*/\1/p')
  if [[ ! "$id" =~ ^GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}$ ]]; then
    echo "::error file=$allowlist::Invalid advisory ID in allowlist entry: $line"
    exit 1
  fi
  if [[ ! "$review_by" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    echo "::error file=$allowlist::Missing or invalid REVIEW-BY date for $id."
    exit 1
  fi
  if [[ "$current_date" > "$review_by" ]]; then
    echo "::error file=$allowlist::Allowlist entry $id expired on $review_by. Review or remove it."
    exit 1
  fi
  if ! grep -Fq "$id" "$raw_audit"; then
    echo "::error file=$allowlist::Allowlist entry $id is stale: bun audit no longer reports it. Remove the entry."
    exit 1
  fi
  ignore_args+=("--ignore=$id")
done < "$allowlist"

if [ "$entries" -eq 0 ]; then
  echo "No dependency-audit suppressions are active."
else
  echo "Validated $entries unexpired, currently reported advisory suppressions."
fi

# Bun 1.3.11 accepts repeated --ignore=<GHSA-ID> arguments. Any new high or
# critical advisory is not in ignore_args and therefore fails this command.
bun audit --audit-level=high "${ignore_args[@]}"
