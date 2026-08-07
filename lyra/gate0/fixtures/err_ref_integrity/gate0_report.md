# Gate 0 Report

Batch: `/home/user/xcamp-nox-founder-app/lyra/gate0/fixtures/err_ref_integrity`

**FAIL**

## BLOCK (2 findings)

| Record ID | Check | Detail |
|-----------|-------|--------|
| `ATOM-T-001` | ref_integrity | provenance.source_id='SRC-DOES-NOT-EXIST' not in 00_source_register.json |
| `ATOM-T-001` | register_coverage | primary_source_id drift: JSONL provenance[0]='SRC-DOES-NOT-EXIST' vs register='SRC-DOC-A' |

