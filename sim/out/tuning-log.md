# Tuning log

Rounds 3 and 4 follow round 2, newest last.

## Round 2 — Step 7 (2026-09-29)

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

### Robustness check (no change, other batch seeds)

| seed | endings m / s / c / n % | scandal median | gates out | bands | note |
|---|---|---|---|---|---|
| 1 | 23.9 / 14.2 / 23.8 / 38.1 | 2 | 0 | 7/7 | label_deal 79.9%, 0.1 under the ceiling |
| 424242 | 23.5 / 14.7 / 23.0 / 38.9 | 2 | 0 | 7/7 | label_deal 78.6% |

### Values changed in this pass

- `content/rules.json` — `heatThreshold` [10, 9, 8] → [7, 6, 5]
- `content/cards.json` — crisis_pr: requires capital 4 → 6, pays 4 → 6 (en.json text updated)
- `content/gates.json` — a1_audition craft 18 → 24 · a1_showcase hype 20 → 26 · a2_label_deal hype 40 → 50 · a3_arena_tour hype 60 → 64 · a3_award_show scandal ceiling 2 → 3

### Fragile edges

- label_deal pass rate 78.6% (79.9% on seed 1): 1.4 points under the 80% ceiling.
- star 14.3%: 4.3 points above the 10% floor.
- nobody 39.2%: 5.8 points under the 45% ceiling.

## Round 3 — Step 7 (2026-09-29)

Tuned against the new §5 bands: 6 personas × 1000 runs on seed 20260929, one variable per run.
Priority: soft-locks → per-persona ending concentration → scandal median → gate met% → card play rate.
Soft-locks and crashes were 0 in every run; card play rate and the minmaxer-vs-random divergence passed in every run.

Columns: personas over the 70% concentration cap · pooled median scandals held at run end · gates outside met% 35–65% ·
lowest card play rate (played ÷ drawn) · bands passing, of 7.

