## What it does

`security-audit` hunts a codebase for vulnerabilities that cross a real trust boundary, has every candidate independently re-checked, and writes a report with a source trace, a safe reproduction, a priority and the smallest source fix for each one that survives.

It never fixes anything and never plans the fixes. A candidate only becomes a finding when a fresh [subagent](../references/subagent.md) that did not hunt it tries to disprove it and fails, and a fact that lives outside the source (a proxy setting, an identity policy) stays an unresolved lead instead of a guess. The audit ends with a brief that [to-tickets](./to-tickets.md) and [to-spec](./to-spec.md) can take, and you start them yourself.

## When to reach for it

You invoke this by typing `/security-audit`, and the agent won't reach for it on its own.

Reach for it when you want a security review of code you own: a codebase, API, service, CLI, library or daemon. Run it in one of two modes, set by how you ask:

| You ask for | It runs |
| --- | --- |
| A security question, a focused review of one area, or a look at a specific suspected bug | Guidance mode: only the relevant parts, no output directory, no files |
| An audit, a pen test, a full or end-to-end review, or report artifacts | The full six-phase audit, and it writes the files below |

When a request could be either, it asks one question before creating anything. For a bug that is already misbehaving, use [diagnosing-bugs](./diagnosing-bugs.md) instead.

## Prerequisites

- **Node on your `PATH`.** The two validators that check the findings and the coverage claim are Node scripts. The skill checks `node --version` and stops if it is missing; it never installs anything.
- **A sandbox for target code.** It only builds or runs target code inside an OS-enforced sandbox (no network, empty environment, read-only target, resource limits). Where it cannot enforce every control, it reads source and reports what needed running as a lead.
- **A workspace outside your repo.** Output goes to `~/security-audit-skill/<repo>/run-<N>`, never into the target, unless you pick a directory inside it that version control ignores.
- **Fix planning needs the tracker set up.** The later [to-tickets](./to-tickets.md) step reads the tracker that [setup-joao-david-silva-skills](./setup-joao-david-silva-skills.md) configured.

## Three verdicts, never blurred

Every record in `findings.json` ends in exactly one verdict, and only the first carries a severity.

| Verdict | Means | Carries |
| --- | --- | --- |
| `confirmed` | A complete source trace and a bounded observed result | Severity, remediation, confidence |
| `needs_validation` | A specific hypothesis blocked on one unresolved fact | The exact blocker and a safe plan to resolve it |
| `rejected` | A candidate that verification disproved | The reason, kept so a later run does not repeat it |

The audit is **coverage-led**: reconnaissance seeds a ledger of units (surface by boundary by attack class), hunters are assigned from it, and critics look for the gaps. Runs on the same repo are additive and reuse prior ledgers, but a prior result never counts as covered when the source changed.

| Profile | Use it for |
| --- | --- |
| `quick` | A small target or a fast first look: one hunter wave, one critic pass, always reported as partial |
| `standard` | The default |
| `deep` | High stakes or a large target: units split per subsystem, critics run to a clean pass |

Profiles change breadth, never the evidence bar.

## It's working if

- It stops to ask which mode you meant instead of creating files on a vague question.
- The report lists confirmed findings with a severity and `needs_validation` leads without one, and the two never share a table.
- A `quick`, scoped or budget-limited run says plainly that it is a partial pass.
- Nothing is written inside your repo, and no target code ran outside the sandbox.
- The closing message gives you the path to `REMEDIATION.md` and asks whether your tracker is private.

## Where it fits

A security **on-ramp** that merges onto the main flow: `security-audit → to-spec → to-tickets → implement → code-review`. The audit finds and verifies. You then choose the next step: run [to-tickets](./to-tickets.md) with `REMEDIATION.md` as its argument, or [to-spec](./to-spec.md) first when the fixes need design decisions. `REMEDIATION.md` names findings by fingerprint and carries no payloads or paths, so a [ticket](../references/ticket.md) never copies exploit detail. Check the tracker is private before publishing, because the brief describes unfixed vulnerabilities.

After the fixes land, a scoped re-run over the diff revalidates them through the fingerprints the tickets carry. Build the fixes with [implement](./implement.md).

When you are unsure which skill fits your situation across the whole set, **[ask-joao](./ask-joao.md)** routes you.
