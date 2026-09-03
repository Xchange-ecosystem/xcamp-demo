#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

baseline_file=.github/quality-baseline.json
if [[ ! -f "$baseline_file" ]]; then
  echo "::error file=$baseline_file::Quality baseline file is missing."
  exit 1
fi

tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT

prettier_output="$tmp_dir/prettier.txt"
eslint_output="$tmp_dir/eslint.json"
tsc_output="$tmp_dir/tsc.txt"

# These checks are expected to return non-zero while baseline debt remains.
set +e
bunx prettier --check . >"$prettier_output" 2>&1
prettier_status=$?
bunx eslint . -f json >"$eslint_output" 2>"$tmp_dir/eslint.stderr"
eslint_status=$?
bunx tsc --noEmit >"$tsc_output" 2>&1
tsc_status=$?
set -e

read -r baseline_prettier baseline_eslint_errors baseline_eslint_warnings baseline_typescript < <(
  bun -e '
    const path = process.argv[1];
    const baseline = await Bun.file(path).json();
    const keys = ["prettier_files", "eslint_errors", "eslint_warnings", "typescript_errors"];
    for (const key of keys) {
      if (!Number.isInteger(baseline[key]) || baseline[key] < 0) {
        console.error(`Invalid non-negative integer baseline: ${key}`);
        process.exit(1);
      }
    }
    console.log(keys.map((key) => baseline[key]).join(" "));
  ' "$baseline_file"
)

current_prettier=$(
  python3 - "$prettier_output" <<'PY'
import re
import sys

text = open(sys.argv[1], encoding="utf-8").read()
match = re.search(r"Code style issues found in (\d+) files?\.", text)
if match:
    print(match.group(1))
elif "All matched files use Prettier code style!" in text:
    print(0)
else:
    print("Unable to parse Prettier check output.", file=sys.stderr)
    print(text, file=sys.stderr)
    raise SystemExit(1)
PY
)

read -r current_eslint_errors current_eslint_warnings < <(
  bun -e '
    const path = process.argv[1];
    let report;
    try {
      report = await Bun.file(path).json();
    } catch (error) {
      console.error(`Unable to parse ESLint JSON: ${error}`);
      process.exit(1);
    }
    if (!Array.isArray(report)) {
      console.error("ESLint JSON report is not an array.");
      process.exit(1);
    }
    const errors = report.reduce((sum, file) => sum + (file.errorCount ?? 0), 0);
    const warnings = report.reduce((sum, file) => sum + (file.warningCount ?? 0), 0);
    console.log(`${errors} ${warnings}`);
  ' "$eslint_output"
)

current_typescript=$(
  python3 - "$tsc_output" <<'PY'
import re
import sys

text = open(sys.argv[1], encoding="utf-8").read()
print(len(re.findall(r"^(?:.+\(\d+,\d+\): )?error TS\d+:", text, flags=re.MULTILINE)))
PY
)

if ((prettier_status > 1)); then
  echo "::error::Prettier exited unexpectedly with status $prettier_status."
  cat "$prettier_output"
  exit 1
fi
if ((eslint_status > 1)); then
  echo "::error::ESLint exited unexpectedly with status $eslint_status."
  cat "$tmp_dir/eslint.stderr"
  exit 1
fi
if ((tsc_status != 0 && current_typescript == 0)); then
  echo "::error::TypeScript exited with status $tsc_status but emitted no countable diagnostics."
  cat "$tsc_output"
  exit 1
fi

rows=(
  "Prettier files|$baseline_prettier|$current_prettier|prettier_files"
  "ESLint errors|$baseline_eslint_errors|$current_eslint_errors|eslint_errors"
  "ESLint warnings|$baseline_eslint_warnings|$current_eslint_warnings|eslint_warnings"
  "TypeScript errors|$baseline_typescript|$current_typescript|typescript_errors"
)

report="# Quality debt ratchet

| Check | Baseline | Current | Delta |
| --- | ---: | ---: | ---: |"
failed=0

for row in "${rows[@]}"; do
  IFS='|' read -r label baseline current key <<<"$row"
  delta=$((current - baseline))
  printf -v signed_delta '%+d' "$delta"
  report+=$'\n'"| $label | $baseline | $current | $signed_delta |"

  if ((current > baseline)); then
    echo "::error file=$baseline_file::${label} debt grew from ${baseline} to ${current}."
    failed=1
  elif ((current < baseline)); then
    if ((current == 0)); then
      echo "::notice file=$baseline_file::${label} reached zero. Promote this gate to hard in ci.yml and delete ${key} from the baseline and ratchet."
    else
      echo "::notice file=$baseline_file::${label} improved from ${baseline} to ${current}. Lower ${key} in .github/quality-baseline.json."
    fi
  fi
done

printf '%s\n' "$report"
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  printf '%s\n' "$report" >>"$GITHUB_STEP_SUMMARY"
fi

if ((failed)); then
  echo
  echo "Quality debt regression detected. Existing debt may shrink, never grow."
  exit 1
fi

echo
echo "Quality debt is at or below every checked-in baseline."
