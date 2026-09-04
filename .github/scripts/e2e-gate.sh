#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

results_xml=${E2E_RESULTS_XML:-playwright-report/results.xml}
allowlist=${E2E_ALLOWLIST:-.github/e2e-known-failures.txt}
base_sha=${E2E_BASE_SHA:-}

if [[ ! -f "$results_xml" ]]; then
  echo "::error file=$results_xml::Playwright JUnit report is missing."
  exit 1
fi
if [[ ! -f "$allowlist" ]]; then
  echo "::error file=$allowlist::E2E known-failures allowlist is missing."
  exit 1
fi

tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT
report_file="$tmp_dir/report.md"
base_allowlist="$tmp_dir/base-allowlist.txt"
base_has_allowlist=0

# Once the allowlist exists on the base branch, every surviving entry must be
# byte-for-byte identical. Deletions are the only permitted evolution.
if [[ -n "$base_sha" ]] && git cat-file -e "$base_sha:$allowlist" 2>/dev/null; then
  git show "$base_sha:$allowlist" >"$base_allowlist"
  base_has_allowlist=1
else
  : >"$base_allowlist"
fi

set +e
python3 - "$results_xml" "$allowlist" "$report_file" "$base_allowlist" "$base_sha" "$base_has_allowlist" <<'PY'
import csv
import datetime as dt
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

xml_path, allowlist_path, report_path, base_allowlist_path = map(Path, sys.argv[1:5])
base_sha = sys.argv[5]
base_has_allowlist = sys.argv[6] == "1"
today = dt.date.today()
entries = {}
entry_lines = {}
problems = []
annotations = []

with allowlist_path.open(encoding="utf-8", newline="") as handle:
    for line_number, raw in enumerate(handle, 1):
        line = raw.rstrip("\r\n")
        if not line or line.startswith("#"):
            continue
        fields = next(csv.reader([line], delimiter="\t"))
        if len(fields) != 6:
            problems.append(f"allowlist line {line_number}: expected 6 tab-separated fields, got {len(fields)}")
            continue
        file_name, title, signature, added_raw, review_raw, classification = fields
        key = (file_name, title)
        if key in entries:
            problems.append(f"allowlist line {line_number}: duplicate identity {file_name} › {title}")
            continue
        try:
            added = dt.date.fromisoformat(added_raw)
            review = dt.date.fromisoformat(review_raw)
        except ValueError as error:
            problems.append(f"allowlist line {line_number}: invalid ISO date ({error})")
            continue
        if review <= added:
            problems.append(f"allowlist line {line_number}: REVIEW-BY must be after date added")
        if added > today:
            problems.append(f"allowlist line {line_number}: date added {added} is in the future")
        if review != added + dt.timedelta(days=90):
            problems.append(f"allowlist line {line_number}: REVIEW-BY must be exactly 90 days after date added")
        if classification not in {"ALWAYS-FAILS", "FLAKY", "ENV-SENSITIVE"}:
            problems.append(
                f"allowlist line {line_number}: classification must be ALWAYS-FAILS, FLAKY, or ENV-SENSITIVE"
            )
        if today > review:
            problems.append(f"allowlist line {line_number}: REVIEW-BY {review} is past due")
        entries[key] = {
            "signature": signature,
            "added": added_raw,
            "review": review_raw,
            "classification": classification,
        }
        entry_lines[key] = line

base_lines = {
    line.rstrip("\r\n")
    for line in base_allowlist_path.read_text(encoding="utf-8").splitlines()
    if line and not line.startswith("#")
}
if base_has_allowlist:
    for key, line in entry_lines.items():
        if line not in base_lines:
            problems.append(
                f"allowlist may only shrink; entry is new or mutated relative to {base_sha}:\n{line}"
            )

try:
    root = ET.parse(xml_path).getroot()
except (ET.ParseError, OSError) as error:
    print(f"::error file={xml_path}::Unable to parse JUnit XML: {error}")
    raise SystemExit(1)

