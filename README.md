# Vals AI evidence packet prototype

Working prototype for the Smith "Review your results" surface: a buyer-facing
model pick evidence packet with cited per-task grades, confidence, a cost and
latency snapshot, and a ship vs escalate (Human Review) gate.

Prototype only. All runs are synthetic fixtures (Northbridge FinOps v1 suite,
6 tests, 18 checks, 6 runs: 2 models x 3 scenarios). No real model APIs, no
customer repos, no signed-in Vals access. Public URL is unlisted from the
portfolio root.

## The three demo paths

| Case | Recommended model | Escalate | Why |
| ---- | ----------------- | -------- | --- |
| A. Model A dominates | Model A | No | +27.8 pts Pass Rate outside noise, 4-0-2 task record, all High Confidence |
| B. Close call | No pick | Yes | delta 5.6 pts inside the +-6.0 pt noise margin, verdicts split 3-3, Low Confidence grades |
| C. Dealbreaker fail | Model B (fallback) | Yes | Leader fails T-03 C-01 (PII in reply); ship blocked, pick flips |

The gate is computed from the fixture rows, not from the scenario label.
Rubric: every graded row must carry a citation pointer (output span or hidden
test). The app runs a validator on load; an uncited grade fails the rubric and
the packet refuses to render.

## Run locally

```sh
python3 -m http.server 8000
# open http://127.0.0.1:8000/
```

## Files

- `index.html` chrome and views (Evidence packet, Results, Human Review)
- `styles.css` Vals paper-and-green visual style, serif section titles, sans tables
- `data.js` synthetic suite + run fixtures
- `app.js` statistics, gate logic, rubric validator, rendering
- `goal.md` the build brief that produced this prototype

Terminology follows Vals docs (Pass Rate, Success Rate, Low Confidence,
Compare, Human Review, per-task breakdown, harness).
