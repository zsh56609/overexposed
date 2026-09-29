# Tuning log — Step 7 (2026-09-29)

The single tuning pass after Steps 0–6. One variable per sim run. Every run is
`npm run sim -- --runs=1000` (seed 20260929, 1000 runs × 5 personas = 5000 runs).
Priority when bands conflict: soft-locks → ending distribution → scandal median → gate pass rates → card play rate.

Columns: pooled ending shares (meltdown / star / craftsman / nobody, %) · pooled median scandals held at run end ·
gates outside the 40–80% pass band · lowest card play rate (played ÷ drawn) · §5 bands passing, crashes included.
Soft-locks and crashes were 0 in every run.

| # | change | endings m / s / c / n % | scandal median | gates out | lowest play rate | bands | what moved |
|---|---|---|---|---|---|---|---|
| 0 | none: state at the end of Step 6 | 16.9 / 33.8 / 17.2 / 32.1 | 1 | 4 | apology_tour 7.3% | 5/7 | Failing: scandal median; gates audition 84.6, showcase 92.6, label_deal 91.0, arena_tour 85.8. |
| 1 | `heatThreshold` [10, 9, 8] → [8, 7, 6] | 21.1 / 29.1 / 18.2 / 31.6 | 1 | 4 | apology_tour 9.0% | 5/7 | Crystallised per run rose (minmaxer 2.2 → 2.6, hypechaser 6.6 → 8.4), but minmaxer and dealseeker still held ~1.2: they buy scandals off with crisis_pr (1.5 plays per run). |
| 2 | crisis_pr price 4 → 6 capital (`requires` and cost) | 22.1 / 27.3 / 17.5 / 33.0 | 1 | 5 | apology_tour 9.3% | 5/7 | Held rose (minmaxer mean 1.2 → 1.7, dealseeker 1.3 → 1.9); median still 1. award_show fell below 40% (38.9): its scandal ceiling of 2 started to bite. |
| 3 | `heatThreshold` [8, 7, 6] → [7, 6, 5] | 23.3 / 23.3 / 19.0 / 34.5 | 2 | 5 | apology_tour 10.1% | 6/7 | Scandal median reaches 2. Endings stay in band; star down to 23.3. |
| 4 | gate_a1_showcase hype 20 → 26 | 23.3 / 23.7 / 18.3 / 34.7 | 2 | 5 | apology_tour 10.5% | 6/7 | showcase 92.1 → 80.6 (met 58.0 → 37.3). Players moved to audition, which rose 84.9 → 88.0. |
| 5 | gate_a1_audition craft 18 → 24 | 23.4 / 22.7 / 17.5 / 36.4 | 2 | 3 | apology_tour 10.7% | 6/7 | Both act-1 gates in band: audition 74.7, showcase 73.5. |
| 6 | gate_a2_label_deal hype 40 → 46 | 23.6 / 19.0 / 19.7 / 37.8 | 2 | 3 | apology_tour 10.7% | 6/7 | label_deal 85.7 → 81.8. Fewer signings: star 22.7 → 19.0. arena_tour 81.8 → 80.1. |
| 7 | gate_a3_arena_tour hype 60 → 64 | 23.6 / 18.4 / 20.1 / 37.9 | 2 | 2 | apology_tour 10.7% | 6/7 | arena_tour 80.1 → 79.7, in band. |
| 8 | gate_a3_award_show scandal ceiling 2 → 3 | 23.6 / 18.4 / 20.1 / 37.9 | 2 | 1 | apology_tour 10.7% | 6/7 | award_show 39.1 → 44.2, in band. Endings unchanged: its passers already had craft 55. |
| 9 | gate_a2_label_deal hype 46 → 50 | 23.8 / 14.3 / 22.7 / 39.2 | 2 | 0 | apology_tour 10.4% | 7/7 | label_deal 81.8 → 78.6. All bands pass. Star 18.4 → 14.3, now the ending closest to its band edge. |

## Robustness check (no change, other batch seeds)

| seed | endings m / s / c / n % | scandal median | gates out | bands | note |
|---|---|---|---|---|---|
| 1 | 23.9 / 14.2 / 23.8 / 38.1 | 2 | 0 | 7/7 | label_deal 79.9%, 0.1 under the ceiling |
| 424242 | 23.5 / 14.7 / 23.0 / 38.9 | 2 | 0 | 7/7 | label_deal 78.6% |

## Values changed in this pass

- `content/rules.json` — `heatThreshold` [10, 9, 8] → [7, 6, 5]
- `content/cards.json` — crisis_pr: requires capital 4 → 6, pays 4 → 6 (en.json text updated)
- `content/gates.json` — a1_audition craft 18 → 24 · a1_showcase hype 20 → 26 · a2_label_deal hype 40 → 50 · a3_arena_tour hype 60 → 64 · a3_award_show scandal ceiling 2 → 3

## Fragile edges

- label_deal pass rate 78.6% (79.9% on seed 1): 1.4 points under the 80% ceiling.
- star 14.3%: 4.3 points above the 10% floor.
- nobody 39.2%: 5.8 points under the 45% ceiling.
