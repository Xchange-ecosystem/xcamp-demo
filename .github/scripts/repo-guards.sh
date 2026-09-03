#!/usr/bin/env bash
set -euo pipefail

failed=0
repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

annotate() {
  local level=$1 file=$2 line=$3 message=$4
  file=${file//'%'/'%25'}
  file=${file//$'\r'/'%0D'}
  file=${file//$'\n'/'%0A'}
  message=${message//'%'/'%25'}
  message=${message//$'\r'/'%0D'}
  message=${message//$'\n'/'%0A'}
  printf '::%s file=%s,line=%s::%s\n' "$level" "$file" "$line" "$message"
}

fail() {
  annotate error "$1" "$2" "$3"
  failed=1
}

base_sha=${GUARD_BASE_SHA:-}
if [[ "$base_sha" =~ ^0+$ ]]; then
  base_sha=""
fi
if [ -n "$base_sha" ] && ! git cat-file -e "${base_sha}^{commit}" 2>/dev/null; then
  echo "::warning::GUARD_BASE_SHA '$base_sha' is unavailable; falling back to the local comparison base."
  base_sha=""
fi
if [ -z "$base_sha" ] && git rev-parse --verify origin/main^{commit} >/dev/null 2>&1; then
  base_sha=$(git merge-base origin/main HEAD)
fi
if [ -z "$base_sha" ] && git rev-parse --verify HEAD^ >/dev/null 2>&1; then
  base_sha=$(git rev-parse HEAD^)
fi

changed_files=$(mktemp)
all_files=$(mktemp)
added_files=$(mktemp)
trap 'rm -f "$changed_files" "$all_files" "$added_files"' EXIT

if [ -n "$base_sha" ]; then
  git diff --name-only "$base_sha" -- > "$changed_files"
  git diff --diff-filter=A --name-only "$base_sha" -- > "$added_files"
else
  : > "$changed_files"
  : > "$added_files"
fi
git ls-files --others --exclude-standard >> "$changed_files"
git ls-files --others --exclude-standard >> "$added_files"
sort -u -o "$changed_files" "$changed_files"
sort -u -o "$added_files" "$added_files"
git ls-files --cached --others --exclude-standard -z > "$all_files"

# Conflict markers are checked as exact marker lines to avoid flagging ordinary
# uses of equals signs. Every marker in a conflict block receives an annotation.
while IFS= read -r -d '' file; do
  [ -f "$file" ] || continue
  while IFS=: read -r line marker; do
    [ -n "${line:-}" ] || continue
    fail "$file" "$line" "Unresolved merge-conflict marker: $marker"
  done < <(awk '/^<<<<<<< .+$/ || /^=======$/ || /^>>>>>>> .+$/ { print NR ":" $0 }' "$file")
done < "$all_files"

if [ -d tests ]; then
  while IFS=: read -r file line text; do
    [ -n "${file:-}" ] || continue
    fail "$file" "$line" "Focused test is forbidden in committed test code: $text"
  done < <(grep -RInE --include='*.ts' --include='*.tsx' '(^|[^[:alnum:]_$])([[:alnum:]_$]+\.)?only[[:space:]]*\(' tests 2>/dev/null || true)
fi

while IFS= read -r -d '' file; do
  case "$file" in
    .env|*/.env|.env.*|*/.env.*)
      case "$file" in
        .env.example|*/.env.example) ;;
        *) fail "$file" 1 "Committed environment file is forbidden; keep secrets in GitHub/Vercel configuration." ;;
      esac
      ;;
    tests/_scratch-*) fail "$file" 1 "Scratch Playwright files must never be committed." ;;
  esac
done < "$all_files"

while IFS= read -r file; do
  [ -f "$file" ] || continue
  size=$(wc -c < "$file")
  if [ "$size" -gt 5242880 ]; then
    fail "$file" 1 "New tracked file is larger than 5 MiB ($size bytes). Use an artifact store instead."
  fi
done < "$added_files"

# Lockfiles only encode dependency-bearing package metadata, not npm scripts.
# Compare those fields so script-only edits do not demand meaningless lock churn.
manifest_inputs_changed=0
if [ -n "$base_sha" ] && git cat-file -e "$base_sha:package.json" 2>/dev/null && [ -f package.json ]; then
  old_manifest=$(mktemp)
  git show "$base_sha:package.json" > "$old_manifest"
  if ! python3 - "$old_manifest" package.json <<'PY'
import json, sys
keys = (
    "name", "version", "workspaces", "packageManager", "engines",
    "dependencies", "devDependencies", "optionalDependencies",
    "peerDependencies", "overrides", "resolutions",
)
def relevant(path):
    with open(path, encoding="utf-8") as handle:
        data = json.load(handle)
    return {key: data.get(key) for key in keys}
sys.exit(0 if relevant(sys.argv[1]) == relevant(sys.argv[2]) else 1)
PY
  then
    manifest_inputs_changed=1
  fi
  rm -f "$old_manifest"
fi

path_changed() {
  grep -Fxq "$1" "$changed_files"
}

if [ "$manifest_inputs_changed" -eq 1 ]; then
  if ! path_changed bun.lock; then
    fail package.json 1 "Dependency-bearing package.json fields changed but bun.lock did not; run 'bun install'."
  fi
  if ! path_changed package-lock.json; then
    fail package.json 1 "Dependency-bearing package.json fields changed but package-lock.json did not; refresh the npm lockfile."
  fi
else
  if path_changed bun.lock; then
    fail bun.lock 1 "bun.lock changed without dependency-bearing package.json changes; verify lockfile synchronization."
  fi
  if path_changed package-lock.json; then
    fail package-lock.json 1 "package-lock.json changed without dependency-bearing package.json changes; verify lockfile synchronization."
  fi
fi

while IFS= read -r workflow; do
  [ -f "$workflow" ] || continue
  while IFS=: read -r line value; do
    value=${value#"${value%%[![:space:]]*}"}
    if [[ ! "$value" =~ ^\[[[:space:]]*self-hosted[[:space:]]*\]([[:space:]]*#.*)?$ ]]; then
      fail "$workflow" "$line" "Every job must use exactly 'runs-on: [self-hosted]'; found: $value"
    fi
  done < <(awk '/^[[:space:]]*runs-on:/ { line=$0; sub(/^[[:space:]]*runs-on:[[:space:]]*/, "", line); print NR ":" line }' "$workflow")
done < <(find .github/workflows -maxdepth 1 -type f -name '*.yml' -print 2>/dev/null | sort)

stub_pattern='TODO:[[:space:]]*imple''ment|not imple''mented|placeholder imple''mentation'
while IFS= read -r file; do
  [ -f "$file" ] || continue
  while IFS=: read -r line text; do
    [ -n "${line:-}" ] || continue
    annotate warning "$file" "$line" "Possible agent stub in changed file: $text"
  done < <(grep -nEi "$stub_pattern" "$file" 2>/dev/null || true)
done < "$changed_files"

if [ "$failed" -ne 0 ]; then
  echo "Repository guards failed."
  exit 1
fi

echo "Repository guards passed."
