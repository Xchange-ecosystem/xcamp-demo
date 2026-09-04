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
filtered_audit=$(mktemp)
audit_stderr=$(mktemp)
trap 'rm -f "$raw_audit" "$filtered_audit" "$audit_stderr"' EXIT

audit_timeout_seconds=${AUDIT_TIMEOUT_SECONDS:-30}
audit_max_attempts=${AUDIT_MAX_ATTEMPTS:-3}

run_audit_json() {
  local output=$1
  shift
  local attempt status
  for ((attempt = 1; attempt <= audit_max_attempts; attempt++)); do
    : >"$audit_stderr"
    if timeout --signal=TERM --kill-after=5 "${audit_timeout_seconds}s" \
      bun audit --json "$@" >"$output" 2>"$audit_stderr"; then
      status=0
    else
      status=$?
    fi

    # A valid JSON response means the registry answered. Preserve bun's status:
    # non-zero may represent a real advisory and must remain blocking.
    if python3 -c 'import json, sys; json.load(open(sys.argv[1], encoding="utf-8"))' "$output" 2>/dev/null; then
      cat "$audit_stderr" >&2
      return "$status"
    fi

    if ((attempt < audit_max_attempts)); then
      echo "::warning::Dependency audit attempt $attempt/$audit_max_attempts failed or returned invalid JSON; retrying after $((attempt * 5))s."
      sleep $((attempt * 5))
    fi
  done

  cat "$audit_stderr" >&2
  echo "::error::Dependency audit service did not return valid JSON after $audit_max_attempts bounded attempts."
  return 75
}

# A non-zero status is expected while known advisories are present. The final,
# filtered invocation below remains the blocking audit gate. Invalid/network
# responses are never treated as advisory results.
if run_audit_json "$raw_audit"; then
  raw_status=0
else
  raw_status=$?
fi
if ((raw_status == 75)); then
  exit "$raw_status"
fi

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
# Printing the JSON response keeps actual findings visible without making a
# transient registry timeout indistinguishable from a vulnerability.
if run_audit_json "$filtered_audit" --audit-level=high "${ignore_args[@]}"; then
  filtered_status=0
else
  filtered_status=$?
fi
cat "$filtered_audit"
exit "$filtered_status"