| # | change | personas over 70% | scandal median | gates out (met%) | lowest play rate | bands | what moved |
|---|---|---|---|---|---|---|---|
| 0 | none: end of round-3 step 6 | crafter nobody 95.4; hypechaser meltdown 99.7 | 6 | label_deal 25.9, residency 17.1, arena 23.0, award 16.1 | indie_label 7.4% | 4/7 | Starting point. |
| 1 | craftsman hype floor 25 → 12 | hypechaser 99.7 | 6 | same four | 7.4% | 4/7 | crafter nobody 95.4 → 68.2 (craftsman 4.6 → 31.8); crafter ends with hype 0/8/19 at p10/p50/p90. |
| 2 | `degradePerScandal` 1 → 0.5 | hypechaser 99.7 | 6 | label 28.6, residency 17.3, arena 25.8, award 15.9 | 8.5% | 4/7 | Almost nothing: heavy holders hit the floor anyway, light holders rarely degrade. |
| 3 | `thresholdFloor` 3 → 4 | hypechaser 99.7 | 6 | label 30.1, residency 17.3, arena 27.6, award 15.7 | 8.4% | 4/7 | Small: comeback median 7 → 6. |
| 4 | `vent` 2 → 3 | hypechaser 99.9; comeback nobody 71.8 | 4 | label 33.3, residency 18.7, arena 31.6, award 18.1 | 9.1% | 5/7 | Scandal median passes. At equilibrium scandals ≈ heat generated ÷ vent, so vent is the dominant lever: hypechaser held 33 → 24. comeback slipped over 70% nobody. |
| 5 | star hype 70 → 60 | hypechaser 99.9; comeback 71.8 | 4 | same four | 9.1% | 5/7 | No measurable effect: comeback's binding condition was signing, not hype. |
| 6 | a2_label_deal hype 50 → 45 | hypechaser 99.9; comeback 70.3 | 4 | residency 18.4, award 18.1 | 7.8% | 5/7 | label met 33.3 → 40.6, arena 31.6 → 36.0 (more signings). comeback had been failing both act-2 gates (hype 48 at T8) and taking residency's cheaper failure. |
| 7 | star scandal ceiling 4 → 5 (comeback's N follows) | hypechaser 99.9 | 5 | residency 18.4, award 18.1 | 8.0% | 5/7 | comeback nobody 70.3 → 52.3: it spikes one scandal longer and star tolerates it. Scandal median 4 → 5, the band's edge. |
| 8 | a2_residency scandal ceiling 2 → 4 | hypechaser 99.9 | 5 | residency 25.9, award 18.2 | 8.2% | 5/7 | residency met 18.4 → 25.9. |
| 9 | a2_residency craft 36 → 30 | hypechaser 99.9 | 5 | residency 28.9, award 18.6 | 8.2% | 5/7 | residency met 28.9; still blocked by the scandal ceiling (dealseeker, comeback, random) and by crafter's hype. |
| 10 | a3_award_show scandal ceiling 3 → 6 | hypechaser 99.9 | 5 | residency 28.9, award 27.7 | 8.2% | 5/7 | award met 18.6 → 27.7. |
| 11 | a2_residency scandal ceiling 4 → 6 | hypechaser 99.9 | 5 | award 28.6 | 8.3% | 5/7 | residency met 38.9, in band. |
| 12 | a3_award_show craft 55 → 45 | hypechaser 99.9 | 5 | award 33.9 | 8.3% | 5/7 | award met 33.9. |
| 13 | a3_award_show craft 45 → 40 | hypechaser 99.9 | 5 | none | 8.3% | 6/7 | All gates in band (36.6–46.7). Only hypechaser's concentration fails. |

### Considered and rejected: meltdown's hype floor

Computed offline from run 13, and exact: raising the floor only turns meltdown runs into nobody (they hold 7+ scandals, too many for star or craftsman), and no persona decides by ending.

| meltdown hype floor | hypechaser top ending | random top ending | comeback top ending |
|---|---|---|---|
| 30 (current) | meltdown 100% | meltdown 46% | nobody 52% |
| 70 | meltdown 98% | nobody 78% | nobody 65% |
| 110 | meltdown 71% | nobody 91% | nobody 79% |
| 130 | nobody 64% | nobody 92% | nobody 80% |

hypechaser only drops under 70% once random and comeback are pushed far over it. A meltdown scandal floor has the same problem: hypechaser holds 24 scandals at the median, random 7. No single variable separates them, so tuning stopped at run 13.

### Robustness check (no change, other batch seeds)

| seed | personas over 70% | scandal median | gates out | bands | note |
|---|---|---|---|---|---|
| 1 | hypechaser meltdown 100.0 | 5 | none | 6/7 | crafter nobody 64.1 |
| 424242 | hypechaser meltdown 100.0 | 5 | none | 6/7 | crafter nobody 66.9 |

### Values changed in this pass

- `content/rules.json` — `degradePerScandal` 1 → 0.5 · `thresholdFloor` 3 → 4 · `vent` 2 → 3
- `content/endings.json` — craftsman hype 25 → 12 · star hype 70 → 60 · star scandal ceiling 4 → 5
- `content/gates.json` — a2_label_deal hype 50 → 45 · a2_residency craft 36 → 30, scandal ceiling 2 → 6 · a3_award_show craft 55 → 40, scandal ceiling 3 → 6

### Fragile edges

- Scandal median 5 on all three seeds: the band's top edge.
- crafter nobody 68.2% (64.1 and 66.9 on the other seeds): 2–6 points under the cap.

## Round 4 — Step 7 (2026-09-29)

Tuned against the round-4 bands (CLAUDE.md §5): player-like personas carry the concentration band, the
control probes carry the thesis assertions. 6 personas × 1000 runs on seed 20260929, one variable per run.
Priority: soft-locks → player-like concentration → probe assertions → scandal median → gate met% → card play rate.
The scandal median sat at 5, the band's top edge, in round 3; the aim here was the middle.
Soft-locks and crashes were 0 in every run; player-like concentration, both probe assertions, card play
rate and the minmaxer-vs-random divergence passed in every run.

Columns: player-like personas over 70% · probe assertions (heat, hype) · pooled median scandals held at run end ·
gates outside met% 35–65% · lowest card play rate (played ÷ drawn) · bands passing, of 9.

| # | change | player-like over 70% | probes | scandal median | gates out (met%) | lowest play rate | bands | what moved |
|---|---|---|---|---|---|---|---|---|
| 0 | none: end of round-4 step 6 | none | pass, pass | 5 | audition 17.0, showcase 32.6, award_show 33.0 | crisis_pr 14.8% | 8/9 | Starting point. 43.2% of runs hold 4 or fewer scandals; the median needs 50%. |
| 1 | `heatThreshold` [7, 6, 6, 5] → [8, 7, 6, 5] | none | pass, pass | 5 | same three | crisis_pr 14.1% | 8/9 | No effect on the median: heat left uncrystallised in spring carries over and crystallises at the season boundary. **Reverted.** |
| 2 | `thresholdFloor` [7, 6, 5, 4] → [7, 6, 5, 4.5] | none | pass, pass | 5 | audition 17.0, showcase 32.6, award_show 32.8 | crisis_pr 14.7% | 8/9 | Winter crystallisation 0.54 → 0.46 per turn. Makes room for vent 4 (vent must stay below every floor); validate now accepts fractional floors. |
| 3 | `vent` 3 → 4 | none | pass, pass | 5 | audition 17.0, showcase 32.6 | crisis_pr 14.3% | 8/9 | random median 7 → 5, hypechaser 25 → 20; runs at 4 or fewer 43 → 49%. award_show met 38.3 (fewer runs over its scandal ceiling). |
| 4 | crisis_pr price 6 → 4 capital (`requires` and cost) | none | pass, pass | 4 | audition 16.9, showcase 32.6 | crisis_pr 19.7% | 8/9 | Median 4: the surplus capital buys scandals off (minmaxer and dealseeker medians 2). |
| 5 | gate_audition craft 24 → 18 | none | pass, pass | 4 | showcase 32.6 | lay_low 19.1% | 8/9 | audition met 16.9 → 42.4. Spring gates now come after 3 turns, not 4: 24 × 3/4 = 18. |
| 6 | gate_showcase hype 26 → 20 | none | pass, pass | 4 | none | lay_low 18.8% | 9/9 | showcase met 32.6 → 46.0 (26 × 3/4 ≈ 20). All bands pass. |
| 7 | indie_label actMin 2 → 1 (spring) | none | pass, pass | 4 | none | indie_label 14.9% | 9/9 | Not a band: restores step 5's target. Step 6's honest draft valuation had cut indie_label's share of signings to 13.6%; at run 6 it read 15.0 / 16.3 / 14.7% on the three seeds. Now 21.6%. |

### Considered in memory, not taken

Each alone left the pooled median at 5: viral_stunt heat 5 → 4 (runs at 4 or fewer 43 → 47%) or → 3;
press_junket's low-craft heat 4 → 3; degradePerScandal 0.5 → 0.25; crisis_pr at 5, 4 or 3 capital alone
(up to 47%); legal_team 6 → 4; apology_tour hype cost 6 → 4. For indie_label, a price of 3 worked as well as
spring (21%) but undercuts the 4 that an extra pick and label_deal cost.

Why the median is sticky: three of the six personas sit at fixed points by construction — crafter at 0,
hypechaser above 20, comeback at 6 (it only starts cleaning up at 5 scandals). The median is decided by
minmaxer, random and dealseeker, which together need about 64% of their runs at 4 or fewer.

### Robustness check (no change, other batch seeds)

| seed | player-like over 70% | probes | scandal median | runs at ≤ 4 | gates out | bands | indie share of signings |
|---|---|---|---|---|---|---|---|
| 20260929 | none | pass, pass | 4 | 53.1% | none | 9/9 | 21.6% |
| 1 | none | pass, pass | 4 | 52.8% | none | 9/9 | 21.8% |
| 424242 | none | pass, pass | 4 | 52.0% | none | 9/9 | 23.4% |

### Values changed in this pass

- `content/rules.json` — `thresholdFloor` [7, 6, 5, 4] → [7, 6, 5, 4.5] · `vent` 3 → 4
- `content/cards.json` — crisis_pr: requires capital 6 → 4, pays 6 → 4 (en.json text updated) · indie_label: actMin 2 → 1
- `content/gates.json` — gate_audition craft 24 → 18 · gate_showcase hype 26 → 20
- `validate/validate.ts` — thresholdFloor entries may be fractional (vent stays an integer)

### Fragile edges

- Scandal median 4: 52.0–53.1% of runs hold 4 or fewer (median 5 below 50%); 46.4–47.1% hold 3 or fewer.
- Probes drag the pooled gate met% down: over player-like personas only, residency is at 67.7–68.5% and
  award_show at 62.9–63.5%, so excluding probes from pooled bands would put residency out of band.
- The crystallisation peak is still summer, and vent 4 made winter the quietest act (pooled 0.43 / 0.67 / 0.49 /
  0.37 per turn). The hand choke still peaks in winter. The spiral's shape is not a band, so it was not tuned.
