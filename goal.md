GOAL.md - Vals AI (2-hour build)
Standing rules (keep in every GOAL.md)
Prototype, not demo-as-deliverable
Build a working prototype Ami can walk through in 90 seconds. The deliverable is the prototype. The 90-second demo is only how Ami presents that prototype. Do not treat a demo as the thing you ship.

UI observation (mandatory)
Public sources only: website screenshots, demo videos (with timestamps), product tours, docs, help center, app-store screenshots, changelog images. Never sign up, create accounts, or log in.

Every GOAL.md must include ## Their UI before Acceptance criteria, with subsections in this order:

Sources
Layout
Visual style
Tone of UI copy
The exact screen where my proposed improvement would live
Build instruction (match their visual style and terminology so the prototype looks like a feature inside their product)
Be honest: if only marketing illustrations are visible, say "marketing UI only" and infer carefully. If no UI is publicly visible, say so, describe what can be inferred from docs, and default to a clean neutral style.

Writing: simple English. No em dashes or en dashes.

Role this GOAL targets
Open role: Founding Product Manager (Vals Smith)
JD: https://jobs.ashbyhq.com/vals-ai/e5088c0f-5490-4c3c-b9d6-befd8fd0655c
Location: San Francisco, OnSite (relocation support; $1,500 housing stipend within one mile)
Comp (public): $150K-$200K + equity
Core job (from JD): own Vals Smith roadmap (onboarding, repo ingestion, results UX, integrations, demo/POC); be the technical half of enterprise deals with CTOs/Heads of AI; build activation funnel; help price/package credits and enterprise plans.
Bar notes: 2+ years technical customer-facing; prior IC eng + CS/EE/math preferred; write code to scope evals and prototypes.
Sponsorship: Unknown from public JD (visa not explicit). Confirm in process.
/goal
Build a working prototype that, given a synthetic enterprise professional-task eval run (custom coding or domain tasks with graded checks), returns a buyer-facing model pick evidence packet: recommended model, head-to-head pass rates, per-task cited grading scores (task id, check, pass/fail, confidence, evidence pointer), cost/latency snapshot, and a ship vs escalate-for-human-review gate. Ami must walk through this prototype in 90 seconds. Maps to Vals Smith "Review your results" plus Platform Results/Compare language, and to Ami Rubric Lens + evidence packets.

Scope (fits 2 hours)
Synthetic inputs only. Never sign up at platform.vals.ai or Vals Smith Login. No real GitHub OAuth. No customer repos. No live model API bills required for the demo path (precomputed synthetic run fixtures are fine).
1 happy path (Model A clearly wins with high-confidence cited passes) + 1 close-call path (models within noise; escalate for human review) + 1 fail/regress path (winner fails a dealbreaker task; recommendation flips or blocks ship).
Rubric: every graded row has a citation pointer; packet states recommended model + why; low-confidence or conflicting grades set escalate=true.
Simple UI that looks like a Smith / Platform results feature (see Their UI), not a separate generic dashboard.
Out of scope: real repo ingestion, live harness runners, production billing/credits, signed-in Vals access, training private benches from real PHI/PII.
Reuse first
Adapt Rubric Lens (measurable checks, pass/fail before ship) from https://amiteshdwivedijhu-ship-it.github.io/
Reuse evidence-cited packet patterns from Ami Prior Auth / portfolio eval craft on the same site.
Optional light touch: Ellipsis-era eval mindset as personal method only (do not pitch Ellipsis as a Vals customer).
Vocabulary to prefer: Pass Rate, Success Rate, Low Confidence, Check, Test Suite, Run, Compare, per-task breakdown, Human Review, harness, model pick, evidence packet, escalate.
Their UI
Honesty note: Public sources show (1) live marketing/leaderboard UI on vals.ai (Vals Index charts, Benchmarks cards), (2) Vals Smith marketing UI with three-step mockups and Login/CREATE BENCHMARK (no signed-in Smith session; never logged in), and (3) docs pages that embed real Platform Results table screenshots (Test Suites / Results / Acid Test / Human Review / Traces). Treat Smith step art as marketing UI. Treat docs Results screenshots as documented product chrome, not a session we authenticated. Signed-in Smith results UX and full Platform app were not observed live.

