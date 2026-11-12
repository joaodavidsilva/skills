# CONTEXT BUDGET

What a ticket costs a fresh agent, how to size it to one **smart zone** (~150k tokens, no compaction), and how to estimate the token cost of a whole batch. The numbers are starting points measured on one Swift codebase (about 30 coding agents over a week); re-measure on yours with [Measure](#measure).

## What fills a smart zone

Median agent in the measured run: 23k base context, passed 150k after 48 requests and **35 lines written**. The first 150k went to:

| Content | Share |
| --- | --- |
| read and search results | 45% |
| bash output (builds, tests, device runs) | 34% |
| thinking | 8% |
| code written | ~2% |

Reading and verification output spend the budget, so a light ticket removes exploration (the brief) and filters verification (the seam).

## Ticket budget

| Part | Tokens |
| --- | --- |
| Base | 23k |
| Brief | ≤5k |
| Reads the ticket points at | ≤35k (~3,000 lines) |
| Filtered verification | ≤25k |
| Thinking | ≤15k |
| Code written (~20 tokens per line, edits included) | ~30k |
| Margin | ~15k |

From that budget:

- **Size:** ≤~400 net lines, tests included. Mechanical data tickets (strings, icons, templates) may reach ~1,500.
- **Brief:** self-contained. It quotes the user-visible behaviour and the interfaces it touches, so the agent never reads the whole spec. A read-only scout can prepare it.
- **Verification:** one test seam per ticket. Commands print errors and failures only, and tests run for the feature area alone. Full-suite runs, smoke walks and device runs go in a separate integration ticket.
- **Stopping:** at ~130k the agent commits what passes and files the remainder as a new ticket.
- **Review:** a reviewer per ticket reads only the diff.

## Measure

Done when you hold, for the comparable agents (≥100 lines written), the medians of: base context, requests, tokens and lines written before the context first passes the cap, and peak context.

From the session transcripts (JSONL with per-message usage):

- **Context per request:** `input + cacheRead + cacheWrite`.
- **Lines written:** `+` lines in edit calls plus newlines in write calls.
- **What fills the context:** map each tool result to its tool through the call id, and count chars ÷ 4 per tool.
- **Tokens per ticket:** sum usage over the session tree (subagents included), then bucket by timestamp against ticket boundaries taken from commit times and the prompts that started each ticket.

## Estimate

Done when the report holds the ticket count, a range for each of the two token measures, the cost, and the stated risk.

1. **Tickets:** net lines ÷ 400 (mechanical lines ÷ 1,500).
2. **Tokens per ticket:** the measured median for comparable tickets, block by block. Without one, the baseline from the measured run: ~7M all-in (~4M implementation, ~1.5M scout brief, ~1M review, ~0.5M retries). A second data point from a frontend migration batch: ~20M processed (~0.5M new) per ticket, uncapped.
3. **Two measures:** report **total processed** (about 97% cache reads) and **new tokens** (uncached input plus output), plus the cost under the same model mix. The reader may mean either.
4. **Against uncapped:** capping lowers the total because the average context per request falls (~238k to ~85k) while output tokens stay the same. Report both.
5. **Risk:** 400 lines is ~10× what agents wrote before reaching 150k in the measured run, so the budget holds only if briefs remove the exploration. Fallback: ~150 lines per ticket, which roughly triples the ticket count and doubles the tokens.
6. **Assumptions:** same model mix and workflow (tests first, review, browser or device checks), and which tickets run above or below the baseline.
