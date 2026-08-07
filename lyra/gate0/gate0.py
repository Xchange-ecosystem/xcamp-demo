#!/usr/bin/env python3
"""Gate 0 batch validator for Lyra extraction batches.

Usage:
    python gate0.py <batch_dir> [--vocab vocab.json] [--known-ids known_ids.json]

Exit codes:
    0  All blocking checks passed (warnings may still be present).
    1  One or more BLOCK checks failed.
    2  Usage / environment error (missing file, bad JSON, missing dependency).
"""

import argparse
import csv
import json
import os
import sys
from pathlib import Path
from typing import Any

try:
    from jsonschema import Draft202012Validator
    from jsonschema.exceptions import SchemaError
except ImportError:
    print(
        "ERROR: jsonschema not installed. Run: pip install jsonschema",
        file=sys.stderr,
    )
    sys.exit(2)


# ---------------------------------------------------------------------------
# Finding accumulator
# ---------------------------------------------------------------------------

BLOCK = "BLOCK"
WARN = "WARN"


class Finding:
    def __init__(self, severity: str, check: str, record_id: str, detail: str) -> None:
        self.severity = severity
        self.check = check
        self.record_id = record_id
        self.detail = detail


_findings: list[Finding] = []


def _add(severity: str, check: str, record_id: str, detail: str) -> None:
    _findings.append(Finding(severity, check, record_id, detail))


# ---------------------------------------------------------------------------
# I/O helpers
# ---------------------------------------------------------------------------

def _load_jsonl(path: Path) -> list[dict]:
    records: list[dict] = []
    with open(path, encoding="utf-8") as fh:
        for lineno, raw in enumerate(fh, 1):
            line = raw.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError as exc:
                _add(BLOCK, "schema", f"{path.name}:{lineno}", f"JSON parse error: {exc}")
    return records


