#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"
allowlist=${AUDIT_ALLOWLIST:-.github/audit-allowlist.txt}

if [ ! -f "$allowlist" ]; then
  echo "::error file=$allowlist::Dependency audit allowlist is missing."
  exit 1
fi

raw_audit=$(mktemp)
audit_stderr=$(mktemp)
trap 'rm -f "$raw_audit" "$audit_stderr"' EXIT

audit_timeout_seconds=${AUDIT_TIMEOUT_SECONDS:-900}
audit_max_attempts=${AUDIT_MAX_ATTEMPTS:-2}

normalize_audit_json() {
  python3 - "$1" <<'PY'
import json
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
match = re.search(r"(?m)^\s*\{", text)
if match is None:
    raise SystemExit(1)
payload = json.loads(text[match.start():])
if not isinstance(payload, dict) or not all(isinstance(items, list) for items in payload.values()):
    raise SystemExit(1)
path.write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")
PY
}

run_audit_json() {
  local attempt status transient
  for ((attempt = 1; attempt <= audit_max_attempts; attempt++)); do
    : >"$audit_stderr"
    if timeout --signal=TERM --kill-after=5 "${audit_timeout_seconds}s" \
      bun audit --json >"$raw_audit" 2>"$audit_stderr"; then
      status=0
    else
      status=$?
    fi

    # Bun can prefix its JSON with dotenv/version diagnostics, and returns
    # non-zero when advisories exist. Parse from the first object line through
    # EOF; a parseable audit object is a completed audit, not a transient error.
    if normalize_audit_json "$raw_audit" 2>/dev/null; then
      cat "$audit_stderr" >&2
      return 0
    fi

    transient=0
    if ((status == 124)); then
      transient=1
    elif ((status != 0)) && [[ ! -s "$raw_audit" ]]; then
      transient=1
    elif ((status != 0)) && grep -Eqi \
      'timeout|timed out|network|connection|dns|eai_again|econn|socket|fetch|request failed' \
      "$audit_stderr"; then
      transient=1
    fi

    if ((transient == 0)); then
      cat "$audit_stderr" >&2
      echo "::error::Dependency audit returned non-transient, unparseable output (exit $status)."
      return 1
    fi
    if ((attempt < audit_max_attempts)); then
      echo "::warning::Dependency audit command failed (exit $status) or returned no parseable result on attempt $attempt/$audit_max_attempts; retrying after $((attempt * 5))s."
      sleep $((attempt * 5))
    fi
  done

  cat "$audit_stderr" >&2
  echo "::error::Dependency audit service did not return valid JSON after $audit_max_attempts bounded attempts."
  return 75
}

# One complete audit response is enough to validate stale suppressions and
# enforce the high/critical threshold locally. This avoids a second network
# request while keeping malformed/empty/network responses fail-closed.
run_audit_json

current_date=$(date -u +%F)
allowlisted_ids=()
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
  allowlisted_ids+=("$id")
done < "$allowlist"

if [ "$entries" -eq 0 ]; then
  echo "No dependency-audit suppressions are active."
else
  echo "Validated $entries unexpired, currently reported advisory suppressions."
fi

# Match Bun's configured --audit-level=high policy using the successfully
# parsed response. Moderate/low advisories remain visible but do not block.
python3 - "$raw_audit" "${allowlisted_ids[@]}" <<'PY'
import json
import re
import sys
from pathlib import Path

report = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
allowed = set(sys.argv[2:])
blocking = []
nonblocking = []
for package, advisories in report.items():
    for advisory in advisories:
        match = re.search(r"GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}", advisory.get("url", ""))
        if match is None:
            print(f"::error::Audit result for {package} has no valid GHSA URL.")
            raise SystemExit(1)
        item = (match.group(), package, advisory.get("severity", "unknown"))
        if item[2] in {"high", "critical"}:
            blocking.append(item)
        else:
            nonblocking.append(item)

unknown = sorted({item for item in blocking if item[0] not in allowed})
for advisory_id, package, severity in unknown:
    print(f"::error::Unallowlisted {severity} advisory: {advisory_id} ({package})")
for advisory_id, package, severity in sorted(set(nonblocking)):
    print(f"::notice::{severity} advisory below audit-level=high: {advisory_id} ({package})")
print(
    f"Audit policy evaluated {len(blocking)} high/critical result(s) and "
    f"{len(nonblocking)} lower-severity result(s)."
)
raise SystemExit(1 if unknown else 0)
PY
