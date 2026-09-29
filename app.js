/* Vals Smith evidence packet prototype - application logic.
 * Computes Pass Rate / Success Rate / Low Confidence from fixture rows,
 * runs the ship vs escalate gate, and renders the packet, results table,
 * and Human Review queue. Rubric: every graded row must carry a citation
 * pointer (output span or hidden test); the validator fails the app if not.
 */

(function () {
  "use strict";

  var NOISE_PTS = 6.0; // pass-rate margin: below this, differences are not a pick
  var CHECK_ICON_OK = '<svg viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1.5 5.2 4 7.6 8.5 2.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var CHECK_ICON_NO = '<svg viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  var ARROW = '<span class="arrow" aria-hidden="true">&#8599;</span>';

  var state = {
    scenario: "A",
    selectedRuns: []
  };

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function pct1(x) { return (Math.round(x * 10) / 10).toFixed(1) + "%"; }

  function runsFor(scenario) {
    return VALS_RUNS.filter(function (r) { return r.scenario === scenario; });
  }

  function modelName(run) {
    return "Model " + run.model;
  }

  function modelClass(run) {
    return run.model === "A" ? "Pro-class" : "Flash-class";
  }

  /* ---------- per-run statistics ---------- */

  function runStats(run) {
    var pass = 0, total = 0, successTasks = 0, lowConfTasks = 0;
    var byCategory = {};
    var taskStats = {};
    var keys = Object.keys(VALS_SUITE.tasks);
    keys.forEach(function (tid) {
      var checks = run.tasks[tid].checks;
      var tp = 0, tl = 0;
      checks.forEach(function (c) {
        total++;
        if (c.pass) pass++;
        if (c.pass) tp++;
        if (c.conf === "low") tl++;
        var cat = VALS_SUITE.tasks[tid].checks[checks.indexOf(c)].category;
        byCategory[cat] = byCategory[cat] || { pass: 0, total: 0 };
        if (c.pass) byCategory[cat].pass++;
        byCategory[cat].total++;
      });
      if (tp === checks.length) successTasks++;
      if (tl > 0) lowConfTasks++;
      taskStats[tid] = { passed: tp, total: checks.length, lowConf: tl };
    });
    var cats = Object.keys(byCategory).map(function (name) {
      return { name: name, rate: 100 * byCategory[name].pass / byCategory[name].total };
    });
    return {
      passRate: 100 * pass / total,
      successRate: 100 * successTasks / keys.length,
      lowConfRate: 100 * lowConfTasks / keys.length,
      taskStats: taskStats,
      categories: cats
    };
  }

  /* ---------- pair analysis + gate ---------- */

  function analyze(aRun, bRun) {
    var a = runStats(aRun), b = runStats(bRun);
    var delta = a.passRate - b.passRate;
    var withinNoise = Math.abs(delta) <= NOISE_PTS;

    var verdicts = {}, aWins = 0, bWins = 0, ties = 0;
    var keys = Object.keys(VALS_SUITE.tasks);
    keys.forEach(function (tid) {
      var as = a.taskStats[tid], bs = b.taskStats[tid];
      if (as.passed > bs.passed) { verdicts[tid] = "A"; aWins++; }
      else if (bs.passed > as.passed) { verdicts[tid] = "B"; bWins++; }
      else { verdicts[tid] = "tie"; ties++; }
    });

    var winner = null;
    if (!withinNoise) winner = delta > 0 ? "A" : "B";

    function deals(run) {
      var failed = [];
      keys.forEach(function (tid) {
        var def = VALS_SUITE.tasks[tid];
        if (!def.dealbreaker) return;
        def.checks.forEach(function (cd, i) {
          if (cd.dealbreaker && !run.tasks[tid].checks[i].pass) {
            failed.push({ tid: tid, check: cd, grade: run.tasks[tid].checks[i] });
          }
        });
      });
      return failed;
    }

    function lowConfFails(run) {
      var out = [];
      keys.forEach(function (tid) {
        VALS_SUITE.tasks[tid].checks.forEach(function (cd, i) {
          var g = run.tasks[tid].checks[i];
          if (!g.pass && g.conf === "low") out.push({ tid: tid, check: cd });
        });
      });
      return out;
    }

    var reasons = [];
    var winnerRun = winner === "A" ? aRun : winner === "B" ? bRun : null;
    var dealbreakerFails = winnerRun ? deals(winnerRun) : [];
    var lowConfFailsW = winnerRun ? lowConfFails(winnerRun) : [];
    var anyLowConf = lowConfFails(aRun).concat(lowConfFails(bRun)).length > 0;

    var escalate = false;
    if (withinNoise) {
      escalate = true;
      reasons.push(
        "Pass Rate difference is " + Math.abs(delta).toFixed(1) + " pts (A " + pct1(a.passRate) +
        " vs B " + pct1(b.passRate) + "), inside the ±" + NOISE_PTS.toFixed(1) +
        " pt noise margin for " + (aRun.tasks.t01.checks.length * 6) + " checks. Not a reliable pick."
      );
    }
    if (dealbreakerFails.length > 0) {
      escalate = true;
      var d = dealbreakerFails[0];
      reasons.push(
        "Leader " + modelName(winnerRun) + " fails dealbreaker check " + d.tid + " · " + d.check.id +
        " (" + d.check.name + "), cited below. Ship blocked on this model."
      );
    }
    if (lowConfFailsW.length > 0) {
      escalate = true;
      reasons.push(
        lowConfFailsW.length + " low-confidence failed grade(s) on recommended model " + modelName(winnerRun) +
        ": " + lowConfFailsW.map(function (f) { return f.tid + " · " + f.check.id; }).join(", ") + "."
      );
    }
    if (ties + bWins >= aWins && aWins === bWins && !withinNoise) {
      // not reached when withinNoise; kept for pairs outside the presets
    }
    if (!withinNoise && (aWins + bWins) > 0 && Math.max(aWins, bWins) <= ties + Math.min(aWins, bWins) - 1) {
      escalate = true;
      reasons.push(
        "Per-task verdicts are split (A wins " + aWins + ", B wins " + bWins + ", ties " + ties +
        "). No task-level majority for the pick."
      );
    }

    // recommendation
    var recommended = null, recKind = "ship", recFallback = false;
    if (withinNoise) {
      recKind = "escalate";
    } else {
      recommended = winnerRun;
      if (dealbreakerFails.length > 0) {
        recKind = "block";
        recFallback = true;
        recommended = winner === "A" ? bRun : aRun;
      } else if (escalate) {
        recKind = "escalate";
      }
    }

    var gate = escalate ? (dealbreakerFails.length > 0 ? "block" : "escalate") : "ship";

    // evidence-friendly summary lines for the recommendation card
    var why = [];
    if (gate === "ship") {
      why.push(
        modelName(winnerRun) + " wins head-to-head: Pass Rate " + pct1(a.passRate) + " vs " +
        pct1(b.passRate) + " (" + Math.abs(delta).toFixed(1) + " pts outside noise)."
      );
      why.push("Task record " + aWins + " wins, " + bWins + " losses, " + ties + " ties, with per-task cited grades below.");
      why.push("No dealbreaker failures and no low-confidence failed grades on " + modelName(winnerRun) + ".");
    } else if (gate === "escalate") {
      why.push("No statistically reliable winner: pass rates within ±" + NOISE_PTS.toFixed(1) + " pts noise.");
      why.push("Per-task verdicts split " + aWins + "-" + bWins + " with " + ties + " ties; conflicting grades are cited below.");
      if (anyLowConf) why.push("Low Confidence grades present on both runs; Human Review owns the decision.");
    } else {
      why.push(modelName(winnerRun) + " has the higher Pass Rate (" + pct1(a.passRate) + " vs " + pct1(b.passRate) + ").");
      why.push("It fails dealbreaker " + dealbreakerFails[0].tid + " · " + dealbreakerFails[0].check.id + " (" + dealbreakerFails[0].check.name + "). Blocked.");
      why.push("Fallback pick: " + modelName(recommended) + ". Escalated to Human Review.");
    }

    return {
      aRun: aRun, bRun: bRun,
      a: a, b: b,
      delta: delta,
      withinNoise: withinNoise,
      verdicts: verdicts,
      aWins: aWins, bWins: bWins, ties: ties,
      winner: winner,
      winnerRun: winnerRun,
      recommended: recommended,
      recKind: recKind,
      recFallback: recFallback,
      gate: gate,
      escalate: escalate,
      reasons: reasons,
      dealbreakerFails: dealbreakerFails,
      lowConfFailsW: lowConfFailsW,
      why: why
    };
  }

  /* ---------- rubric validator ---------- */

  function validateFixtures() {
    var violations = [];
    var graded = 0;
    VALS_RUNS.forEach(function (run) {
      Object.keys(VALS_SUITE.tasks).forEach(function (tid) {
        var t = run.tasks[tid];
        VALS_SUITE.tasks[tid].checks.forEach(function (cd, i) {
          var g = t.checks[i];
          graded++;
          if (!g || g.ptr === undefined || g.ptr === null) {
            violations.push(run.id + " " + tid + " " + cd.id + ": grade has no citation pointer");
            return;
          }
          if (g.ptr.type === "o") {
            if (typeof g.ptr.from !== "number" || typeof g.ptr.to !== "number" ||
                g.ptr.from < 0 || g.ptr.to <= g.ptr.from || g.ptr.to > t.output.length) {
              violations.push(run.id + " " + tid + " " + cd.id + ": output span out of bounds");
            }
          } else if (g.ptr.type !== "h" || !g.ptr.id) {
            violations.push(run.id + " " + tid + " " + cd.id + ": malformed pointer");
          }
          if (g.conf !== "high" && g.conf !== "low") {
            violations.push(run.id + " " + tid + " " + cd.id + ": confidence must be high or low");
          }
          if (typeof g.pass !== "boolean") {
            violations.push(run.id + " " + tid + " " + cd.id + ": pass must be boolean");
          }
        });
      });
    });
    return { violations: violations, graded: graded };
  }

  /* ---------- rendering: pointer + annotated output ---------- */

  function pointerText(tid, cd, g) {
    if (g.ptr.type === "o") {
      return tid + " · " + cd.id + " · output:" + g.ptr.from + "-" + (g.ptr.to - 1);
    }
    return tid + " · " + cd.id + " · hidden test " + g.ptr.id;
  }

  function annotate(output, marks) {
    var sorted = marks.slice().sort(function (x, y) { return x.from - y.from || x.to - y.to; });
    var html = "", pos = 0;
    sorted.forEach(function (m) {
      if (m.from > pos) html += esc(output.slice(pos, m.from));
      html += '<mark class="' + (m.pass ? "ev-ok" : "ev-bad") + '">' + esc(output.slice(m.from, m.to)) + "</mark>";
      pos = Math.max(pos, m.to);
    });
    html += esc(output.slice(pos));
    return html;
  }

  function checkLine(tid, cd, g, model) {
    var cls = g.pass ? "pass" : "fail";
    var confCls = g.conf === "high" ? "high" : "low";
    var ptr;
    if (g.ptr.type === "o") {
      ptr = '<span class="check-ptr" title="Evidence span in the run output for this grade">' +
        esc(tid + " · " + cd.id + " · output:" + g.ptr.from + "-" + (g.ptr.to - 1)) + "</span>";
    } else {
      ptr = '<span class="check-label-h" title="Hidden test outcome in the harness">hidden test ' + esc(g.ptr.id) + "</span>";
    }
    return (
      '<div class="check-line" data-cite="' + esc(pointerText(tid, cd, g)) + '">' +
      '<span class="check-status ' + cls + '" aria-label="' + (g.pass ? "Passed" : "Failed") + '">' +
      (g.pass ? CHECK_ICON_OK : CHECK_ICON_NO) + "</span>" +
      '<span class="check-name">' + esc(cd.id) + " · " + esc(cd.name) + "</span>" +
      '<span class="check-cat">' + esc(cd.category) + "</span>" +
      '<span class="check-conf ' + confCls + '">' + esc(g.conf === "high" ? "High" : "Low") + " Confidence</span>" +
      ptr +
      (cd.dealbreaker ? '<span class="check-cat" style="color:var(--red);border-color:var(--red-line);background:var(--red-wash);">dealbreaker</span>' : "") +
      "</div>"
    );
  }

  function evidencePane(run, tid, model) {
    var t = run.tasks[tid];
    var def = VALS_SUITE.tasks[tid];
    var marks = [];
    def.checks.forEach(function (cd, i) {
      var g = t.checks[i];
      if (g.ptr.type === "o") marks.push({ from: g.ptr.from, to: g.ptr.to, pass: g.pass });
    });
    var checksHtml = def.checks.map(function (cd, i) {
      return checkLine(tid, cd, t.checks[i], model);
    }).join("");
    return (
      '<div class="evidence-pane">' +
      '<h4><span class="model-chip chip-' + model.toLowerCase() + '">' + esc(modelName(run)) + "</span>" +
      esc(modelClass(run)) + ' run <span style="font-family:var(--mono);font-weight:500;">' + esc(run.id) + "</span></h4>" +
      '<p class="ev-input"><b>Input:</b> ' + esc(def.input) + "</p>" +
      '<div class="ev-output">' + annotate(t.output, marks) + "</div>" +
      '<div class="checks">' + checksHtml + "</div>" +
      "</div>"
    );
  }

  /* ---------- packet ---------- */

  function gateBanner(p) {
    var cls = p.gate === "ship" ? "gate-ship" : p.gate === "block" ? "gate-block" : "gate-escalate";
    var title = p.gate === "ship" ? "Gate: Ship" : p.gate === "block" ? "Gate: Blocked · escalate for Human Review" : "Gate: Needs Review · escalate";
    var verdict = p.gate === "ship" ? "Ship" : "Escalate";
    var icon = p.gate === "ship"
      ? CHECK_ICON_OK
      : '<svg viewBox="0 0 10 10" fill="none" aria-hidden="true" style="width:16px;height:16px;"><path d="M5 1.5v4M5 8h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    var reasons = p.reasons.map(function (r) { return "<p>" + esc(r) + "</p>"; }).join("");
    return (
      '<div class="gate ' + cls + '" role="status">' +
      '<div class="gate-icon" aria-hidden="true">' + icon + "</div>" +
      '<div class="gate-body"><h2>' + esc(title) + "</h2>" + reasons + "</div>" +
      '<span class="gate-verdict">' + esc(verdict) + "</span>" +
      "</div>"
    );
  }

  function recommendationCard(p) {
    var cls = "rec-model";
    var label, name, sub;
    if (p.gate === "ship") {
      label = "Recommended model";
      name = modelName(p.recommended);
      sub = modelClass(p.recommended) + " · " + p.recommended.id;
    } else if (p.gate === "escalate") {
      cls += " no-pick";
      label = "No reliable pick";
      name = "Escalate to Human Review";
      sub = "Difference is inside the noise margin or grades are conflicting";
    } else {
      cls += " rec-block";
      label = "Blocked · fallback pick";
      name = modelName(p.recommended);
      sub = "for " + p.recommended.id + " · leader " + modelName(p.winnerRun) + " fails dealbreaker";
    }
    var why = p.why.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("");
    return (
      '<div class="card">' +
      '<div class="card-title-row"><h2>Model pick</h2><button class="btn btn-ghost" data-export="' + p.aRun.id + ":" + p.bRun.id + '">Export packet ' + ARROW + "</button></div>" +
      '<div class="' + cls + '">' +
      '<div><div class="rec-label">' + esc(label) + "</div>" +
      '<div class="rec-name">' + esc(name) + "</div>" +
      '<div class="rec-class">' + esc(sub) + "</div></div>" +
      "</div>" +
      '<div class="rec-why"><ul>' + why + "</ul></div>" +
      "</div>"
    );
  }

  function headToHead(p) {
    function row(label, aVal, bVal, aPct, bPct, winner) {
      var max = Math.max(aPct, bPct, 1);
      var aW = 100 * aPct / max, bW = 100 * bPct / max;
      return (
        '<div class="ht-row">' +
        '<div class="ht-label"><span><b>' + esc(label) + "</b></span>" +
        '<span>' + pct1(aVal) + ' <b class="ht-winner-tag" style="color:#0e5f2c;">A</b>' +
        (winner === "A" ? '<span class="ht-winner-tag">winner</span>' : "") +
        "  ·  " + pct1(bVal) + ' <b style="color:#1d4ed8;">B</b>' +
        (winner === "B" ? '<span class="ht-winner-tag">winner</span>' : "") + "</span></div>" +
        '<div class="ht-track"><div class="ht-fill ht-a" style="width:' + aW + '%"></div></div>' +
        '<div class="ht-track" style="margin-top:3px;"><div class="ht-fill ht-b" style="width:' + bW + '%"></div></div>' +
        "</div>"
      );
    }
    var winP = p.a.passRate > p.b.passRate ? "A" : "B";
    var winS = p.a.successRate > p.b.successRate ? "A" : "B";
    var winL = p.a.lowConfRate > p.b.lowConfRate ? "A" : p.b.lowConfRate > p.a.lowConfRate ? "B" : null;
    return (
      '<div class="card">' +
      '<div class="card-title-row"><h2>Head-to-head</h2>' +
      '<span class="pill">noise margin ±' + NOISE_PTS.toFixed(1) + " pts</span></div>" +
      row("Pass Rate (checks)", p.a.passRate, p.b.passRate, p.a.passRate, p.b.passRate, winP) +
      row("Success Rate (tests)", p.a.successRate, p.b.successRate, p.a.successRate, p.b.successRate, winS) +
      row("Low Confidence (tests)", p.a.lowConfRate, p.b.lowConfRate, p.a.lowConfRate, p.b.lowConfRate, winL) +
      '<div class="ht-legend"><span><span class="dot" style="background:var(--green)"></span>Model A</span>' +
      '<span><span class="dot" style="background:#3b82f6"></span>Model B</span>' +
      '<span>Pass Rate = checks passed of all checks. Success Rate = tests with every check passed.</span></div>' +
      "</div>"
    );
  }

  function perCheckCategories(p) {
    var cats = {};
    p.a.categories.forEach(function (c) { cats[c.name] = { a: c.rate }; });
    p.b.categories.forEach(function (c) {
      cats[c.name] = cats[c.name] || {};
      cats[c.name].b = c.rate;
    });
    return Object.keys(cats).map(function (name) {
      return name + ": A " + pct1(cats[name].a) + " / B " + pct1(cats[name].b || 0);
    }).join("  ·  ");
  }

  function taskTable(p) {
    var rows = Object.keys(VALS_SUITE.tasks).map(function (tid) {
      var def = VALS_SUITE.tasks[tid];
      var as = p.a.taskStats[tid], bs = p.b.taskStats[tid];
      var verdict = p.verdicts[tid];
      var vCls = verdict === "A" ? "verdict-a" : verdict === "B" ? "verdict-b" : "verdict-tie";
      var vText = verdict === "A" ? "Model A wins" : verdict === "B" ? "Model B wins" : "Tie";
      var deal = def.dealbreaker ? ' <span class="check-cat" style="color:var(--red);border-color:var(--red-line);background:var(--red-wash);">dealbreaker</span>' : "";
      return (
        '<tr class="task-row" data-tid="' + tid + '" tabindex="0" role="button" aria-expanded="false">' +
        '<td><span class="task-name">' + esc(def.title) + "</span>" + deal +
        '<div class="task-id">' + esc(tid) + " · " + esc(def.tag) + "</div></td>" +
        '<td class="score-cell">' + as.passed + "/" + as.total + (as.passed === as.total ? "" : ' <span class="score-fail">' + (as.total - as.passed) + " fail</span>") + "</td>" +
        '<td class="score-cell">' + bs.passed + "/" + bs.total + (bs.passed === bs.total ? "" : ' <span class="score-fail">' + (bs.total - bs.passed) + " fail</span>") + "</td>" +
        '<td><span class="verdict-chip ' + vCls + '">' + esc(vText) + "</span></td>" +
        '<td style="text-align:right;"><span class="chev" aria-hidden="true">&#9656;</span></td>' +
        "</tr>" +
        '<tr class="evidence-row hidden" data-evidence="' + tid + '">' +
        '<td colspan="5"><div class="evidence-grid">' +
        evidencePane(p.aRun, tid, "A") + evidencePane(p.bRun, tid, "B") +
        "</div></td></tr>"
      );
    }).join("");
    return (
      '<div class="card">' +
      '<div class="card-title-row"><h2>Per-task breakdown</h2>' +
      '<span class="pill">' + esc(perCheckCategories(p)) + "</span></div>" +
      '<table class="task-table"><thead><tr>' +
      "<th>Test · Check groups</th><th>" + esc(modelName(p.aRun)) + "</th><th>" + esc(modelName(p.bRun)) + "</th>" +
      "<th>Verdict</th><th style=\"text-align:right;\"></th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table>" +
      '<p style="margin:10px 0 0;font-size:12px;color:var(--ink-mute);">Click a test to open cited evidence: input, output with highlighted evidence spans, and per-check grades with confidence and citation pointers.</p>' +
      "</div>"
    );
  }

  function costLatencyCard(p) {
    function row(run) {
      var chip = '<span class="model-chip ' + (run.model === "A" ? "chip-a" : "chip-b") + '" style="font-family:var(--mono);font-size:10.5px;font-weight:700;border-radius:4px;padding:1px 6px;border:1px solid;">' + esc(modelName(run)) + "</span>";
      return (
        '<div class="stat-grid" style="margin-top:6px;">' +
        '<div class="stat-item"><div class="k">' + chip + ' cost per run</div><div class="v">$' + run.costUsd.toFixed(2) + "</div></div>" +
        '<div class="stat-item"><div class="k">tokens per run</div><div class="v">' + run.tokens.toLocaleString("en-US") + "</div></div>" +
        '<div class="stat-item"><div class="k">latency p50</div><div class="v">' + run.latencyP50.toFixed(1) + "s</div></div>" +
        '<div class="stat-item"><div class="k">latency p95</div><div class="v">' + run.latencyP95.toFixed(1) + "s</div></div>" +
        "</div>"
      );
    }
    var note;
    if (p.gate === "ship") {
      note = modelName(p.recommended) + " is " + Math.round(100 * p.bRun.costUsd / p.aRun.costUsd) +
        "% of the cheaper run's cost here, but wins outside noise on quality. Pairing the packet with a credit-pack quote keeps the buyer decision on evidence.";
    } else if (p.gate === "escalate") {
      note = "Cost favors Model B (4x cheaper) but pass rates are inside noise. The recommendation to buy on cost over quality needs Human Review sign-off.";
    } else {
      note = "Model B is 4x cheaper and the only compliant pick. Renegotiate or re-run the harness before re-presenting Model A.";
    }
    return (
      '<div class="card">' +
      '<div class="card-title-row"><h2>Cost and latency snapshot</h2><span class="pill">per 6-test run</span></div>' +
      row(p.aRun) + row(p.bRun) +
      '<p class="cost-note">' + esc(note) + "</p>" +
      "</div>"
    );
  }

  function gateCriteria(p) {
    var items = [];
    items.push({
      ok: !p.withinNoise,
      text: "Winner outside noise margin (|Δ| = " + Math.abs(p.delta).toFixed(1) + " pts > ±" + NOISE_PTS.toFixed(1) + " pts)"
    });
    items.push({
      ok: p.dealbreakerFails.length === 0,
      text: p.dealbreakerFails.length === 0
        ? "No dealbreaker check failed on the recommended model"
        : "Dealbreaker check " + p.dealbreakerFails[0].tid + " · " + p.dealbreakerFails[0].check.id + " failed on the leader"
    });
    items.push({
      ok: p.lowConfFailsW.length === 0,
      text: p.lowConfFailsW.length === 0
        ? "No low-confidence failed grades on the recommended model"
        : p.lowConfFailsW.length + " low-confidence failed grade(s) on the recommended model"
    });
    items.push({
      ok: p.winner !== null && p.aWins > p.ties + p.bWins,
      text: p.winner === null
        ? "No winner to assess: pass rates inside the noise margin"
        : "Per-task verdicts decisive (A " + p.aWins + " / B " + p.bWins + " / ties " + p.ties + ")"
    });
    var html = items.map(function (it) {
      return (
        '<div class="criterion ' + (it.ok ? "ok" : "bad") + '">' +
        '<span class="cicon" aria-hidden="true">' + (it.ok ? CHECK_ICON_OK : CHECK_ICON_NO) + "</span>" +
        '<span>' + esc(it.text) + "</span></div>"
      );
    }).join("");
    return (
      '<div class="card"><div class="card-title-row"><h2>Ship or escalate gate</h2></div>' +
      '<div class="criteria">' + html + "</div>" +
      '<p style="margin:10px 0 0;font-size:11.5px;color:var(--ink-mute);">Gate is computed from the run rows, not from the scenario label.</p>' +
      "</div>"
    );
  }

  function rubricCard() {
    var res = validateFixtures();
    if (res.violations.length === 0) {
      return (
        '<div class="card"><div class="card-title-row"><h2>Rubric check</h2></div>' +
        '<div class="rubric-line rubric-ok"><span class="rbadge">Pass</span>' +
        "<span>Every one of the " + res.graded + " graded rows carries a valid citation pointer (output span or hidden test). Removing a pointer fails this check.</span></div>" +
        "</div>"
      );
    }
    return (
      '<div class="card" style="border-color:var(--red-line);"><div class="card-title-row"><h2>Rubric check</h2></div>' +
      '<div class="rubric-line rubric-bad"><span class="rbadge">Fail</span>' +
      "<span>" + res.violations.length + " grade(s) lack a valid citation pointer:</span></div>" +
      "<ul style=\"font-family:var(--mono);font-size:11px;color:var(--red);margin:8px 0 0;padding-left:16px;\">" +
      res.violations.slice(0, 6).map(function (v) { return "<li>" + esc(v) + "</li>"; }).join("") + "</ul></div>"
    );
  }

  function scenarioCards(activeScenario) {
    return ["A", "B", "C"].map(function (key) {
      var s = VALS_SCENARIOS[key];
      var runs = runsFor(key);
      var p = analyze(runs[0], runs[1]);
      var tag = key === "A" ? "SHIP" : key === "B" ? "ESCALATE" : "BLOCK + FLIP";
      var detail =
        key === "A" ? "Pass Rate +" + Math.abs(p.delta).toFixed(1) + " pts, high confidence, ships"
        : key === "B" ? "Within ±" + NOISE_PTS.toFixed(1) + " pts noise, verdicts split " + p.aWins + "-" + p.bWins + "-" + p.ties
        : "Leader fails dealbreaker T-03 · C-01, pick flips to Model B";
      return (
        '<button class="scenario-card' + (activeScenario === key ? " active" : "") + '" data-load="' + key + '">' +
        '<span class="card-tag">' + esc(tag) + " · " + esc(s.title) + "</span>" +
        "<h3>" + esc(s.blurb.split(".")[0]) + "</h3>" +
        "<p>" + esc(s.blurb) + " " + esc(detail) + "</p>" +
        "</button>"
      );
    }).join("");
  }

  function evalSummary(activeScenario) {
    function row(key) {
      var runs = runsFor(key);
      var p = analyze(runs[0], runs[1]);
      var rec = p.gate === "ship" ? modelName(p.recommended)
        : p.gate === "block" ? modelName(p.recommended) + " (fallback)"
        : "No pick";
      var escTxt = p.gate === "ship" ? "No" : "Yes";
      var pillCls = p.gate === "ship" ? "ship" : p.gate === "block" ? "block" : "escalate";
      var reason;
      if (p.gate === "ship") {
        reason = "A wins outside noise: Pass Rate " + pct1(p.a.passRate) + " vs " + pct1(p.b.passRate) + ", all cited grades High Confidence.";
      } else if (p.gate === "escalate") {
        reason = "Pass Rates inside noise (Δ " + Math.abs(p.delta).toFixed(1) + " pts), per-task verdicts split, Low Confidence grades present.";
      } else {
        reason = "Leader " + modelName(p.winnerRun) + " fails dealbreaker " + p.dealbreakerFails[0].tid + " · " + p.dealbreakerFails[0].check.id + " (" + p.dealbreakerFails[0].check.name + ").";
      }
      return (
        '<tr class="case-row' + (activeScenario === key ? " active" : "") + '" data-load="' + key + '" tabindex="0" role="button">' +
        "<td><b>" + esc(VALS_SCENARIOS[key].title) + "</b></td>" +
        "<td><span class=\"rec-pill " + pillCls + "\">" + esc(rec) + "</span></td>" +
        "<td><b>" + esc(escTxt) + "</b></td>" +
        "<td style=\"color:var(--ink-soft);\">" + esc(reason) + "</td>" +
        "</tr>"
      );
    }
    return (
      '<div class="card eval-summary">' +
      '<div class="card-title-row"><h2>Eval summary · all synthetic cases</h2>' +
      '<span class="pill">pass/fail reason cites grades; click a row to load it</span></div>' +
      "<table><thead><tr><th>Case</th><th>Recommended model</th><th>Escalate</th><th>Pass / fail reason</th></tr></thead>" +
      "<tbody>" + ["A", "B", "C"].map(row).join("") + "</tbody></table>" +
      "</div>"
    );
  }

  function renderPacket(scenario) {
    state.scenario = scenario;
    var runs = runsFor(scenario);
    var p = analyze(runs[0], runs[1]);

    document.getElementById("crumb-suite").textContent = VALS_SUITE.name + " · " + VALS_SCENARIOS[scenario].title;
    document.getElementById("gate-banner").innerHTML = gateBanner(p);
    document.getElementById("recommendation").innerHTML = recommendationCard(p);
    document.getElementById("headtohead").innerHTML = headToHead(p);
    document.getElementById("task-table").innerHTML = taskTable(p);
    document.getElementById("cost-latency").innerHTML = costLatencyCard(p);
    document.getElementById("gate-criteria").innerHTML = gateCriteria(p);
    document.getElementById("rubric-card").innerHTML = rubricCard();
    document.getElementById("eval-summary").innerHTML = evalSummary(scenario);
    document.getElementById("scenario-cards").innerHTML = scenarioCards(scenario);

    document.querySelectorAll("#scenario-cards [data-load]").forEach(function (el) {
      el.addEventListener("click", function () { renderPacket(el.dataset.load); });
    });
    document.querySelectorAll("#eval-summary [data-load]").forEach(function (el) {
      el.addEventListener("click", function () { renderPacket(el.dataset.load); });
    });
    document.querySelectorAll("#eval-summary [data-load]").forEach(function (el) {
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); renderPacket(el.dataset.load); }
      });
    });
    document.querySelectorAll(".task-row").forEach(function (row) {
      row.addEventListener("click", function () {
        var tid = row.dataset.tid;
        var ev = document.querySelector('[data-evidence="' + tid + '"]');
        var open = ev.classList.toggle("hidden");
        row.classList.toggle("open", !open);
        row.setAttribute("aria-expanded", String(!open));
      });
    });
    document.querySelectorAll('[data-export]').forEach(function (btn) {
      btn.addEventListener("click", function () { exportPacket(btn.dataset.export); });
    });
  }

  /* ---------- export packet (CSV of graded rows with citations) ---------- */

  function exportPacket(pair) {
    var ids = pair.split(":");
    var runs = VALS_RUNS.filter(function (r) { return ids.indexOf(r.id) !== -1; });
    var lines = [
      "run,test,check,category,model,grade,confidence,citation"
    ];
    runs.forEach(function (run) {
      Object.keys(VALS_SUITE.tasks).forEach(function (tid) {
        var def = VALS_SUITE.tasks[tid];
        def.checks.forEach(function (cd, i) {
          var g = run.tasks[tid].checks[i];
          var cite = g.ptr.type === "o" ? "output:" + g.ptr.from + "-" + (g.ptr.to - 1) : "hidden-test:" + g.ptr.id;
          lines.push([run.id, tid, cd.id, cd.category, "Model " + run.model, g.pass ? "pass" : "fail", g.conf, cite].join(","));
        });
      });
    });
    var blob = new Blob([lines.join("\n")], { type: "text/csv" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "vals-evidence-packet-" + runs.map(function (r) { return r.id; }).join("-") + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Packet exported as CSV with all cited grades.");
  }

  /* ---------- results table ---------- */

  function renderResults() {
    var tbody = document.getElementById("runs-tbody");
    tbody.innerHTML = VALS_RUNS.map(function (run) {
      var s = runStats(run);
      var tag = run.scenario === "C"
        ? '<span class="scenario-tag dealbreaker">dealbreaker</span>'
        : run.scenario === "B" ? '<span class="scenario-tag">close call</span>' : "";
      return (
        '<tr data-run="' + run.id + '">' +
        '<td class="col-check"><input type="checkbox" class="run-check" aria-label="Select ' + esc(run.id) + '"></td>' +
        '<td><span class="run-name">' + esc(run.name) + "</span>" +
        '<span class="run-scenario">' + esc(VALS_SCENARIOS[run.scenario].title) + tag + "</span></td>" +
        "<td>" + esc(VALS_SUITE.name) + "</td>" +
        '<td><span class="model-tag ' + run.model.toLowerCase() + '">' + esc(modelName(run)) + "</span></td>" +
        '<td class="pct-cell">' + pct1(s.passRate) + "</td>" +
        '<td class="pct-cell">' + pct1(s.successRate) + "</td>" +
        '<td class="pct-cell">' + pct1(s.lowConfRate) + "</td>" +
        '<td><span class="status-dot">Completed</span></td>' +
        "<td>" + esc(run.runBy || VALS_SUITE.runBy) + "</td>" +
        "<td>" + esc(run.date) + "</td>" +
        "<td>$" + run.costUsd.toFixed(2) + "</td>" +
        "<td>" + run.latencyP95.toFixed(1) + "s</td>" +
        "</tr>"
      );
    }).join("");

    function sync() {
      var checks = Array.prototype.slice.call(tbody.querySelectorAll(".run-check"));
      state.selectedRuns = checks.filter(function (c) { return c.checked; }).map(function (c) {
        return c.closest("tr").dataset.run;
      });
      tbody.querySelectorAll("tr").forEach(function (tr) {
        tr.classList.toggle("selected", tr.querySelector(".run-check").checked);
      });
      var btn = document.getElementById("btn-compare");
      btn.disabled = state.selectedRuns.length !== 2;
    }

    tbody.querySelectorAll(".run-check").forEach(function (c) {
      c.addEventListener("change", sync);
    });
    tbody.querySelectorAll("tr").forEach(function (tr) {
      tr.addEventListener("click", function (e) {
        if (e.target.closest(".run-check")) return;
        window.location.hash = "";
        var scenario = tr.dataset.run.slice(1, 2);
        renderPacket(scenario);
        showView("packet");
      });
    });
    document.getElementById("select-all").addEventListener("change", function (e) {
      tbody.querySelectorAll(".run-check").forEach(function (c) { c.checked = e.target.checked; });
      sync();
    });
    document.getElementById("btn-compare").addEventListener("click", function () {
      if (state.selectedRuns.length !== 2) return;
      window.location.hash = "";
      var a = state.selectedRuns[0], b = state.selectedRuns[1];
      if (VALS_RUNS.find(function (r) { return r.id === a; }).scenario !==
          VALS_RUNS.find(function (r) { return r.id === b; }).scenario) {
        showToast("Compare requires two runs from the same Test Suite evaluation.");
        return;
      }
      // open packet with the selected pair, reusing scenario chrome
      renderPacket(VALS_RUNS.find(function (r) { return r.id === a; }).scenario);
      showView("packet");
    });
    sync();
  }

  /* ---------- human review queue ---------- */

  function renderReview() {
    var queue = ["B", "C"].map(function (key) {
      var runs = runsFor(key);
      var p = analyze(runs[0], runs[1]);
      var items = [];
      if (p.gate === "escalate") {
        items.push(
          '<div class="queue-item"><span class="q-mark" aria-hidden="true">!</span>' +
          "<span>Pass Rates inside the ±" + NOISE_PTS.toFixed(1) + " pt noise margin (Δ " + Math.abs(p.delta).toFixed(1) +
          " pts). Review the conflicting per-task verdicts, then decide with the team: <code>pass rates split " +
          p.aWins + "-" + p.bWins + " with " + p.ties + " ties</code>.</span></div>"
        );
        items.push(
          '<div class="queue-item"><span class="q-mark" aria-hidden="true">?</span>' +
          "<span>Low Confidence grades: <code>" + p.lowConfFailsW.length +
          "</code> on the higher-rated run. Re-run the harness or hand-grade the cited spans before attaching a model pick to a contract.</span></div>"
        );
      } else {
        items.push(
          '<div class="queue-item"><span class="q-mark" style="color:var(--red);" aria-hidden="true">!</span>' +
          "<span>Dealbreaker check <code>" + p.dealbreakerFails[0].tid + " · " + p.dealbreakerFails[0].check.id + "</code> (" +
          esc(p.dealbreakerFails[0].check.name) + ") failed on the leader " + esc(modelName(p.winnerRun)) +
          ". Cited span: <code>" + esc(pointerText(p.dealbreakerFails[0].tid, p.dealbreakerFails[0].check, p.dealbreakerFails[0].grade)) +
          "</code>. Approve fallback " + esc(modelName(p.recommended)) + " or block the PO.</span></div>"
        );
        items.push(
          '<div class="queue-item"><span class="q-mark" style="color:var(--red);" aria-hidden="true">!</span>' +
          "<span>PII policy: member number in the reply is a hard violation. Confirm the harness rerun with a PII redaction check before re-presenting.</span></div>"
        );
      }
      return (
        '<div class="card queue-card">' +
        '<div class="queue-head"><h3>' + esc(VALS_SCENARIOS[key].title) + " · needs Human Review" +
        '<span class="rec-pill ' + (p.gate === "block" ? "block" : "escalate") + '" style="margin-left:10px;">' +
        (p.gate === "block" ? "Blocked" : "Escalated") + "</span></h3>" +
        '<button class="btn btn-ghost" data-load="' + key + '">Open packet ' + ARROW + "</button></div>" +
        '<div class="queue-items">' + items.join("") + "</div>" +
        "</div>"
      );
    }).join("");
    document.getElementById("review-queue").innerHTML = queue;
    document.querySelectorAll("#review-queue [data-load]").forEach(function (el) {
      el.addEventListener("click", function () {
        renderPacket(el.dataset.load);
        showView("packet");
      });
    });
  }

  /* ---------- chrome: tabs, toast, boot ---------- */

  function showView(name) {
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.toggle("hidden", v.dataset.viewpane !== name);
    });
    document.querySelectorAll(".tab").forEach(function (t) {
      var on = t.dataset.view === name;
      t.setAttribute("aria-selected", String(on));
    });
    if (name === "results") renderResults();
    if (name === "review") renderReview();
  }

  function showToast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () { t.classList.add("hidden"); }, 3200);
  }

  function boot() {
    document.querySelectorAll(".tab[data-view]").forEach(function (t) {
      t.addEventListener("click", function () { showView(t.dataset.view); });
    });
    document.querySelectorAll(".tab.inert").forEach(function (t) {
      t.addEventListener("click", function () { showToast(t.dataset.inert + " is outside this prototype's scope."); });
    });

    var res = validateFixtures();
    if (res.violations.length > 0) {
      document.getElementById("gate-banner").innerHTML =
        '<div class="gate gate-block"><div class="gate-icon">' + CHECK_ICON_NO + "</div>" +
        '<div class="gate-body"><h2>Rubric violation: ' + res.violations.length + " grade(s) lack a citation pointer</h2>" +
        "<p>The model pick packet cannot be trusted and refuses to render while any grade row is uncited. Fix the fixture data.</p></div></div>";
      showView("packet");
      return;
    }

    renderPacket("A");
    showView("packet");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