def _load_json(path: Path) -> Any:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _load_csv(path: Path) -> list[dict]:
    with open(path, encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


# ---------------------------------------------------------------------------
# Controlled-vocabulary helper
# ---------------------------------------------------------------------------

def _check_vocab(record_id: str, value: str, field: str, allowed: list[str]) -> None:
    if value and value not in allowed:
        _add(BLOCK, "controlled_vocab", record_id, f"{field}={value!r} not in vocab")


# ---------------------------------------------------------------------------
# Report writer
# ---------------------------------------------------------------------------

def _write_report(batch_dir: Path) -> str:
    blocks = [f for f in _findings if f.severity == BLOCK]
    warns = [f for f in _findings if f.severity == WARN]

    lines: list[str] = []
    lines.append("# Gate 0 Report")
    lines.append("")
    lines.append(f"Batch: `{batch_dir.resolve()}`")
    lines.append("")

    if not _findings:
        lines.append("**PASS** — no findings.")
    else:
        status = "FAIL" if blocks else "PASS (with warnings)"
        lines.append(f"**{status}**")
        lines.append("")

        if blocks:
            n = len(blocks)
            lines.append(f"## BLOCK ({n} finding{'s' if n != 1 else ''})")
            lines.append("")
            lines.append("| Record ID | Check | Detail |")
            lines.append("|-----------|-------|--------|")
            for f in blocks:
                lines.append(f"| `{f.record_id}` | {f.check} | {f.detail} |")
            lines.append("")

        if warns:
            n = len(warns)
            lines.append(f"## WARN ({n} finding{'s' if n != 1 else ''})")
            lines.append("")
            lines.append("| Record ID | Check | Detail |")
            lines.append("|-----------|-------|--------|")
            for f in warns:
                lines.append(f"| `{f.record_id}` | {f.check} | {f.detail} |")
            lines.append("")

    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Gate 0 — blocking batch validator for Lyra extraction batches."
    )
    parser.add_argument("batch_dir", help="Path to batch directory")
    parser.add_argument(
        "--vocab",
        default=None,
        help="Path to vocab.json (default: <batch_dir>/vocab.json)",
    )
    parser.add_argument(
        "--known-ids",
        dest="known_ids",
        default=None,
        help="Path to known_ids.json listing atom/pattern IDs from prior batches",
    )
    args = parser.parse_args()

    batch_dir = Path(args.batch_dir)
    if not batch_dir.is_dir():
        print(f"ERROR: batch_dir not found: {batch_dir}", file=sys.stderr)
        sys.exit(2)

    # Schemas live alongside gate0.py
    script_dir = Path(__file__).parent
    atom_schema_path = script_dir / "knowledge_atom_schema.json"
    pattern_schema_path = script_dir / "cognitive_pattern_schema.json"
    for p in (atom_schema_path, pattern_schema_path):
        if not p.exists():
            print(f"ERROR: schema file not found: {p}", file=sys.stderr)
            sys.exit(2)

    atom_schema = _load_json(atom_schema_path)
    pattern_schema = _load_json(pattern_schema_path)
    atom_validator = Draft202012Validator(atom_schema)
    pattern_validator = Draft202012Validator(pattern_schema)

    # Vocab
    vocab_path = Path(args.vocab) if args.vocab else batch_dir / "vocab.json"
    if not vocab_path.exists():
        print(f"ERROR: vocab.json not found at {vocab_path}", file=sys.stderr)
        sys.exit(2)
    vocab: dict = _load_json(vocab_path)
    freeze_domains: bool = vocab.get("freeze_domains", False)

    # Known IDs from prior-batch manifest
    known_ids: set[str] = set()
    if args.known_ids:
        ki_path = Path(args.known_ids)
        if ki_path.exists():
            data = _load_json(ki_path)
            if isinstance(data, list):
                known_ids.update(data)
            elif isinstance(data, dict) and "ids" in data:
                known_ids.update(data["ids"])

    # Batch files
    atom_files = sorted(batch_dir.glob("*_candidate_atoms.jsonl"))
    pattern_files = sorted(batch_dir.glob("*_cognitive_pattern_candidates.jsonl"))
    source_reg_path = batch_dir / "00_source_register.json"
    review_reg_path = batch_dir / "05_review_register.csv"

    # Source register
    source_reg: dict = {}
    if source_reg_path.exists():
        source_reg = _load_json(source_reg_path)
    else:
        _add(BLOCK, "ref_integrity", "00_source_register.json", "File not found in batch directory")

    source_ids: set[str] = set(source_reg.keys())

    # Review register
    review_rows: list[dict] = []
    if review_reg_path.exists():
        review_rows = _load_csv(review_reg_path)
    else:
        _add(BLOCK, "register_coverage", "05_review_register.csv", "File not found in batch directory")

    # Load records
    atoms: list[dict] = []
    for af in atom_files:
        atoms.extend(_load_jsonl(af))

    patterns: list[dict] = []
    for pf in pattern_files:
        patterns.extend(_load_jsonl(pf))

    # -----------------------------------------------------------------------
    # Check 1 — Schema validation (BLOCK)
    # -----------------------------------------------------------------------
    for atom in atoms:
        rid = atom.get("atom_id", "<unknown>")
        for err in atom_validator.iter_errors(atom):
            path = ".".join(str(p) for p in err.absolute_path) or "(root)"
            _add(BLOCK, "schema", rid, f"{path}: {err.message}")

    for pat in patterns:
        rid = pat.get("pattern_id", "<unknown>")
        for err in pattern_validator.iter_errors(pat):
            path = ".".join(str(p) for p in err.absolute_path) or "(root)"
            _add(BLOCK, "schema", rid, f"{path}: {err.message}")

    # -----------------------------------------------------------------------
    # Check 2 — Controlled vocabulary (BLOCK; domain is WARN/BLOCK via flag)
    # -----------------------------------------------------------------------
    domain_ids: list[str] = vocab.get("domain_ids", [])

    for atom in atoms:
        rid = atom.get("atom_id", "<unknown>")
        _check_vocab(rid, atom.get("atom_type", ""),      "atom_type",      vocab.get("atom_type", []))
        _check_vocab(rid, atom.get("layer", ""),           "layer",           vocab.get("layer", []))
        _check_vocab(rid, atom.get("scope", ""),           "scope",           vocab.get("scope", []))
        _check_vocab(rid, atom.get("epistemic_status", ""), "epistemic_status", vocab.get("epistemic_status", []))
        _check_vocab(rid, atom.get("review_status", ""),   "review_status",   vocab.get("review_status", []))
        _check_vocab(rid, atom.get("sensitivity", ""),     "sensitivity",     vocab.get("sensitivity", []))

        for prov in atom.get("provenance", []):
            st = prov.get("source_type", "")
            if st and st not in vocab.get("source_type", []):
                _add(BLOCK, "controlled_vocab", rid, f"provenance.source_type={st!r} not in vocab")

        for et in atom.get("export_targets", []):
            if et and et not in vocab.get("export_targets", []):
                _add(BLOCK, "controlled_vocab", rid, f"export_targets contains {et!r} not in vocab")

        domain = atom.get("domain", "")
        if domain and domain_ids and domain not in domain_ids:
            sev = BLOCK if freeze_domains else WARN
            _add(sev, "controlled_vocab", rid,
                 f"domain={domain!r} not in vocab.domain_ids (freeze_domains={freeze_domains})")

    # -----------------------------------------------------------------------
    # Check 3 — Referential integrity (BLOCK)
    # -----------------------------------------------------------------------
    all_batch_ids: set[str] = set()
    for atom in atoms:
        if "atom_id" in atom:
            all_batch_ids.add(atom["atom_id"])
    for pat in patterns:
        if "pattern_id" in pat:
            all_batch_ids.add(pat["pattern_id"])

    resolvable: set[str] = all_batch_ids | known_ids

    for atom in atoms:
        rid = atom.get("atom_id", "<unknown>")
        for prov in atom.get("provenance", []):
            sid = prov.get("source_id", "")
            if sid and sid not in source_ids:
                _add(BLOCK, "ref_integrity", rid,
                     f"provenance.source_id={sid!r} not in 00_source_register.json")

        for ref in atom.get("related_atom_ids", []):
            if ref and ref not in resolvable:
                _add(BLOCK, "ref_integrity", rid,
                     f"related_atom_ids contains {ref!r} — not found in batch or known_ids")

        sup = atom.get("supersedes_atom_id", "")
        if sup and sup not in resolvable:
            _add(BLOCK, "ref_integrity", rid,
                 f"supersedes_atom_id={sup!r} — not found in batch or known_ids")

    for pat in patterns:
        rid = pat.get("pattern_id", "<unknown>")
        for ev in pat.get("evidence", []):
            sid = ev.get("source_id", "")
            if sid and sid not in source_ids:
                _add(BLOCK, "ref_integrity", rid,
                     f"evidence.source_id={sid!r} not in 00_source_register.json")

    # -----------------------------------------------------------------------
    # Check 4 — Identity uniqueness (BLOCK)
    # -----------------------------------------------------------------------
    seen: dict[str, str] = {}
    for atom in atoms:
        rid = atom.get("atom_id", "")
        if not rid:
            continue
        if rid in seen:
            _add(BLOCK, "identity", rid, f"Duplicate ID — first seen as {seen[rid]}")
        else:
            seen[rid] = "atom"

    for pat in patterns:
        rid = pat.get("pattern_id", "")
        if not rid:
            continue
        if rid in seen:
            _add(BLOCK, "identity", rid, f"Duplicate ID — first seen as {seen[rid]}")
        else:
            seen[rid] = "pattern"

    # -----------------------------------------------------------------------
    # Check 5 — Register coverage (BLOCK)
    # Covers all records (atoms + patterns). The 05_review_register.csv tracks
    # both atom and pattern entries; set equality is enforced across all JSONL IDs.
    # Twin-drift sub-check: epistemic_status and primary_source_id must agree.
    # -----------------------------------------------------------------------
    jsonl_ids: set[str] = set()
    for atom in atoms:
        if "atom_id" in atom:
            jsonl_ids.add(atom["atom_id"])
    for pat in patterns:
        if "pattern_id" in pat:
            jsonl_ids.add(pat["pattern_id"])

    reg_ids: set[str] = {
        row["record_id"] for row in review_rows if row.get("record_id")
    }

    for rid in sorted(jsonl_ids - reg_ids):
        _add(BLOCK, "register_coverage", rid,
             "Record in JSONL but missing from 05_review_register.csv")
    for rid in sorted(reg_ids - jsonl_ids):
        _add(BLOCK, "register_coverage", rid,
             "Record in 05_review_register.csv but not found in any JSONL")

    # Twin drift
    reg_by_id: dict[str, dict] = {
        row["record_id"]: row for row in review_rows if row.get("record_id")
    }

    for atom in atoms:
        rid = atom.get("atom_id", "")
        if rid not in reg_by_id:
            continue
        row = reg_by_id[rid]
        jsonl_es = atom.get("epistemic_status", "")
        reg_es = row.get("epistemic_status", "")
        if jsonl_es != reg_es:
            _add(BLOCK, "register_coverage", rid,
                 f"epistemic_status drift: JSONL={jsonl_es!r} vs register={reg_es!r}")
        provenance = atom.get("provenance", [])
        jsonl_sid = provenance[0].get("source_id", "") if provenance else ""
        reg_sid = row.get("primary_source_id", "")
        if jsonl_sid != reg_sid:
            _add(BLOCK, "register_coverage", rid,
                 f"primary_source_id drift: JSONL provenance[0]={jsonl_sid!r} vs register={reg_sid!r}")

    for pat in patterns:
        rid = pat.get("pattern_id", "")
        if rid not in reg_by_id:
            continue
        row = reg_by_id[rid]
        jsonl_es = pat.get("epistemic_status", "")
        reg_es = row.get("epistemic_status", "")
        if jsonl_es != reg_es:
            _add(BLOCK, "register_coverage", rid,
                 f"epistemic_status drift: JSONL={jsonl_es!r} vs register={reg_es!r}")
        evidence = pat.get("evidence", [])
        jsonl_sid = evidence[0].get("source_id", "") if evidence else ""
        reg_sid = row.get("primary_source_id", "")
        if jsonl_sid != reg_sid:
            _add(BLOCK, "register_coverage", rid,
                 f"primary_source_id drift: JSONL evidence[0]={jsonl_sid!r} vs register={reg_sid!r}")

    # -----------------------------------------------------------------------
    # Check 5b — Source-register type vs JSONL provenance source_type (WARN)
    # 00_source_register.json is not schema-validated, but its `type` field
    # must agree with every provenance.source_type that references the same
    # source_id, so the two representations stay in sync.
    # -----------------------------------------------------------------------
    prov_types: dict[str, set[str]] = {}
    for atom in atoms:
        for prov in atom.get("provenance", []):
            sid = prov.get("source_id", "")
            st = prov.get("source_type", "")
            if sid and st:
                prov_types.setdefault(sid, set()).add(st)

    for sid, types in sorted(prov_types.items()):
        if sid not in source_reg:
            continue  # already flagged by ref_integrity
        reg_type = source_reg[sid].get("type", "")
        for st in sorted(types):
            if reg_type and st != reg_type:
                _add(WARN, "source_reg_type_drift", sid,
                     f"provenance source_type={st!r} but register type={reg_type!r} "
                     f"— update 00_source_register.json or the atom provenance")

    # -----------------------------------------------------------------------
    # Check 6 — Confidence field (WARN, transitional)
    # v0.2 retires the `confidence` number; field must be absent or empty.
    # -----------------------------------------------------------------------
    for atom in atoms:
        rid = atom.get("atom_id", "<unknown>")
        conf = atom.get("confidence")
        if conf is not None and conf != "":
            _add(WARN, "confidence", rid,
                 f"confidence={conf} is present and non-empty — v0.2 retires this field")

    for pat in patterns:
        rid = pat.get("pattern_id", "<unknown>")
        conf = pat.get("confidence")
        if conf is not None and conf != "":
            _add(WARN, "confidence", rid,
                 f"confidence={conf} is present and non-empty — v0.2 retires this field")

    # -----------------------------------------------------------------------
    # Check 7 — Twin presence (WARN)
    # Every *.jsonl must have a matching *_review.md and vice versa.
    # -----------------------------------------------------------------------
    jsonl_stems: set[str] = {p.stem for p in batch_dir.glob("*.jsonl")}
    review_md_stems: set[str] = set()
    for p in batch_dir.glob("*_review.md"):
        # strip the trailing _review suffix to get the jsonl stem
        review_md_stems.add(p.stem[: -len("_review")])

    for stem in sorted(jsonl_stems - review_md_stems):
        _add(WARN, "twin_presence", f"{stem}.jsonl",
             "No matching *_review.md found for this JSONL file")
    for stem in sorted(review_md_stems - jsonl_stems):
        _add(WARN, "twin_presence", f"{stem}_review.md",
             "No matching .jsonl found for this review file")

    # -----------------------------------------------------------------------
    # Output
    # -----------------------------------------------------------------------
    report = _write_report(batch_dir)
    print(report, end="")

    report_path = batch_dir / "gate0_report.md"
    with open(report_path, "w", encoding="utf-8") as fh:
        fh.write(report)

    blocks = [f for f in _findings if f.severity == BLOCK]
    sys.exit(1 if blocks else 0)


if __name__ == "__main__":
    main()