seen = set()
failures = {}
for testcase in root.iter("testcase"):
    key = (testcase.get("classname", ""), testcase.get("name", ""))
    if key in seen:
        problems.append(f"JUnit report contains duplicate testcase identity: {key[0]} › {key[1]}")
        continue
    seen.add(key)
    failure = testcase.find("failure")
    if failure is None:
        failure = testcase.find("error")
    if failure is not None:
        failures[key] = failure.get("message", "").replace("\n", " ").strip()

rows = []
for key in sorted(seen | set(entries)):
    file_name, title = key
    allowed = entries.get(key)
    actual_signature = failures.get(key)
    classification = allowed["classification"] if allowed else "—"
    flaky = "—"
    if actual_signature is not None and allowed is None:
        state = "NEW FAILURE"
        problems.append(f"unallowlisted failure: {file_name} › {title} [{actual_signature}]")
    elif allowed is not None and key not in seen:
        state = "MISSING FROM REPORT"
        problems.append(f"allowlisted test missing from report: {file_name} › {title}")
    elif allowed is not None and actual_signature is None and classification == "ALWAYS-FAILS":
        state = "NOW PASSES — DELETE ENTRY"
        problems.append(f"allowlisted test now passes; delete exactly:\n{entry_lines[key]}")
    elif allowed is not None and actual_signature is None:
        state = "PASS (TOLERATED)"
        if classification == "FLAKY":
            flaky = "PASS"
        annotations.append(
            ("notice", f"{classification} observed PASS: {file_name} › {title}")
        )
    elif (
        allowed is not None
        and actual_signature != allowed["signature"]
        and classification != "ALWAYS-FAILS"
    ):
        state = "FAIL — SIGNATURE VARIED"
        if classification == "FLAKY":
            flaky = "FAIL"
        annotations.append(
            (
                "warning",
                f"{classification} failure signature varied: {file_name} › {title}; "
                f"expected [{allowed['signature']}], got [{actual_signature}]",
            )
        )
    elif allowed is not None and actual_signature != allowed["signature"]:
        state = "SIGNATURE CHANGED"
        problems.append(
            f"failure signature changed: {file_name} › {title}; "
            f"expected [{allowed['signature']}], got [{actual_signature}]"
        )
    elif allowed is not None:
        state = "FAIL (TOLERATED)" if classification != "ALWAYS-FAILS" else "EXPECTED FAILURE"
        if classification == "FLAKY":
            flaky = "FAIL"
        if classification != "ALWAYS-FAILS":
            annotations.append(
                ("notice", f"{classification} observed FAIL: {file_name} › {title}")
            )
    else:
        continue
    rows.append(
        (file_name, title, classification, state, flaky, allowed["review"] if allowed else "—")
    )

report = [
    "# E2E known-failures ratchet",
    "",
    "| File | Test | Classification | Observed | Flaky | Review by |",
    "| --- | --- | --- | --- | --- | --- |",
]
for file_name, title, classification, state, flaky, review in rows:
    escaped_title = title.replace("|", "\\|")
    report.append(
        f"| {file_name} | {escaped_title} | {classification} | {state} | {flaky} | {review} |"
    )
report.extend(
    [
        "",
        f"Known entries: **{len(entries)}** · Current failures: **{len(failures)}** · "
        f"Gate: **{'FAIL' if problems else 'PASS'}**",
    ]
)
Path(report_path).write_text("\n".join(report) + "\n", encoding="utf-8")

for level, message in annotations:
    print(f"::{level} file={allowlist_path}::{message}")
for problem in problems:
    first, *rest = problem.splitlines()
    print(f"::error file={allowlist_path}::{first}")
    for line in rest:
        print(line)
raise SystemExit(1 if problems else 0)
PY
status=$?
set -e

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  cat "$report_file" >>"$GITHUB_STEP_SUMMARY"
else
  cat "$report_file"
fi

if ((status)); then
  echo
  echo "E2E known-failures ratchet rejected this result. New failures block; recovered tests must be removed from the allowlist."
  exit "$status"
fi

echo
echo "E2E results satisfy the checked-in classification policies."
