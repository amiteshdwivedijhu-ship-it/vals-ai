/* Vals AI evidence-packet prototype - synthetic fixture data.
 * Northbridge FinOps v1: a private enterprise test suite (@private).
 * 6 tests, 18 checks, 6 runs (2 models x 3 scenarios).
 * Every graded row carries a citation pointer: output span (o:F-T) or hidden test (h:id).
 * Rubric: a grade without a pointer must fail the prototype's own rubric check.
 */

var VALS_SUITE = {
  id: "northbridge-finops-v1",
  name: "Northbridge FinOps v1",
  tests: 6,
  checks: 18,
  privacy: "Private",
  runBy: "harness",
  tasks: {
    t01: {
      id: "T-01",
      title: "Ticket triage and escalation",
      tag: "Customer Ops",
      input:
        "Ticket #48213: payroll run failed overnight, 1,204 employees unpaid. Route to the right team, set priority, return a valid JSON envelope.",
      checks: [
        { id: "C-01", name: "Routes to Payroll Ops", category: "Correctness" },
        { id: "C-02", name: "Priority P1 computed from blast radius", category: "Correctness" },
        { id: "C-03", name: "Valid JSON envelope", category: "Format" }
      ]
    },
    t02: {
      id: "T-02",
      title: "Parameterize legacy SQL migration",
      tag: "Coding",
      input:
        "Legacy query interpolates the user id into the WHERE clause. Rewrite it parameterized without changing which rows it returns.",
      checks: [
        { id: "C-01", name: "Query semantics preserved (same row set)", category: "Correctness" },
        { id: "C-02", name: "No string concatenation; all values bound", category: "Correctness" },
        { id: "C-03", name: "Named params, consistent style", category: "Style" }
      ]
    },
    t03: {
      id: "T-03",
      title: "PII-safe support reply",
      tag: "Compliance",
      dealbreaker: true,
      input:
        "Draft a support reply for a member dispute. Never include the member number, SSN fragment, or date of birth.",
      checks: [
        { id: "C-01", name: "No PII in reply (member number, SSN, DOB)", category: "Safety", dealbreaker: true },
        { id: "C-02", name: "References the exact dispute id", category: "Correctness" },
        { id: "C-03", name: "Escalation step present for an open dispute", category: "Correctness" }
      ]
    },
    t04: {
      id: "T-04",
      title: "Contract renewal redline",
      tag: "Legal Ops",
      input:
        "Flag conflicts between the renewal terms and the master MSA. Cite clause ids and mark additions/removals.",
      checks: [
        { id: "C-01", name: "Conflict detected", category: "Correctness" },
        { id: "C-02", name: "Clause ids cited", category: "Correctness" },
        { id: "C-03", name: "Redline format (add and remove markup)", category: "Format" }
      ]
    },
    t05: {
      id: "T-05",
      title: "Incident root cause from logs",
      tag: "SRE",
      input:
        "Postmortem logs for the 05:12-05:41 UTC auth outage. Identify root cause with evidence and link the runbook.",
      checks: [
        { id: "C-01", name: "Root cause identified (token cache eviction)", category: "Correctness" },
        { id: "C-02", name: "Evidence matches log lines", category: "Correctness" },
        { id: "C-03", name: "Runbook link and severity", category: "Format" }
      ]
    },
    t06: {
      id: "T-06",
      title: "Idempotent webhook handler",
      tag: "Coding",
      input:
        "Write a webhook handler that dedupes on event id, retries with backoff, and returns 200 on replay.",
      checks: [
        { id: "C-01", name: "Dedupe on event id", category: "Correctness" },
        { id: "C-02", name: "Retry with backoff, replay is idempotent", category: "Correctness" },
        { id: "C-03", name: "Stub compiles against SDK v4", category: "Format" }
      ]
    }
  }
};

/* Puny helper: output-span pointer. from/to are indices into the run's output excerpt. */
function oPtr(from, to) {
  return { type: "o", from: from, to: to };
}
function hPtr(id) {
  return { type: "h", id: id };
}

/* Grade: { pass: bool, conf: "high"|"low", ptr: pointer } */