Sources
Homepage + Vals Index (Performance Score / Cost / Latency / Token Usage): https://www.vals.ai/
Benchmarks directory (Vals Index, Legal, Finance, Healthcare, Coding, Voice, etc.): https://www.vals.ai/benchmarks/
Vals Smith marketing (Connect repo / Pick models & harnesses / Review your results; Trusted by Vercel, THORIN, exa, Fireworks, Harvey): https://www.vals.ai/vals-smith
Series A (Smith GA, independent evaluator thesis): https://www.vals.ai/blogs/series-a
Platform docs Introduction (Test Suite / Test / Check): https://docs.vals.ai/get_started/introduction
Viewing Results (Pass Rate, Success Rate, Low Confidence, Compare, Human Review, filters): https://docs.vals.ai/web_app/results
Local captures: /workspace/ami-x-growth-wave-2026-09-28/vals/ui/ (homepage.png, vals-smith.png, vals-smith-full.png, benchmarks.png, series-a.png, docs-results.png)
Layout
Marketing site: top nav (Benchmarks, Models, Comparison, Vals Smith external, App Reports, Government, News, Blog, About); white hero; Index bar chart with metric tabs.
Smith marketing: hero + CREATE BENCHMARK; three cards for Connect / Pick models & harnesses / Review results; Public Benchmarks link; Login.
Platform (from docs screenshot): app top tabs Test Suites | Results | Acid Test | Human Review | Traces; Results table (Name, Test Suite, Model, Pass Rate, Status, Run By, times); row opens single-run detail (left: input/output/check results; right: stats, error analysis, run parameters); Compare two runs side by side.
Visual style
Colors: white / off-white paper, near-black ink, Vals green accents (~forest to mid green on CTAs and selected nav), light green wash on selected Index/sidebar items, multi-color bars only on public Index charts.
Typography: serif headlines on Smith/blog marketing; clean sans for nav, tables, UI labels.
Density: marketing is spacious; Platform Results is medium-high density data table.
Components: green primary buttons with diagonal arrow, pill privacy badges, rounded cards, status dots (Success), percent Pass Rate cells, filter chips.
Mode: light mode in all public materials observed.
Tone of UI copy
Direct eval language: Pass Rate, Success Rate, Low Confidence, Check, Test Suite, Run, Compare, Human Review, per-task breakdown, harness, model, Private / Proprietary.
Smith: Connect your repo, Pick models & harnesses, Review your results, Your data stays private.
Calm, independent-scorekeeper tone. No vibes hype. Buyer packet should sound like evidence for a CTO, not a growth slogan.
The exact screen where my proposed improvement would live
The Smith Review your results surface (and/or Platform single-run + Compare view), extended into a shareable model pick evidence packet: recommended model, cited per-task grades, confidence, cost/latency snapshot, ship vs Human Review escalate. This is the screen a founding PM would own when a CTO asks "which model do we buy, and why?"
Build instruction
Match Vals closely enough that the prototype looks like a feature inside Smith / Platform results: white paper, green primary CTAs, sans table rows, optional serif section title.
Use their terminology exactly: Pass Rate, Success Rate, Low Confidence, Check, Test Suite, Run, Compare, Human Review, per-task breakdown, harness, escalate / Needs Review.
Every grade row must show a citation pointer (task id + check id + evidence span or hidden-test outcome). When confidence is low or models tie within noise, set escalate for Human Review and do not pretend certainty.
Acceptance criteria (must work when Ami demos the prototype in 90 seconds)
Load synthetic run A (Model A dominates) -> packet recommends Model A, shows higher Pass Rate, each top win cites task/check evidence, confidence high, escalate=false.
Load synthetic run B (Models A and B within noise / mixed checks) -> packet flags close call, cites conflicting tasks, escalate=true (Human Review).
Load synthetic run C (leader fails a dealbreaker task) -> recommendation blocks or flips, dealbreaker row cited, escalate=true.
Show a compact eval table: case | recommended model | escalate | pass/fail reason (must fail the prototype's own rubric if any grade lacks a citation pointer).
What the 90-second walkthrough proves about THEIR problem
Vals already publishes independent Index scores and sells Smith so enterprises can grade models on their own repos (https://www.vals.ai/ ; https://www.vals.ai/vals-smith). Walking through this prototype shows Ami can productize the hard buyer layer the Founding PM role is hired to own: a CTO-ready evidence packet with cited grading scores, confidence, and Human Review escalation for model pick decisions that are today made on vibes (https://jobs.ashbyhq.com/vals-ai/e5088c0f-5490-4c3c-b9d6-befd8fd0655c ; https://www.vals.ai/blogs/series-a).

TIMEBOX fallback
If the prototype is not walkthrough-ready at 2 hours: LIGHT pitch fallback = open Rubric Lens (or Prior Auth evidence packet) from https://amiteshdwivedijhu-ship-it.github.io/ + 2 mapping lines:

"Your buyers already need more than a public Index bar; they need a packet that says which model wins on their tasks with cited grades."
"The 2-hour extension is the Smith Review-your-results evidence packet + Human Review escalate gate your Founding PM seat is hired to ship."