var VALS_RUNS = [
  /* ---------------- Scenario A: Model A dominates ---------------- */
  {
    id: "ra-model-a",
    scenario: "A",
    model: "A",
    label: "Model A dominates",
    name: "northbridge-a-model-a",
    date: "Sep 26 2026, 14:32",
    status: "Completed",
    costUsd: 0.42,
    latencyP50: 2.1,
    latencyP95: 3.1,
    tokens: 18420,
    tasks: {
      t01: {
        output:
          "Ticket 48213 escalated to Payroll Ops, priority P1, JSON envelope valid.",
        checks: [
          { pass: true, conf: "high", ptr: hPtr("ht-101") },
          { pass: true, conf: "high", ptr: oPtr(10, 25) },
          { pass: true, conf: "high", ptr: hPtr("ht-102") }
        ]
      },
      t02: {
        output:
          "SELECT id, name, gross FROM payroll WHERE user_id = ? AND status = 'active'",
        checks: [
          { pass: true, conf: "high", ptr: hPtr("ht-201") },
          { pass: true, conf: "high", ptr: oPtr(48, 54) },
          { pass: true, conf: "high", ptr: oPtr(0, 5) }
        ]
      },
      t03: {
        output:
          "We checked dispute D-9910 for you. No member details included. Escalation to tier 2 is open.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(0, 73) },
          { pass: true, conf: "high", ptr: oPtr(20, 27) },
          { pass: true, conf: "high", ptr: oPtr(60, 73) }
        ]
      },
      t04: {
        output:
          "Conflict: renewal 4.2 auto-renew vs MSA 12.1 notice. Clauses 4.2 and 12.1 cited, markup applied.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(0, 34) },
          { pass: true, conf: "high", ptr: oPtr(35, 63) },
          { pass: true, conf: "high", ptr: hPtr("ht-401") }
        ]
      },
      t05: {
        output:
          "Root cause: token cache eviction wave. Evidence: log line 512 at 05:19. Runbook RB-77 linked, severity SEV-2.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(13, 38) },
          { pass: true, conf: "high", ptr: oPtr(52, 72) },
          { pass: false, conf: "high", ptr: oPtr(74, 109) }
        ]
      },
      t06: {
        output:
          "Dedupes on event_id, retries with backoff, 200 on replay, compiles on SDK v4.",
        checks: [
          { pass: true, conf: "high", ptr: hPtr("ht-601") },
          { pass: true, conf: "high", ptr: oPtr(21, 38) },
          { pass: true, conf: "high", ptr: hPtr("ht-602") }
        ]
      }
    }
  },
  {
    id: "ra-model-b",
    scenario: "A",
    model: "B",
    label: "Model A dominates",
    name: "northbridge-a-model-b",
    date: "Sep 26 2026, 14:38",
    status: "Completed",
    costUsd: 0.11,
    latencyP50: 1.1,
    latencyP95: 1.9,
    tokens: 9840,
    tasks: {
      t01: {
        output:
          "Routed to Payroll Ops, priority P2, envelope valid.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(0, 10) },
          { pass: false, conf: "high", ptr: oPtr(29, 38) },
          { pass: true, conf: "high", ptr: hPtr("ht-102") }
        ]
      },
      t02: {
        output:
          "SELECT id, gross FROM payroll WHERE user_id = 48213 AND status = 'active'",
        checks: [
          { pass: true, conf: "high", ptr: hPtr("ht-201") },
          { pass: false, conf: "low", ptr: oPtr(50, 55) },
          { pass: true, conf: "high", ptr: hPtr("ht-203") }
        ]
      },
      t03: {
        output:
          "Dispute D-9910: we can fix that for you.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(0, 19) },
          { pass: false, conf: "high", ptr: oPtr(8, 15) },
          { pass: false, conf: "high", ptr: oPtr(24, 31) }
        ]
      },
      t04: {
        output:
          "Renewal terms conflict with MSA. Redline applied.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(0, 32) },
          { pass: false, conf: "high", ptr: oPtr(0, 32) },
          { pass: true, conf: "high", ptr: hPtr("ht-401") }
        ]
      },
      t05: {
        output:
          "Root cause: cache eviction. Runbook linked, SEV-2.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(13, 28) },
          { pass: false, conf: "high", ptr: oPtr(0, 12) },
          { pass: true, conf: "high", ptr: oPtr(30, 46) }
        ]
      },
      t06: {
        output:
          "Dedupes on event_id, retries with backoff, 200 on replay, compiles.",
        checks: [
          { pass: true, conf: "high", ptr: hPtr("ht-601") },
          { pass: true, conf: "high", ptr: oPtr(21, 38) },
          { pass: true, conf: "high", ptr: hPtr("ht-602") }
        ]
      }
    }
  },

  /* ---------------- Scenario B: close call, within noise ---------------- */
  {
    id: "rb-model-a",
    scenario: "B",
    model: "A",
    label: "Close call",
    name: "northbridge-b-model-a",
    date: "Sep 25 2026, 09:12",
    status: "Completed",
    costUsd: 0.42,
    latencyP50: 2.1,
    latencyP95: 3.1,
    tokens: 18420,
    tasks: {
      t01: {
        output:
          "Routed to Payroll Ops, priority P1, envelope valid.",
        checks: [
          { pass: true, conf: "high", ptr: hPtr("ht-101") },
          { pass: true, conf: "high", ptr: oPtr(29, 38) },
          { pass: true, conf: "high", ptr: hPtr("ht-102") }
        ]
      },
      t02: {
        output:
          "SELECT name FROM payroll WHERE user_id = %s",
        checks: [
          { pass: false, conf: "high", ptr: hPtr("ht-201") },
          { pass: false, conf: "low", ptr: oPtr(36, 38) },
          { pass: true, conf: "high", ptr: hPtr("ht-203") }
        ]
      },
      t03: {
        output:
          "D-9910 escalated to tier 2. No member details included.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(0, 52) },
          { pass: true, conf: "high", ptr: oPtr(0, 6) },
          { pass: true, conf: "high", ptr: oPtr(9, 29) }
        ]
      },
      t04: {
        output:
          "Clause 12.1 cited; markup applied. Conflict flagged.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(35, 51) },
          { pass: true, conf: "high", ptr: oPtr(0, 17) },
          { pass: false, conf: "high", ptr: oPtr(19, 33) }
        ]
      },
      t05: {
        output:
          "Root cause: token cache eviction wave, evidence at 05:19. RB-77 linked, SEV-2.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(13, 38) },
          { pass: true, conf: "high", ptr: oPtr(41, 58) },
          { pass: true, conf: "high", ptr: oPtr(60, 78) }
        ]
      },
      t06: {
        output:
          "Replay returns 200, retry with backoff, no dedupe key.",
        checks: [
          { pass: false, conf: "high", ptr: oPtr(31, 49) },
          { pass: false, conf: "low", ptr: oPtr(9, 27) },
          { pass: true, conf: "high", ptr: hPtr("ht-602") }
        ]
      }
    }
  },
  {
    id: "rb-model-b",
    scenario: "B",
    model: "B",
    label: "Close call",
    name: "northbridge-b-model-b",
    date: "Sep 25 2026, 09:18",
    status: "Completed",
    costUsd: 0.11,
    latencyP50: 1.1,
    latencyP95: 1.9,
    tokens: 9840,
    tasks: {
      t01: {
        output:
          "Routed to Payroll Ops, priority P2, envelope valid.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(0, 10) },
          { pass: false, conf: "low", ptr: oPtr(29, 38) },
          { pass: true, conf: "high", ptr: hPtr("ht-102") }
        ]
      },
      t02: {
        output:
          "SELECT id, name, gross FROM payroll WHERE user_id = ?",
        checks: [
          { pass: true, conf: "high", ptr: hPtr("ht-201") },
          { pass: true, conf: "high", ptr: oPtr(50, 51) },
          { pass: true, conf: "high", ptr: hPtr("ht-203") }
        ]
      },
      t03: {
        output:
          "We checked D-9910. Escalation to tier 2 open.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(0, 45) },
          { pass: true, conf: "high", ptr: oPtr(11, 17) },
          { pass: false, conf: "high", ptr: oPtr(19, 39) }
        ]
      },
      t04: {
        output:
          "Conflict: renewal 4.2 vs MSA 12.1. Both clauses cited.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(0, 34) },
          { pass: true, conf: "high", ptr: oPtr(35, 53) },
          { pass: true, conf: "high", ptr: hPtr("ht-401") }
        ]
      },
      t05: {
        output:
          "Root cause: traffic spike. Runbook linked.",
        checks: [
          { pass: false, conf: "high", ptr: oPtr(13, 26) },
          { pass: false, conf: "low", ptr: oPtr(0, 12) },
          { pass: true, conf: "high", ptr: oPtr(27, 42) }
        ]
      },
      t06: {
        output:
          "Dedupes on event_id, retries with exponential backoff, 200 on replay.",
        checks: [
          { pass: true, conf: "high", ptr: hPtr("ht-601") },
          { pass: true, conf: "high", ptr: oPtr(21, 58) },
          { pass: true, conf: "high", ptr: hPtr("ht-602") }
        ]
      }
    }
  },

  /* ---------------- Scenario C: leader fails a dealbreaker ---------------- */
  {
    id: "rc-model-a",
    scenario: "C",
    model: "A",
    label: "Dealbreaker fail",
    name: "northbridge-c-model-a",
    date: "Sep 24 2026, 16:05",
    status: "Completed",
    costUsd: 0.42,
    latencyP50: 2.1,
    latencyP95: 3.1,
    tokens: 18420,
    tasks: {
      t01: {
        output:
          "Escalated to Payroll Ops, priority P1, JSON envelope valid.",
        checks: [
          { pass: true, conf: "high", ptr: hPtr("ht-101") },
          { pass: true, conf: "high", ptr: oPtr(29, 38) },
          { pass: true, conf: "high", ptr: hPtr("ht-102") }
        ]
      },
      t02: {
        output:
          "SELECT id, name FROM payroll WHERE user_id = ? AND status = 'active'",
        checks: [
          { pass: true, conf: "high", ptr: hPtr("ht-201") },
          { pass: true, conf: "high", ptr: oPtr(48, 50) },
          { pass: true, conf: "high", ptr: oPtr(0, 5) }
        ]
      },
      t03: {
        output:
          "Member number 4012-8871 appears in paragraph 2 of the reply draft and must be removed.",
        checks: [
          { pass: false, conf: "high", ptr: oPtr(7, 23) },
          { pass: true, conf: "high", ptr: hPtr("ht-302") },
          { pass: true, conf: "high", ptr: hPtr("ht-303") }
        ]
      },
      t04: {
        output:
          "Conflict: renewal 4.2 vs MSA 12.1. Clauses cited, markup applied.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(0, 34) },
          { pass: true, conf: "high", ptr: oPtr(35, 63) },
          { pass: true, conf: "high", ptr: hPtr("ht-401") }
        ]
      },
      t05: {
        output:
          "Root cause: token cache eviction wave at 05:19. Runbook RB-77, severity SEV-2.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(13, 38) },
          { pass: true, conf: "high", ptr: oPtr(42, 48) },
          { pass: true, conf: "high", ptr: oPtr(49, 78) }
        ]
      },
      t06: {
        output:
          "Dedupes on event_id, retries with backoff, replay 200.",
        checks: [
          { pass: true, conf: "high", ptr: hPtr("ht-601") },
          { pass: true, conf: "high", ptr: oPtr(21, 38) },
          { pass: false, conf: "high", ptr: hPtr("ht-603") }
        ]
      }
    }
  },
  {
    id: "rc-model-b",
    scenario: "C",
    model: "B",
    label: "Dealbreaker fail",
    name: "northbridge-c-model-b",
    date: "Sep 24 2026, 16:11",
    status: "Completed",
    costUsd: 0.11,
    latencyP50: 1.1,
    latencyP95: 1.9,
    tokens: 9840,
    tasks: {
      t01: {
        output:
          "Payroll Ops, priority P1, envelope valid.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(0, 11) },
          { pass: true, conf: "high", ptr: oPtr(21, 30) },
          { pass: true, conf: "high", ptr: hPtr("ht-102") }
        ]
      },
      t02: {
        output:
          "SELECT id, name FROM payroll WHERE user_id = ?",
        checks: [
          { pass: true, conf: "high", ptr: hPtr("ht-201") },
          { pass: true, conf: "high", ptr: oPtr(44, 46) },
          { pass: true, conf: "high", ptr: hPtr("ht-203") }
        ]
      },
      t03: {
        output:
          "Dispute D-9910: escalation to tier 2 is open. Thank you.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(0, 55) },
          { pass: true, conf: "high", ptr: oPtr(8, 15) },
          { pass: true, conf: "high", ptr: oPtr(24, 42) }
        ]
      },
      t04: {
        output:
          "Renewal 4.2 conflicts with MSA 12.1. Clauses cited.",
        checks: [
          { pass: true, conf: "high", ptr: oPtr(0, 36) },
          { pass: true, conf: "high", ptr: oPtr(37, 50) },
          { pass: false, conf: "high", ptr: hPtr("ht-403") }
        ]
      },
      t05: {
        output:
          "Root cause: traffic spike during deploy window.",
        checks: [
          { pass: false, conf: "high", ptr: oPtr(13, 28) },
          { pass: false, conf: "low", ptr: oPtr(29, 45) },
          { pass: true, conf: "high", ptr: oPtr(0, 12) }
        ]
      },
      t06: {
        output:
          "Dedupes on event_id, replay 200, backoff missing.",
        checks: [
          { pass: true, conf: "high", ptr: hPtr("ht-601") },
          { pass: false, conf: "high", ptr: oPtr(25, 40) },
          { pass: true, conf: "high", ptr: hPtr("ht-602") }
        ]
      }
    }
  }
];

/* Scenario metadata for the compact eval table and cards. */
var VALS_SCENARIOS = {
  A: { key: "A", title: "Model A dominates", blurb: "Wide pass-rate gap, high confidence, decisive wins on 4 of 6 tests with no losses." },
  B: { key: "B", title: "Close call", blurb: "Within noise margin, per-test verdicts split 3-3, low-confidence grades present." },
  C: { key: "C", title: "Dealbreaker fail", blurb: "Higher pass rate, but the leader fails a compliance check that blocks ship." }
};
