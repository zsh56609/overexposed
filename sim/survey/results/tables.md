# A. Inventory (counted from the content files)


## A1. Cards

Cards in content: 42 (36 draftable, 6 scandal). Starting deck: 11 cards — vocal_coaching ×2, open_mic, cover_single, side_gig ×2, press_junket, viral_stunt, lay_low, networking, crisis_pr.

The offer pool by season (a draft offers 3 cards at the start of months 1 and 2 of each season = 6 shown per season, 8 drafts a year; rerolls and extra picks come on top; once a lane is established an offer holds at least one card of it). A card joins the pool in the season of its `actMin`.

| season | pool | music | screen | celebrity | neutral | actions | opportunities | new this season | scandal cards in play |
|---|---|---|---|---|---|---|---|---|---|
| 1 spring | 24 | 8 | 2 | 7 | 7 | 21 | 3 | vocal_coaching, open_mic, viral_stunt, press_junket, side_gig, lay_low, networking, crisis_pr, ghostwriter, meditation_retreat, apology_tour, collab_single, tabloid_bait, reinvent_image, sellout_ad, street_team, demo_tape, fan_meetup, cover_single, brand_deal, mentorship, indie_label, screen_test, acting_class | 4 |
| 2 summer | 33 | 9 | 10 | 7 | 7 | 28 | 5 | studio_session, late_night_show, film_cameo, guest_spot, soundtrack_single, streaming_role, table_read, self_tape, voice_over | 6 |
| 3 autumn | 35 | 10 | 10 | 7 | 8 | 28 | 7 | award_campaign, legal_team | 6 |
| 4 winter | 36 | 11 | 10 | 7 | 8 | 28 | 8 | world_tour | 6 |

Every card:

| card | kind | lane | from season | tags | requires | headline variants | lane-text variants | in-hand variants |
|---|---|---|---|---|---|---|---|---|
| vocal_coaching | action | music | 1 | craft/training | - | 4 | screen 4 | - |
| open_mic | action | music | 1 | hype/gig | - | 2 | - | - |
| viral_stunt | action | celebrity | 1 | hype/stunt | - | 2 | - | - |
| press_junket | action | celebrity | 1 | hype/press | - | 3 | - | - |
| side_gig | action | neutral | 1 | money/gig | - | 5 | - | - |
| lay_low | action | neutral | 1 | recovery | - | 2 | - | - |
| networking | action | neutral | 1 | social | - | 3 | - | - |
| crisis_pr | action | neutral | 1 | recovery/fixer | capital>=4 & scandalCount>=1 | 2 | - | - |
| studio_session | action | music | 2 | craft/recording | - | 2 | - | - |
| tabloid_story | scandal | - | 1 | scandal/press | - | 2 | - | 2 |
| public_feud | scandal | - | 2 | scandal/gig | - | 2 | - | 2 |
| ghostwriter | action | music | 1 | money/recording | capital>=3 | 2 | - | - |
| meditation_retreat | action | neutral | 1 | recovery/training | craft>=10 | 2 | - | - |
| apology_tour | action | neutral | 1 | recovery/press | scandalCount>=1 | 2 | - | - |
| collab_single | action | music | 1 | hype/recording | - | 2 | - | - |
| tabloid_bait | action | celebrity | 1 | hype/stunt | - | 2 | - | - |
| reinvent_image | action | neutral | 1 | recovery | - | 2 | - | - |
| sellout_ad | action | celebrity | 1 | money/stunt | - | 2 | - | - |
| street_team | action | celebrity | 1 | hype/social | capital>=2 | 2 | - | - |
| demo_tape | action | music | 1 | craft/recording | craft>=15 | 2 | - | - |
| fan_meetup | action | celebrity | 1 | hype/social | - | 2 | - | - |
| late_night_show | action | screen | 2 | hype/press | hype>=25 | 2 | - | - |
| cover_single | action | music | 1 | hype/recording/money | - | 2 | - | - |
| brand_deal | opportunity | celebrity | 1 | money/stunt | hype>=20 | 2 | - | - |
| film_cameo | opportunity | screen | 2 | hype/press | hype>=35 | 2 | - | - |
| mentorship | opportunity | music | 1 | craft/training | - | 2 | - | - |
| world_tour | opportunity | music | 4 | hype/gig | capital>=5 | 2 | - | - |
| award_campaign | opportunity | music | 3 | craft/press | craft>=40 | 2 | - | - |
| legal_team | opportunity | neutral | 3 | recovery/fixer | capital>=6 & scandalCount>=1 | 2 | - | - |
| indie_label | opportunity | music | 1 | money/recording | hype>=40 & capital>=4 & flags not[signed_label] | 2 | - | - |
| bad_press | scandal | - | 1 | scandal/recording | - | 2 | - | 2 |
| burnout | scandal | - | 1 | scandal/gig | - | 2 | - | 2 |
| copycat_story | scandal | - | 1 | scandal/stunt | - | 3 | - | 2 |
| old_rumor | scandal | - | 2 | scandal/money | - | 2 | - | 2 |
| screen_test | action | screen | 1 | craft/training | - | 2 | - | - |
| acting_class | action | screen | 1 | craft/training | capital>=1 | 2 | - | - |
| guest_spot | action | screen | 2 | hype/press | hype>=15 | 2 | - | - |
| soundtrack_single | action | screen | 2 | hype/recording | craft>=20 | 2 | - | - |
| streaming_role | opportunity | screen | 2 | hype/press | hype>=25 | 2 | - | - |
| table_read | action | screen | 2 | craft/training | - | 2 | - | - |
| self_tape | action | screen | 2 | craft/training | - | 2 | - | - |
| voice_over | action | screen | 2 | money/recording | - | 2 | - | - |

## A2. Events between months (texts, letters, phone threads)

28 events: 12 one-offs and 16 chain steps in 6 chains (sam: 4 steps, ex: 2 steps, juno: 3 steps, home: 3 steps, lio: 2 steps, lens: 2 steps). Event months: 2, 4, 6, 8, 10, 12 (one event or none a month); at most 2 chains open at once; an event comes at most once a year. A lane (music, screen, celebrity) doubles an event's weight; it is not a gate.

| event month | season | events with the month in their window | openers + one-offs | follow-ups | of those with no condition |
|---|---|---|---|---|---|
| 2 | spring | 3 | 3 | 0 | 3 |
| 4 | summer | 12 | 12 | 0 | 5 |
| 6 | summer | 14 | 14 | 0 | 5 |
| 8 | autumn | 20 | 13 | 7 | 4 |
| 10 | winter | 17 | 7 | 10 | 1 |
| 12 | winter | 18 | 8 | 10 | 0 |

By season (events with at least one of the season's event months in their window): spring 3, summer 14, autumn 20, winter 21.

| event | category | form | chain | months | condition | weight | lane | rival arc | first-marked | messages | replies |
|---|---|---|---|---|---|---|---|---|---|---|---|
| sam_rent | personal | text | sam:opener | 2-6 | - | 1 | - | - | - | 2 | 3 |
| sam_band | personal | text | sam:followUp | 8-12 | flags all[sam_lent] | 1 | - | - | - | 3 | 2 |
| sam_payback | personal | text | sam:followUp | 8-12 | flags all[sam_half] | 1 | - | - | - | 2 | 2 |
| sam_interview | press | letter | sam:followUp | 8-12 | flags all[sam_refused] & hype>=15 | 1 | - | - | - | 2 | 3 |
| ex_feature | press | letter | ex:opener | 4-8 | hype>=15 | 1 | - | - | - | 2 | 3 |
| ex_reply | personal | text | ex:followUp | 10-12 | flags all[told_all] | 1 | - | - | - | 2 | 3 |
| juno_hello | rival | text | juno:opener | 4-8 | - | 3 | - | - | - | 2 | 2 |
| juno_credit | rival | text | juno:followUp | 10-12 | flags all[juno_cowrite] | 1 | - | - | - | 2 | 2 |
| juno_soundalike | rival | letter | juno:followUp | 10-12 | flags all[juno_declined] | 1 | - | - | - | 2 | 3 |
| juno_interview | rival | text | - | 6-8 | flags any[juno_cowrite,juno_declined] | 1 | - | - | - | 2 | 3 |
| juno_shortlist | rival | text | - | 12-12 | hype>=30 & flags not[juno_feud] | 3 | - | breakthrough | yes | 2 | 3 |
| juno_carpet | rival | text | - | 12-12 | flags not[juno_feud] | 3 | - | crossover | yes | 2+2 | 3 |
| juno_video | rival | text | - | 12-12 | flags not[juno_feud] | 3 | - | crash | yes | 2 | 3 |
| juno_unsigned | rival | text | - | 12-12 | flags not[juno_feud] | 3 | - | fade | yes | 2 | 3 |
| mum_sunday | personal | text | home:opener | 2-8 | - | 1 | - | - | - | 2 | 2 |
| mum_gran | personal | text | home:followUp | 8-12 | flags all[went_home] | 1 | - | - | - | 2 | 2 |
| mum_quiet | personal | text | home:followUp | 8-12 | flags all[missed_dinner] | 1 | - | - | - | 2 | 3 |
| producer_room | industry | text | lio:opener | 2-8 | - | 1 | music | - | - | 2 | 2 |
| lio_track | industry | text | lio:followUp | 8-12 | flags all[lio_session] | 1 | - | - | - | 2 | 3 |
| casting_arc | industry | letter | - | 4-11 | - | 1 | screen | - | - | 2 | 2 |
| photographer | press | text | lens:opener | 3-8 | hype>=15 | 1 | celebrity | - | - | 2 | 2 |
| photographer_again | press | text | lens:followUp | 8-12 | flags all[tipped_off] | 1 | - | - | - | 2 | 3 |
| charity_song | personal | letter | - | 4-12 | hype>=25 | 1 | - | - | - | 2 | 3 |
| panel_show | press | text | - | 4-12 | hype>=25 | 1 | - | - | - | 2 | 3 |
| director_read | industry | letter | - | 6-10 | hype>=20 | 1 | screen | - | - | 2 | 3 |
| guest_judge | industry | text | - | 4-12 | hype>=20 | 1 | screen | - | - | 2 | 3 |
| reality_show | industry | letter | - | 4-10 | hype>=15 | 1 | celebrity | - | - | 2 | 3 |
| fake_ad | industry | letter | - | 4-12 | hype>=15 | 1 | celebrity | - | - | 2 | 3 |

Chains: **sam** opener sam_rent → sam_band, sam_payback, sam_interview; **ex** opener ex_feature → ex_reply; **juno** opener juno_hello → juno_credit, juno_soundalike; **home** opener mum_sunday → mum_gran, mum_quiet; **lio** opener producer_room → lio_track; **lens** opener photographer → photographer_again.

## A3. Scandals and newspaper headlines

Scandal cards: 6 (tabloid_story from season 1, public_feud from season 2, bad_press from season 1, burnout from season 1, copycat_story from season 1, old_rumor from season 2).

| paper | world stories | any season | by season 1/2/3/4 | frenzy spill-overs | fame filler | sagas (beats) |
|---|---|---|---|---|---|---|
| flash | 25 | 18 | 1/3/1/2 | 0 | 8 | 2 (8) |
| bside | 35 | 31 | 1/1/1/1 | 3 | 7 | 2 (8) |
| marquee | 37 | 33 | 1/1/1/1 | 3 | 7 | 2 (8) |

Rival arcs (one is fixed by the seed each year): breakthrough (breakthrough, 4 beats, award best_new_artist), crash (overexposed, 4 beats), crossover (breakthrough, 4 beats, award breakthrough_performance), fade (long_game, 4 beats, award critics_choice).

## A4. Doors, endings, awards

| season | doors that exist | offered | door: requirement |
|---|---|---|---|
| 1 | 2 | 2 | gate_audition: craft>=18; gate_showcase: hype>=17 |
| 2 | 2 | 2 | gate_festival: hype>=35; gate_session_work: craft>=33 |
| 3 | 2 | 2 | gate_label_deal: hype>=50 & capital>=4; gate_residency: craft>=30 & hype>=15 & scandalCount<=4 |
| 4 | 2 | 2 | gate_arena_tour: hype>=64 & flags all[signed_label]; gate_award_show: craft>=47 & hype>=30 & scandalCount<=6 |

Endings: 4 major (breakthrough, long_game, overexposed, hard_way) and 14 minor.

| minor ending | major | condition | text variants |
|---|---|---|---|
| leading_role | breakthrough | lane any[screen] | 2 |
| household_name | breakthrough | lane any[celebrity] | 2 |
| star | breakthrough | lane any[music] & flags all[signed_label] | 2 |
| the_independent | breakthrough | (fallback) | 2 |
| redemption_arc | overexposed | scandalDrop>=2 | 2 |
| tabloid_royalty | overexposed | lane any[celebrity] | 2 |
| meltdown | overexposed | (fallback) | 2 |
| character_actor | long_game | craft>=55 & lane any[screen] | 2 |
| the_one_to_watch | long_game | lane any[celebrity] | 2 |
| craftsman | long_game | craft>=55 | 2 |
| nobody | long_game | (fallback) | 2 |
| flash_in_the_pan | hard_way | peakHype>=75 | 2 |
| running_on_empty | hard_way | anyOf=[{"holds":{"any":["burnout"]}},{"craft":{"max":34}}] | 2 |
| starting_over | hard_way | (fallback) | 2 |

Awards: 12 (11 with conditions, one fallback); up to 8 can be won in a year.

| award | conditions |
|---|---|
| best_new_artist | ending any[star,the_independent] |
| breakthrough_of_the_year | bestMonthHype>=20 |
| peoples_choice | hype>=105 |
| critics_choice | craft>=90 & ending not[breakthrough] |
| best_live_act | lane any[music] & passed any[gate_festival,gate_residency,gate_arena_tour] |
| songwriter_of_the_year | lane any[music] & craft>=60 |
| breakthrough_performance | lane any[screen] & hype>=80 |
| style_icon | lane any[celebrity] & hype>=80 |
| best_collaboration | flags all[juno_cowrite] |
| comeback_of_the_year | scandalDrop>=2 |
| scandal_of_the_year | scandalCount>=9 |
| most_promising_newcomer | (only when no other is won) |

## A5. Manager lines and notes, per manager

| manager | line groups (triggers) | line variants | single-variant line groups | sign-offs easy/hard | month-end lines | last words | note keys |
|---|---|---|---|---|---|---|---|
| Dex Holloway (veteran) | 22 | 50 | none | 4/4 | - | 4 | 10 |
| Marguerite Ashby (guardian) | 22 | 50 | none | 4/4 | 3 | 4 | 10 |

The notes are shown by the UI to a new player (notes on) and are not played by the sim; counted from en.json (keys include the touch variants and the sign-off key): veteran: stats, actions, heat, doors, end, mirror, scandal, sign · guardian: stats, actions, heat, doors, end, mirror, scandal, sign.

## A6. One-time text groups (shown once a run), by number of variants

26 groups (the opening, the season cards after spring's, one per door, one per minor ending): 1 variant: **0**, 2 variants: **26**, 3 or more: **0**, none: 0. Groups with a single variant: none.

Every kind of line group, by variants:

| kind | groups | variants | 1 variant | 2 | 3+ |
|---|---|---|---|---|---|
| card | 37 | 83 | 0 | 32 | 5 |
| filler | 3 | 22 | 0 | 0 | 3 |
| inHand | 6 | 12 | 0 | 6 | 0 |
| manager | 44 | 100 | 0 | 34 | 10 |
| monthEnd | 1 | 3 | 0 | 0 | 1 |
| once | 26 | 52 | 0 | 26 | 0 |
| scandal | 6 | 13 | 0 | 5 | 1 |
| signoff | 4 | 16 | 0 | 0 | 4 |
| spillover | 2 | 6 | 0 | 0 | 2 |
| world | 3 | 97 | 0 | 0 | 3 |

Groups of any kind with a single variant (0): none.

Events' printed answers (a line group each): 32 groups, 32 with a single variant: event:sam_band:0, event:sam_payback:1, event:sam_interview:1, event:sam_interview:2, event:ex_feature:0, event:ex_feature:1, event:ex_reply:1, event:ex_reply:2, event:juno_hello:0, event:juno_credit:1, event:juno_soundalike:0, event:juno_soundalike:1, event:juno_interview:1, event:juno_shortlist:1, event:juno_carpet:0, event:juno_carpet:1, event:juno_video:1, event:juno_unsigned:1, event:mum_gran:0, event:lio_track:1, event:lio_track:2, event:casting_arc:0, event:photographer:0, event:photographer_again:1, event:charity_song:0, event:panel_show:1, event:director_read:0, event:director_read:1, event:guest_judge:0, event:guest_judge:1, event:reality_show:0, event:fake_ad:0.

# B. Five years in a row (measured by the simulation)


## T1. Repeat rate by year — mixed player (both managers added)

Repeat rate of year k = of the distinct items shown in year k, the share already shown in years 1..k-1. 4000 five-year sequences. Year 1 is always "-" (nothing before it).

| type | pool | items/yr (Y1..Y5) | Y2 | Y3 | Y4 | Y5 | first year > 50% |
|---|---|---|---|---|---|---|---|
| cards offered in drafts | 36 | 19.38 / 20.86 / 20.82 / 20.87 / 20.89 | 56.1% | 81.7% | 91.9% | 96.1% | year 2 |
| cards drafted | 36 | 8.34 / 8.90 / 8.91 / 8.95 / 8.92 | 28.0% | 48.0% | 62.3% | 72.1% | year 4 |
| cards played | 36 | 12.31 / 12.50 / 12.48 / 12.51 / 12.49 | 59.8% | 74.2% | 81.5% | 85.9% | year 2 |
| between-month events | 28 | 5.98 / 5.98 / 5.98 / 5.98 / 5.98 | 3.0% | 48.2% | 62.3% | 72.4% | year 4 |
| event chains (any step) | 6 | 1.88 / 1.84 / 1.84 / 1.84 / 1.83 | 0.0% | 68.0% | 82.8% | 89.5% | year 3 |
| scandal cards crystallised | 6 | 2.25 / 2.25 / 2.21 / 2.31 / 2.22 | 46.8% | 68.3% | 79.2% | 85.9% | year 3 |
| doors offered | 8 | 8.00 / 8.00 / 8.00 / 8.00 / 8.00 | 100.0% | 100.0% | 100.0% | 100.0% | year 2 |
| doors taken | 8 | 4.00 / 4.00 / 4.00 / 4.00 / 4.00 | 50.2% | 74.5% | 88.0% | 93.7% | year 2 |
| minor endings | 14 | 1.00 / 1.00 / 1.00 / 1.00 / 1.00 | 11.2% | 20.6% | 29.2% | 35.9% | none in 5 |
| major endings | 4 | 1.00 / 1.00 / 1.00 / 1.00 / 1.00 | 31.3% | 50.5% | 65.5% | 74.4% | year 3 |
| awards | 12 | 2.50 / 2.58 / 2.57 / 2.52 / 2.56 | 25.8% | 44.1% | 57.9% | 68.2% | year 4 |
| once-a-run texts (variant) | 52 | 13.00 / 13.00 / 13.00 / 13.00 / 13.00 | 0.0% | 92.4% | 92.6% | 92.8% | year 3 |
| manager's lines (variant) | 61 | 22.68 / 22.76 / 22.73 / 22.82 / 22.72 | 58.9% | 75.9% | 84.0% | 88.3% | year 2 |
| newspaper items, every paper (variant) | 165 | 118.26 / 118.22 / 118.26 / 118.21 / 118.22 | 90.0% | 95.2% | 96.6% | 97.1% | year 2 |
| newspaper items, the lead paper only (variant) | 165 | 35.57 / 35.39 / 35.43 / 35.33 / 35.50 | 32.6% | 51.9% | 65.2% | 72.7% | year 3 |
| player's printed headlines (variant) | 96 | 28.62 / 28.66 / 28.54 / 28.76 / 28.60 | 52.0% | 70.0% | 78.8% | 83.8% | year 2 |
| scandal in-hand lines (variant) | 12 | 2.58 / 2.52 / 2.50 / 2.58 / 2.52 | 29.1% | 47.3% | 60.8% | 70.0% | year 4 |
| events' printed answers (variant) | 32 | 2.04 / 2.06 / 2.07 / 2.07 / 2.06 | 2.6% | 22.6% | 29.9% | 39.9% | none in 5 |

## T2. Coverage — mixed player: share of the whole pool seen after k years

| type | pool | after 1 | after 2 | after 3 | after 4 | after 5 |
|---|---|---|---|---|---|---|
| cards offered in drafts | 36 | 53.8% | 79.3% | 89.8% | 94.6% | 96.8% |
| cards drafted | 36 | 23.2% | 41.0% | 53.8% | 63.2% | 70.1% |
| cards played | 36 | 34.2% | 48.1% | 57.1% | 63.5% | 68.4% |
| between-month events | 28 | 21.4% | 42.1% | 53.1% | 61.2% | 67.1% |
| event chains (any step) | 6 | 31.3% | 62.0% | 71.8% | 77.1% | 80.3% |
| scandal cards crystallised | 6 | 37.5% | 57.4% | 69.1% | 77.1% | 82.3% |
| doors offered | 8 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% |
| doors taken | 8 | 50.0% | 74.9% | 87.7% | 93.7% | 96.9% |
| minor endings | 14 | 7.1% | 13.5% | 19.2% | 24.2% | 28.8% |
| major endings | 4 | 25.0% | 42.2% | 54.6% | 63.2% | 69.6% |
| awards | 12 | 20.8% | 36.8% | 48.7% | 57.6% | 64.4% |
| once-a-run texts (variant) | 52 | 25.0% | 50.0% | 51.9% | 53.7% | 55.5% |
| manager's lines (variant) | 61 | 38.1% | 53.8% | 63.0% | 69.2% | 73.6% |
| newspaper items, every paper (variant) | 165 | 71.7% | 78.8% | 82.2% | 84.7% | 86.8% |
| newspaper items, the lead paper only (variant) | 165 | 21.6% | 36.0% | 46.4% | 53.8% | 59.7% |
| player's printed headlines (variant) | 96 | 29.8% | 44.1% | 53.1% | 59.4% | 64.2% |
| scandal in-hand lines (variant) | 12 | 21.5% | 36.4% | 47.4% | 55.8% | 62.1% |
| events' printed answers (variant) | 32 | 6.4% | 12.6% | 17.6% | 22.2% | 26.0% |

## T3. Repeat rate and coverage by cell (strategy × manager) — events, cards offered, newspaper items


**between-month events** — repeat rate Y2..Y5 · first year > 50% · coverage after 5 years

| cell | Y2 | Y3 | Y4 | Y5 | first > 50% | coverage Y5 | items/yr |
|---|---|---|---|---|---|---|---|
| artisan/guardian | 7.6% | 73.8% | 81.3% | 85.5% | year 3 | 53.3% | 5.92 |
| artisan/veteran | 7.6% | 74.7% | 80.2% | 86.0% | year 3 | 53.0% | 5.91 |
| celebseeker/guardian | 1.1% | 50.1% | 66.1% | 76.3% | year 3 | 65.7% | 6.00 |
| celebseeker/veteran | 1.1% | 48.0% | 65.8% | 75.9% | year 4 | 66.3% | 6.00 |
| comeback/guardian | 3.9% | 45.1% | 62.8% | 73.5% | year 4 | 67.4% | 6.00 |
| comeback/veteran | 3.9% | 43.8% | 63.3% | 73.5% | year 4 | 67.6% | 6.00 |
| crafter/guardian | 13.3% | 86.1% | 92.3% | 93.6% | year 3 | 42.3% | 5.51 |
| crafter/veteran | 13.4% | 86.0% | 92.0% | 93.4% | year 3 | 42.6% | 5.54 |
| dealseeker/guardian | 1.3% | 47.5% | 65.4% | 75.4% | year 4 | 66.5% | 6.00 |
| dealseeker/veteran | 0.9% | 48.1% | 64.9% | 75.4% | year 4 | 66.6% | 6.00 |
| hypechaser/guardian | 3.9% | 45.7% | 65.2% | 76.2% | year 4 | 66.2% | 6.00 |
| hypechaser/veteran | 3.9% | 45.2% | 65.7% | 76.8% | year 4 | 66.1% | 6.00 |
| minmaxer/guardian | 1.1% | 50.3% | 64.8% | 76.5% | year 3 | 65.9% | 6.00 |
| minmaxer/veteran | 1.0% | 49.9% | 65.1% | 75.9% | year 4 | 66.0% | 6.00 |
| mixed/guardian | 3.1% | 48.2% | 62.2% | 72.4% | year 4 | 67.1% | 5.98 |
| mixed/veteran | 2.9% | 48.3% | 62.4% | 72.3% | year 4 | 67.1% | 5.98 |
| random/guardian | 4.3% | 49.3% | 60.0% | 70.6% | year 4 | 67.4% | 5.98 |
| random/veteran | 4.1% | 48.7% | 60.7% | 70.4% | year 4 | 67.5% | 5.98 |
| screenseeker/guardian | 1.1% | 52.9% | 67.6% | 77.8% | year 3 | 64.4% | 6.00 |
| screenseeker/veteran | 1.1% | 52.1% | 66.2% | 77.4% | year 3 | 64.9% | 6.00 |

**cards offered in drafts** — repeat rate Y2..Y5 · first year > 50% · coverage after 5 years

| cell | Y2 | Y3 | Y4 | Y5 | first > 50% | coverage Y5 | items/yr |
|---|---|---|---|---|---|---|---|
| artisan/guardian | 46.9% | 74.0% | 87.1% | 93.5% | year 3 | 95.2% | 17.74 |
| artisan/veteran | 62.5% | 87.2% | 95.2% | 98.1% | year 2 | 98.5% | 23.19 |
| celebseeker/guardian | 48.3% | 73.6% | 85.7% | 91.4% | year 3 | 92.2% | 16.90 |
| celebseeker/veteran | 63.5% | 86.2% | 94.0% | 97.1% | year 2 | 97.4% | 22.50 |
| comeback/guardian | 46.2% | 73.1% | 85.6% | 92.4% | year 3 | 94.0% | 17.11 |
| comeback/veteran | 64.7% | 88.1% | 95.5% | 98.1% | year 2 | 98.5% | 23.65 |
| crafter/guardian | 49.1% | 76.2% | 88.7% | 94.3% | year 3 | 96.0% | 18.51 |
| crafter/veteran | 61.9% | 86.8% | 95.2% | 98.1% | year 2 | 98.6% | 23.13 |
| dealseeker/guardian | 45.7% | 73.1% | 86.2% | 93.0% | year 3 | 94.7% | 17.35 |
| dealseeker/veteran | 62.9% | 87.2% | 95.4% | 97.9% | year 2 | 98.4% | 23.29 |
| hypechaser/guardian | 46.3% | 72.8% | 85.7% | 92.1% | year 3 | 93.8% | 17.04 |
| hypechaser/veteran | 63.6% | 87.0% | 94.9% | 97.7% | year 2 | 98.1% | 23.06 |
| minmaxer/guardian | 45.8% | 72.8% | 86.2% | 92.7% | year 3 | 94.7% | 17.30 |
| minmaxer/veteran | 61.6% | 86.1% | 94.7% | 97.8% | year 2 | 98.1% | 22.68 |
| mixed/guardian | 47.3% | 74.5% | 87.4% | 93.6% | year 3 | 95.1% | 17.85 |
| mixed/veteran | 62.9% | 87.2% | 95.3% | 98.1% | year 2 | 98.5% | 23.28 |
| random/guardian | 53.3% | 80.0% | 90.8% | 95.8% | year 2 | 96.8% | 19.90 |
| random/veteran | 63.8% | 87.9% | 95.4% | 98.1% | year 2 | 98.6% | 23.55 |
| screenseeker/guardian | 47.1% | 73.8% | 87.0% | 93.3% | year 3 | 94.3% | 17.56 |
| screenseeker/veteran | 62.5% | 86.7% | 95.1% | 97.8% | year 2 | 97.8% | 22.98 |

**newspaper items, every paper (variant)** — repeat rate Y2..Y5 · first year > 50% · coverage after 5 years

| cell | Y2 | Y3 | Y4 | Y5 | first > 50% | coverage Y5 | items/yr |
|---|---|---|---|---|---|---|---|
| artisan/guardian | 95.3% | 97.4% | 98.3% | 98.7% | year 2 | 80.4% | 120.40 |
| artisan/veteran | 95.4% | 97.4% | 98.3% | 98.7% | year 2 | 80.4% | 120.45 |
| celebseeker/guardian | 89.3% | 94.7% | 96.6% | 97.6% | year 2 | 85.8% | 115.75 |
| celebseeker/veteran | 87.8% | 93.8% | 96.3% | 97.4% | year 2 | 86.4% | 113.78 |
| comeback/guardian | 86.8% | 93.9% | 95.8% | 96.6% | year 2 | 89.0% | 115.62 |
| comeback/veteran | 85.8% | 93.5% | 95.6% | 96.7% | year 2 | 89.5% | 114.76 |
| crafter/guardian | 95.5% | 97.4% | 98.3% | 98.7% | year 2 | 80.4% | 120.69 |
| crafter/veteran | 95.6% | 97.4% | 98.3% | 98.7% | year 2 | 80.4% | 120.73 |
| dealseeker/guardian | 89.0% | 94.7% | 96.2% | 96.9% | year 2 | 88.9% | 119.03 |
| dealseeker/veteran | 87.0% | 94.1% | 95.9% | 96.6% | year 2 | 90.9% | 118.65 |
| hypechaser/guardian | 75.1% | 88.6% | 93.4% | 95.4% | year 2 | 90.8% | 100.96 |
| hypechaser/veteran | 73.8% | 87.8% | 92.6% | 94.9% | year 2 | 88.6% | 96.36 |
| minmaxer/guardian | 90.7% | 95.3% | 96.5% | 97.2% | year 2 | 87.3% | 119.68 |
| minmaxer/veteran | 89.1% | 94.7% | 96.2% | 96.8% | year 2 | 89.2% | 119.46 |
| mixed/guardian | 90.4% | 95.4% | 96.7% | 97.2% | year 2 | 86.3% | 118.34 |
| mixed/veteran | 89.6% | 95.0% | 96.5% | 97.0% | year 2 | 87.3% | 118.12 |
| random/guardian | 91.6% | 96.4% | 97.6% | 98.0% | year 2 | 82.5% | 117.09 |
| random/veteran | 91.7% | 96.3% | 97.6% | 98.0% | year 2 | 82.5% | 116.99 |
| screenseeker/guardian | 90.6% | 95.7% | 97.0% | 97.6% | year 2 | 85.5% | 118.53 |
| screenseeker/veteran | 89.1% | 95.1% | 96.8% | 97.6% | year 2 | 86.8% | 118.03 |

**once-a-run texts (variant)** — repeat rate Y2..Y5 · first year > 50% · coverage after 5 years

| cell | Y2 | Y3 | Y4 | Y5 | first > 50% | coverage Y5 | items/yr |
|---|---|---|---|---|---|---|---|
| artisan/guardian | 0.0% | 94.0% | 95.8% | 97.2% | year 3 | 53.2% | 13.00 |
| artisan/veteran | 0.0% | 94.3% | 96.2% | 97.4% | year 3 | 53.0% | 13.00 |
| celebseeker/guardian | 0.0% | 93.3% | 94.5% | 95.7% | year 3 | 54.1% | 13.00 |
| celebseeker/veteran | 0.0% | 94.2% | 96.0% | 97.2% | year 3 | 53.2% | 13.00 |
| comeback/guardian | 0.0% | 92.6% | 93.1% | 93.7% | year 3 | 55.2% | 13.00 |
| comeback/veteran | 0.0% | 92.6% | 92.9% | 93.5% | year 3 | 55.3% | 13.00 |
| crafter/guardian | 0.0% | 94.3% | 96.3% | 97.6% | year 3 | 52.9% | 13.00 |
| crafter/veteran | 0.0% | 94.2% | 96.2% | 97.6% | year 3 | 53.0% | 13.00 |
| dealseeker/guardian | 0.0% | 92.6% | 93.0% | 93.7% | year 3 | 55.2% | 13.00 |
| dealseeker/veteran | 0.0% | 92.6% | 93.3% | 93.8% | year 3 | 55.1% | 13.00 |
| hypechaser/guardian | 0.0% | 94.3% | 96.3% | 97.6% | year 3 | 52.9% | 13.00 |
| hypechaser/veteran | 0.0% | 94.8% | 96.9% | 97.8% | year 3 | 52.6% | 13.00 |
| minmaxer/guardian | 0.0% | 92.6% | 93.0% | 93.6% | year 3 | 55.2% | 13.00 |
| minmaxer/veteran | 0.0% | 92.7% | 93.1% | 93.8% | year 3 | 55.1% | 13.00 |
| mixed/guardian | 0.0% | 92.4% | 92.6% | 92.9% | year 3 | 55.5% | 13.00 |
| mixed/veteran | 0.0% | 92.4% | 92.6% | 92.8% | year 3 | 55.5% | 13.00 |
| random/guardian | 0.0% | 92.4% | 92.6% | 92.8% | year 3 | 55.5% | 13.00 |
| random/veteran | 0.0% | 92.4% | 92.6% | 92.8% | year 3 | 55.5% | 13.00 |
| screenseeker/guardian | 0.0% | 93.4% | 94.8% | 95.8% | year 3 | 54.0% | 13.00 |
| screenseeker/veteran | 0.0% | 93.4% | 94.8% | 95.8% | year 3 | 54.0% | 13.00 |

## T4a. Event slots (one event or none per event month) — mixed player, pooled

Candidates = events eligible at the moment the slot opens (window, rival year, condition, chain open, not met) before the last year's memory is applied; a follow-up that takes the slot counts as 1.

| month | season | events in window | mean candidates | min | p10 | median | none | <=1 | <=2 | mean after memory | memory empties pool | follow-up takes slot | first-marked takes slot |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2 | spring | 3 | 3.00 | 3 | 3 | 3 | 0.0% | 0.0% | 0.0% | 1.99 | 0.0% | 0.0% | 0.0% |
| 4 | summer | 12 | 7.27 | 4 | 4 | 8 | 0.0% | 0.0% | 0.0% | 5.22 | 0.0% | 0.0% | 0.0% |
| 6 | summer | 14 | 6.85 | 1 | 2 | 7 | 0.0% | 6.6% | 15.3% | 5.39 | 2.2% | 0.0% | 0.0% |
| 8 | autumn | 20 | 1.10 | 0 | 1 | 1 | 0.1% | 98.2% | 98.2% | 1.08 | 0.5% | 96.5% | 0.0% |
| 10 | winter | 17 | 1.97 | 0 | 1 | 1 | 1.4% | 76.9% | 77.0% | 1.72 | 0.0% | 75.4% | 0.0% |
| 12 | winter | 18 | 1.44 | 0 | 1 | 1 | 0.6% | 82.3% | 83.1% | 1.34 | 0.1% | 1.8% | 79.5% |

## T4b. Event slots in detail — who can fill each slot, and what keeps the rest out (mixed, pooled)


**Month 2** (20000 slot-years). Candidate = in the pool when the slot opened; chosen = actually shown.

| event | candidate | chosen | what keeps it out otherwise |
|---|---|---|---|
| mum_sunday | 100.0% | 33.1% | left out: met last year 34% |
| producer_room | 100.0% | 33.3% | left out: met last year 34% |
| sam_rent | 100.0% | 33.5% | left out: met last year 34% |

**Month 4** (20000 slot-years). Candidate = in the pool when the slot opened; chosen = actually shown.

| event | candidate | chosen | what keeps it out otherwise |
|---|---|---|---|
| casting_arc | 100.0% | 14.3% | left out: met last year 28% |
| juno_hello | 100.0% | 32.2% | left out: met last year 31% |
| mum_sunday | 66.9% | 6.8% | left out: met last year 34%; already met this year 33% |
| producer_room | 66.7% | 7.0% | left out: met last year 34%; already met this year 33% |
| sam_rent | 66.5% | 6.8% | left out: met last year 34%; already met this year 34% |
| ex_feature | 54.8% | 5.7% | condition: hype>=15 45%; left out: met last year 4% |
| fake_ad | 54.8% | 5.3% | condition: hype>=15 45%; left out: met last year 11% |
| photographer | 54.8% | 6.5% | condition: hype>=15 45%; left out: met last year 5% |
| reality_show | 54.8% | 5.8% | condition: hype>=15 45%; left out: met last year 9% |
| guest_judge | 44.8% | 4.2% | condition: hype>=20 55%; left out: met last year 8% |
| charity_song | 31.6% | 2.6% | condition: hype>=25 68%; left out: met last year 4% |
| panel_show | 31.6% | 2.8% | condition: hype>=25 68%; left out: met last year 4% |

**Month 6** (20000 slot-years). Candidate = in the pool when the slot opened; chosen = actually shown.

| event | candidate | chosen | what keeps it out otherwise |
|---|---|---|---|
| casting_arc | 85.7% | 17.5% | left out: met last year 26%; already met this year 14% |
| fake_ad | 75.1% | 10.9% | condition: hype>=15 20%; left out: met last year 15% |
| reality_show | 74.6% | 11.5% | condition: hype>=15 20%; left out: met last year 13% |
| director_read | 70.2% | 9.6% | condition: hype>=20 30%; left out: met last year 8% |
| guest_judge | 66.0% | 8.2% | condition: hype>=20 30%; left out: met last year 12% |
| charity_song | 57.1% | 6.6% | condition: hype>=25 40%; left out: met last year 8% |
| panel_show | 56.8% | 6.1% | condition: hype>=25 40%; left out: met last year 8% |
| juno_hello | 35.1% | 6.7% | chains full 33%; already met this year 32% |
| juno_interview | 32.2% | 10.1% | condition: flags: needs one of juno_cowrite,juno_declined 68% |
| ex_feature | 30.8% | 3.0% | chains full 44%; condition: hype>=15 20% |
| photographer | 30.8% | 3.8% | chains full 43%; condition: hype>=15 20% |
| sam_rent | 23.5% | 1.9% | already met this year 40%; chains full 36% |
| producer_room | 23.4% | 2.1% | already met this year 40%; chains full 36% |
| mum_sunday | 23.3% | 1.9% | already met this year 40%; chains full 37% |

**Month 8** (20000 slot-years). Candidate = in the pool when the slot opened; chosen = actually shown.

| event | candidate | chosen | what keeps it out otherwise |
|---|---|---|---|
| lio_track | 31.2% | 31.2% | condition: flags: needs lio_session 61%; a follow-up took the slot 7% |
| sam_interview | 26.1% | 26.1% | condition: flags: needs sam_refused 59%; a follow-up took the slot 6% |
| mum_quiet | 21.0% | 21.0% | condition: flags: needs missed_dinner 75%; a follow-up took the slot 3% |
| mum_gran | 13.2% | 13.2% | condition: flags: needs went_home 83%; a follow-up took the slot 4% |
| sam_band | 2.7% | 2.7% | condition: flags: needs sam_lent 97%; a follow-up took the slot 1% |
| sam_payback | 2.1% | 2.1% | condition: flags: needs sam_half 97%; a follow-up took the slot 1% |
| casting_arc | 2.1% | 1.1% | a follow-up took the slot 66%; already met this year 32% |
| juno_interview | 1.6% | 0.9% | condition: flags: needs one of juno_cowrite,juno_declined 61%; a follow-up took the slot 27% |
| director_read | 1.5% | 0.3% | a follow-up took the slot 73%; condition: hype>=20 15% |
| guest_judge | 1.5% | 0.2% | a follow-up took the slot 71%; condition: hype>=20 15% |
| reality_show | 1.4% | 0.3% | a follow-up took the slot 72%; already met this year 17% |
| fake_ad | 1.4% | 0.2% | a follow-up took the slot 73%; already met this year 16% |
| panel_show | 1.4% | 0.2% | a follow-up took the slot 67%; condition: hype>=25 22% |
| charity_song | 1.4% | 0.2% | a follow-up took the slot 67%; condition: hype>=25 22% |
| ex_feature | 0.4% | 0.0% | chains full 67%; a follow-up took the slot 15% |
| juno_hello | 0.4% | 0.1% | chains full 45%; already met this year 39% |
| mum_sunday | 0.4% | 0.0% | chains full 48%; already met this year 42% |
| photographer | 0.4% | 0.1% | chains full 65%; a follow-up took the slot 15% |
| photographer_again | 0.1% | 0.1% | condition: flags: needs tipped_off 93%; a follow-up took the slot 7% |
| producer_room | 0.0% | 0.0% | chains full 47%; already met this year 42% |
| sam_rent | 0.0% | 0.0% | month window 58%; already met this year 42% |

**Month 10** (20000 slot-years). Candidate = in the pool when the slot opened; chosen = actually shown.

| event | candidate | chosen | what keeps it out otherwise |
|---|---|---|---|
| juno_soundalike | 30.1% | 30.1% | condition: flags: needs juno_declined 68%; a follow-up took the slot 1% |
| director_read | 19.6% | 4.4% | a follow-up took the slot 61%; already met this year 10% |
| charity_song | 18.7% | 3.3% | a follow-up took the slot 58%; condition: hype>=25 13% |
| panel_show | 18.7% | 3.3% | a follow-up took the slot 58%; condition: hype>=25 13% |
| guest_judge | 17.6% | 3.5% | a follow-up took the slot 61%; already met this year 13% |
| fake_ad | 16.5% | 3.0% | a follow-up took the slot 62%; already met this year 16% |
| reality_show | 16.3% | 3.5% | a follow-up took the slot 61%; already met this year 18% |
| casting_arc | 14.1% | 2.3% | a follow-up took the slot 53%; already met this year 31% |
| sam_interview | 8.2% | 8.2% | condition: flags: needs sam_refused 61%; already met this year 26% |
| juno_credit | 8.1% | 8.1% | condition: flags: needs juno_cowrite 90%; a follow-up took the slot 0% |
| photographer_again | 7.3% | 7.3% | condition: flags: needs tipped_off 91%; already met this year 0% |
| lio_track | 7.2% | 7.2% | condition: flags: needs lio_session 61%; already met this year 31% |
| ex_reply | 5.8% | 5.8% | condition: flags: needs told_all 93% |
| mum_gran | 4.2% | 4.2% | condition: flags: needs went_home 81%; already met this year 13% |
| mum_quiet | 3.5% | 3.5% | condition: flags: needs missed_dinner 75%; already met this year 21% |
| sam_payback | 0.6% | 0.6% | condition: flags: needs sam_half 96%; already met this year 2% |
| sam_band | 0.5% | 0.5% | condition: flags: needs sam_lent 95%; already met this year 3% |
| ex_feature | 0.0% | 0.0% | month window 90%; already met this year 9% |
| juno_hello | 0.0% | 0.0% | month window 60%; already met this year 39% |
| juno_interview | 0.0% | 0.0% | month window 88%; already met this year 11% |
| mum_sunday | 0.0% | 0.0% | month window 57%; already met this year 41% |
| photographer | 0.0% | 0.0% | month window 88%; already met this year 10% |
| producer_room | 0.0% | 0.0% | month window 57%; already met this year 42% |
| sam_rent | 0.0% | 0.0% | month window 58%; already met this year 41% |

**Month 12** (20000 slot-years). Candidate = in the pool when the slot opened; chosen = actually shown.

| event | candidate | chosen | what keeps it out otherwise |
|---|---|---|---|
| juno_unsigned | 21.1% | 21.1% | rival arc 74%; condition: flags: blocked by juno_feud 4% |
| juno_video | 20.1% | 20.1% | rival arc 75%; condition: flags: blocked by juno_feud 4% |
| juno_carpet | 20.0% | 20.0% | rival arc 75%; condition: flags: blocked by juno_feud 5% |
| juno_shortlist | 18.3% | 18.3% | rival arc 75%; condition: flags: blocked by juno_feud 4% |
| charity_song | 15.8% | 4.3% | a first-marked one-off took the slot 63%; already met this year 13% |
| guest_judge | 15.8% | 4.9% | a first-marked one-off took the slot 62%; already met this year 16% |
| panel_show | 15.7% | 4.3% | a first-marked one-off took the slot 63%; already met this year 12% |
| fake_ad | 15.7% | 4.6% | a first-marked one-off took the slot 61%; already met this year 19% |
| sam_interview | 1.0% | 1.0% | condition: flags: needs sam_refused 62%; already met this year 34% |
| juno_soundalike | 0.8% | 0.8% | condition: flags: needs juno_declined 69%; already met this year 30% |
| juno_credit | 0.0% | 0.0% | condition: flags: needs juno_cowrite 91%; already met this year 8% |
| casting_arc | 0.0% | 0.0% | month window 65%; already met this year 35% |
| director_read | 0.0% | 0.0% | month window 85%; already met this year 14% |
| ex_feature | 0.0% | 0.0% | month window 91%; already met this year 9% |
| ex_reply | 0.0% | 0.0% | condition: flags: needs told_all 94%; already met this year 6% |
| juno_hello | 0.0% | 0.0% | month window 61%; already met this year 39% |
| juno_interview | 0.0% | 0.0% | month window 89%; already met this year 11% |
| lio_track | 0.0% | 0.0% | condition: flags: needs lio_session 61%; already met this year 38% |
| mum_gran | 0.0% | 0.0% | condition: flags: needs went_home 82%; already met this year 17% |
| mum_quiet | 0.0% | 0.0% | condition: flags: needs missed_dinner 75%; already met this year 24% |
| mum_sunday | 0.0% | 0.0% | month window 58%; already met this year 42% |
| photographer | 0.0% | 0.0% | month window 89%; already met this year 10% |
| photographer_again | 0.0% | 0.0% | condition: flags: needs tipped_off 92%; already met this year 7% |
| producer_room | 0.0% | 0.0% | month window 57%; already met this year 42% |
| reality_show | 0.0% | 0.0% | month window 78%; already met this year 21% |
| sam_band | 0.0% | 0.0% | condition: flags: needs sam_lent 96%; already met this year 3% |
| sam_payback | 0.0% | 0.0% | condition: flags: needs sam_half 97%; already met this year 3% |
| sam_rent | 0.0% | 0.0% | month window 57%; already met this year 42% |

## T4c. Other pools — candidates against slots filled in a year (mixed, pooled)

| rank | pool | slot | candidates | slots filled / year | candidates per slot | note |
|---|---|---|---|---|---|---|
| 1 | doors | each season (4 slots) | 2.00 | 2.00 | 1.00 | 2/2/2/2 doors exist per season, 2 are offered: every door is offered every year |
| 2 | event month | month 8 | 1.10 | 1.00 | 1.10 | 20 events have this month in their window; median 1, <=1 candidate in 98.2%, empty 0.1%; a follow-up takes it 96.5% |
| 3 | event month | month 12 | 1.44 | 1.00 | 1.44 | 18 events have this month in their window; median 1, <=1 candidate in 82.3%, empty 0.6%; a follow-up takes it 1.8% |
| 4 | event month | month 10 | 1.97 | 1.00 | 1.97 | 17 events have this month in their window; median 1, <=1 candidate in 76.9%, empty 1.4%; a follow-up takes it 75.4% |
| 5 | once-a-run texts | 26 groups of 26 with <= 2 variants | 2.00 | 1.00 | 2.00 | one variant shown per group per year; with the last year's variant barred, a 2-variant group alternates |
| 6 | world stories | flash, season 1 | 19.00 | 7.21 | 2.64 | 19 stories can print (18 any season + 1 this season's), 7.21 printed per year in the season |
| 7 | event month | month 2 | 3.00 | 1.00 | 3.00 | 3 events have this month in their window; median 3, <=1 candidate in 0.0%, empty 0.0%; a follow-up takes it 0.0% |
| 8 | world stories | flash, season 3 | 19.00 | 5.93 | 3.21 | 19 stories can print (18 any season + 1 this season's), 5.93 printed per year in the season |
| 9 | card offers | season 1 | 24.00 | 7.10 | 3.38 | 24 draftable cards, 7.10 cards shown per year in the season (6.47 distinct) |
| 10 | world stories | marquee, season 1 | 34.00 | 10.00 | 3.40 | 34 stories can print (33 any season + 1 this season's), 10.00 printed per year in the season |
| 11 | world stories | flash, season 2 | 21.00 | 5.88 | 3.57 | 21 stories can print (18 any season + 3 this season's), 5.88 printed per year in the season |
| 12 | world stories | bside, season 2 | 32.00 | 8.89 | 3.60 | 32 stories can print (31 any season + 1 this season's), 8.89 printed per year in the season |
| 13 | world stories | bside, season 3 | 32.00 | 8.56 | 3.74 | 32 stories can print (31 any season + 1 this season's), 8.56 printed per year in the season |
| 14 | world stories | flash, season 4 | 20.00 | 5.33 | 3.75 | 20 stories can print (18 any season + 2 this season's), 5.33 printed per year in the season |
| 15 | world stories | marquee, season 3 | 34.00 | 9.03 | 3.76 | 34 stories can print (33 any season + 1 this season's), 9.03 printed per year in the season |
| 16 | world stories | marquee, season 2 | 34.00 | 9.03 | 3.77 | 34 stories can print (33 any season + 1 this season's), 9.03 printed per year in the season |
| 17 | world stories | bside, season 4 | 32.00 | 8.09 | 3.96 | 32 stories can print (31 any season + 1 this season's), 8.09 printed per year in the season |
| 18 | world stories | bside, season 1 | 32.00 | 8.05 | 3.97 | 32 stories can print (31 any season + 1 this season's), 8.05 printed per year in the season |
| 19 | card offers | season 2 | 33.00 | 8.07 | 4.09 | 33 draftable cards, 8.07 cards shown per year in the season (7.42 distinct) |
| 20 | world stories | marquee, season 4 | 34.00 | 8.09 | 4.20 | 34 stories can print (33 any season + 1 this season's), 8.09 printed per year in the season |
| 21 | card offers | season 3 | 35.00 | 8.17 | 4.29 | 35 draftable cards, 8.17 cards shown per year in the season (7.50 distinct) |
| 22 | card offers | season 4 | 36.00 | 7.93 | 4.54 | 36 draftable cards, 7.93 cards shown per year in the season (7.32 distinct) |
| 23 | scandal cards | season 2 | 6.00 | 1.30 | 4.61 | 6 scandal cards available, 1.30 crystallised per year in the season (1.03 distinct) |
| 24 | scandal cards | season 1 | 4.00 | 0.84 | 4.76 | 4 scandal cards available, 0.84 crystallised per year in the season (0.72 distinct) |
| 25 | scandal cards | season 4 | 6.00 | 0.95 | 6.29 | 6 scandal cards available, 0.95 crystallised per year in the season (0.75 distinct) |
| 26 | event month | month 6 | 6.85 | 1.00 | 6.85 | 14 events have this month in their window; median 7, <=1 candidate in 6.6%, empty 0.0%; a follow-up takes it 0.0% |
| 27 | scandal cards | season 3 | 6.00 | 0.87 | 6.93 | 6 scandal cards available, 0.87 crystallised per year in the season (0.71 distinct) |
| 28 | event month | month 4 | 7.27 | 1.00 | 7.27 | 12 events have this month in their window; median 8, <=1 candidate in 0.0%, empty 0.0%; a follow-up takes it 0.0% |

## T5. The items seen most often — mixed player

The 20 most-seen items among cards, events, scandal cards, minor endings and awards (doors, drafted cards and major endings left out; the text variants follow below). Share of years = of the 5N year-runs, the share that show the item; ties broken by "4+ of 5".

| # | type | item | share of years seen | seen in 4+ of 5 years | in 3+ of 5 |
|---|---|---|---|---|---|
| 1 | card_played | vocal_coaching | 100.0% | 100% | 100% |
| 2 | card_played | side_gig | 99.2% | 100% | 100% |
| 3 | card_played | networking | 91.5% | 94% | 99% |
| 4 | card_played | press_junket | 89.9% | 92% | 99% |
| 5 | card_played | viral_stunt | 80.8% | 75% | 95% |
| 6 | card_played | open_mic | 78.2% | 70% | 93% |
| 7 | card_played | cover_single | 77.3% | 68% | 93% |
| 8 | card_offered | sellout_ad | 64.8% | 43% | 75% |
| 9 | card_offered | tabloid_bait | 64.8% | 44% | 75% |
| 10 | card_offered | brand_deal | 64.7% | 43% | 75% |
| 11 | card_offered | viral_stunt | 64.4% | 42% | 75% |
| 12 | card_offered | demo_tape | 64.1% | 43% | 74% |
| 13 | card_offered | press_junket | 64.1% | 43% | 74% |
| 14 | card_offered | mentorship | 64.1% | 42% | 73% |
| 15 | card_offered | collab_single | 64.0% | 42% | 75% |
| 16 | card_offered | ghostwriter | 64.0% | 42% | 73% |
| 17 | card_offered | open_mic | 63.8% | 41% | 74% |
| 18 | card_offered | fan_meetup | 63.7% | 41% | 74% |
| 19 | card_offered | acting_class | 63.7% | 41% | 74% |
| 20 | card_offered | cover_single | 63.5% | 41% | 73% |

The 10 most-seen of each type (events and cards offered in full):

- **between-month events**: producer_room 42% (4+ of 5: 0%), sam_rent 42% (4+ of 5: 0%), mum_sunday 42% (4+ of 5: 0%), juno_hello 39% (4+ of 5: 0%), lio_track 38% (4+ of 5: 0%), sam_interview 35% (4+ of 5: 0%), casting_arc 35% (4+ of 5: 0%), juno_soundalike 31% (4+ of 5: 0%), mum_quiet 24% (4+ of 5: 0%), fake_ad 24% (4+ of 5: 0%), juno_unsigned 21% (4+ of 5: 1%), reality_show 21% (4+ of 5: 0%), guest_judge 21% (4+ of 5: 0%), juno_video 20% (4+ of 5: 1%), juno_carpet 20% (4+ of 5: 1%), juno_shortlist 18% (4+ of 5: 0%), mum_gran 17% (4+ of 5: 0%), charity_song 17% (4+ of 5: 0%), panel_show 17% (4+ of 5: 0%), director_read 14% (4+ of 5: 0%)
- **cards offered in drafts**: sellout_ad 65% (4+ of 5: 43%), tabloid_bait 65% (4+ of 5: 44%), brand_deal 65% (4+ of 5: 43%), viral_stunt 64% (4+ of 5: 42%), demo_tape 64% (4+ of 5: 43%), press_junket 64% (4+ of 5: 43%), mentorship 64% (4+ of 5: 42%), collab_single 64% (4+ of 5: 42%), ghostwriter 64% (4+ of 5: 42%), open_mic 64% (4+ of 5: 41%), fan_meetup 64% (4+ of 5: 41%), acting_class 64% (4+ of 5: 41%), cover_single 64% (4+ of 5: 41%), indie_label 63% (4+ of 5: 41%), street_team 63% (4+ of 5: 41%), vocal_coaching 63% (4+ of 5: 40%), screen_test 62% (4+ of 5: 39%), networking 60% (4+ of 5: 36%), apology_tour 60% (4+ of 5: 35%), lay_low 60% (4+ of 5: 35%)
- **cards played**: vocal_coaching 100% (4+ of 5: 100%), side_gig 99% (4+ of 5: 100%), networking 92% (4+ of 5: 94%), press_junket 90% (4+ of 5: 92%), viral_stunt 81% (4+ of 5: 75%), open_mic 78% (4+ of 5: 70%), cover_single 77% (4+ of 5: 68%), studio_session 58% (4+ of 5: 30%), lay_low 55% (4+ of 5: 24%), crisis_pr 47% (4+ of 5: 16%)
- **scandal cards crystallised**: copycat_story 62% (4+ of 5: 37%), tabloid_story 61% (4+ of 5: 35%), bad_press 40% (4+ of 5: 9%), public_feud 27% (4+ of 5: 2%), burnout 19% (4+ of 5: 1%), old_rumor 16% (4+ of 5: 0%)
- **minor endings**: craftsman 17% (4+ of 5: 0%), leading_role 14% (4+ of 5: 0%), character_actor 14% (4+ of 5: 0%), meltdown 12% (4+ of 5: 0%), household_name 9% (4+ of 5: 0%), tabloid_royalty 9% (4+ of 5: 0%), star 7% (4+ of 5: 0%), the_one_to_watch 3% (4+ of 5: 0%), nobody 3% (4+ of 5: 0%), the_independent 3% (4+ of 5: 0%)
- **awards**: peoples_choice 35% (4+ of 5: 5%), breakthrough_of_the_year 32% (4+ of 5: 4%), best_live_act 31% (4+ of 5: 3%), critics_choice 30% (4+ of 5: 3%), songwriter_of_the_year 28% (4+ of 5: 2%), best_collaboration 26% (4+ of 5: 2%), breakthrough_performance 21% (4+ of 5: 1%), style_icon 19% (4+ of 5: 1%), scandal_of_the_year 10% (4+ of 5: 0%), best_new_artist 10% (4+ of 5: 0%)

Text variants: how many items are seen in 99%+ of years (every year, in effect), and the first ones:

- **once-a-run texts (variant)**: 0 of 52 items in 99%+ of years; 12 in half the years or more; next: opening|story.opening.1 50%, gate:gate_label_deal|gate.label_deal.flavor.2 50%, gate:gate_festival|gate.festival.flavor.1 50%, gate:gate_residency|gate.residency.flavor.2 50%, opener:2|act.summer.opener.1 50%
- **manager's lines (variant)**: 8 of 119 items in 99%+ of years; 40 in half the years or more; next: monthEnd:guardian|manager.guardian.perk.relief.2 85%, monthEnd:guardian|manager.guardian.perk.relief.3 85%, monthEnd:guardian|manager.guardian.perk.relief.1 85%, manager:guardian:rival|manager.guardian.rival.1 75%, manager:guardian:rival|manager.guardian.rival.2 74%
- **newspaper items, every paper (variant)**: 17 of 165 items in 99%+ of years; 118 in half the years or more; next: saga|paper.flash.saga.hedge.1 99%, saga|paper.flash.saga.wedding.3 98%, world:marquee|paper.marquee.world.12 97%, world:marquee|paper.marquee.world.29 97%, saga|paper.flash.saga.wedding.2 97%
- **player's printed headlines (variant)**: 0 of 96 items in 99%+ of years; 21 in half the years or more; next: card:vocal_coaching|card.vocal_coaching.headline.4 91%, card:vocal_coaching|card.vocal_coaching.headline.2 91%, card:vocal_coaching|card.vocal_coaching.headline.3 90%, card:vocal_coaching|card.vocal_coaching.headline.1 90%, card:side_gig|card.side_gig.headline.5 73%
- **scandal in-hand lines (variant)**: 0 of 12 items in 99%+ of years; 0 in half the years or more; next: inhand:copycat_story|card.copycat_story.inhand.1 43%, inhand:copycat_story|card.copycat_story.inhand.2 43%, inhand:tabloid_story|card.tabloid_story.inhand.1 33%, inhand:tabloid_story|card.tabloid_story.inhand.2 33%, inhand:bad_press|card.bad_press.inhand.1 21%
- **events' printed answers (variant)**: 0 of 32 items in 99%+ of years; 0 in half the years or more; next: event:casting_arc:0|event.casting_arc.a.press.1 31%, event:lio_track:1|event.lio_track.b.press.1 26%, event:juno_soundalike:0|event.juno_soundalike.a.press.1 16%, event:juno_carpet:1|event.juno_carpet.b.press.1 15%, event:sam_interview:2|event.sam_interview.c.press.1 12%
- **newspaper items, the lead paper only (variant)**: 0 of 165 items in 99%+ of years; 2 in half the years or more; next: saga|paper.bside.saga.venue.1 72%, saga|paper.bside.saga.saints.1 71%, saga|paper.bside.saga.saints.2 43%, saga|paper.bside.saga.venue.2 43%, world:bside|paper.bside.world.9 43%

Doors and major endings (structural):

- **doors offered**: gate_audition 100%, gate_showcase 100%, gate_festival 100%, gate_session_work 100%, gate_label_deal 100%, gate_residency 100%, gate_arena_tour 100%, gate_award_show 100%
- **major endings**: breakthrough 33%, long_game 37%, overexposed 23%, hard_way 6%

## T6. Items seen in under 2% of years — mixed player, with the gate that keeps them out

| type | items in pool | under 2% of years | of them never seen |
|---|---|---|---|
| cards offered in drafts | 36 | 0 | 0 |
| cards drafted | 36 | 0 | 0 |
| cards played | 36 | 1 | 0 |
| between-month events | 28 | 0 | 0 |
| event chains (any step) | 6 | 0 | 0 |
| scandal cards crystallised | 6 | 0 | 0 |
| doors offered | 8 | 0 | 0 |
| doors taken | 8 | 0 | 0 |
| minor endings | 14 | 2 | 0 |
| major endings | 4 | 0 | 0 |
| awards | 12 | 0 | 0 |
| once-a-run texts (variant) | 52 | 14 | 0 |
| manager's lines (variant) | 119 | 4 | 0 |
| newspaper items, every paper (variant) | 165 | 0 | 0 |
| newspaper items, the lead paper only (variant) | 165 | 9 | 6 |
| player's printed headlines (variant) | 96 | 2 | 0 |
| scandal in-hand lines (variant) | 12 | 0 | 0 |
| events' printed answers (variant) | 32 | 7 | 0 |

**cards played** (1 of 36):

| item | share of years | gate / what keeps it out |
|---|---|---|
| world_tour | 0.54% |  |

**minor endings** (2 of 14):

| item | share of years | gate / what keeps it out |
|---|---|---|
| redemption_arc | 1.65% | overexposed: scandalDrop>=2 |
| running_on_empty | 1.76% | hard_way: anyOf=[{"holds":{"any":["burnout"]}},{"craft":{"max":34}}] |

**once-a-run texts (variant)** (14 of 52):

| item | share of years | gate / what keeps it out |
|---|---|---|
| ending:the_independent|ending.the_independent.text.1 | 1.26% | only in a year that ends as the_independent (breakthrough: (fallback)) |
| ending:the_independent|ending.the_independent.text.2 | 1.41% | only in a year that ends as the_independent (breakthrough: (fallback)) |
| ending:redemption_arc|ending.redemption_arc.text.1 | 0.80% | only in a year that ends as redemption_arc (overexposed: scandalDrop>=2) |
| ending:redemption_arc|ending.redemption_arc.text.2 | 0.85% | only in a year that ends as redemption_arc (overexposed: scandalDrop>=2) |
| ending:the_one_to_watch|ending.the_one_to_watch.text.1 | 1.44% | only in a year that ends as the_one_to_watch (long_game: lane any[celebrity]) |
| ending:the_one_to_watch|ending.the_one_to_watch.text.2 | 1.43% | only in a year that ends as the_one_to_watch (long_game: lane any[celebrity]) |
| ending:nobody|ending.nobody.text.1 | 1.38% | only in a year that ends as nobody (long_game: (fallback)) |
| ending:nobody|ending.nobody.text.2 | 1.46% | only in a year that ends as nobody (long_game: (fallback)) |
| ending:flash_in_the_pan|ending.flash_in_the_pan.text.1 | 1.01% | only in a year that ends as flash_in_the_pan (hard_way: peakHype>=75) |
| ending:flash_in_the_pan|ending.flash_in_the_pan.text.2 | 1.11% | only in a year that ends as flash_in_the_pan (hard_way: peakHype>=75) |
| ending:running_on_empty|ending.running_on_empty.text.1 | 0.85% | only in a year that ends as running_on_empty (hard_way: anyOf=[{"holds":{"any":["burnout"]}},{"craft":{"max":34}}]) |
| ending:running_on_empty|ending.running_on_empty.text.2 | 0.91% | only in a year that ends as running_on_empty (hard_way: anyOf=[{"holds":{"any":["burnout"]}},{"craft":{"max":34}}]) |
| ending:starting_over|ending.starting_over.text.1 | 1.11% | only in a year that ends as starting_over (hard_way: (fallback)) |
| ending:starting_over|ending.starting_over.text.2 | 1.16% | only in a year that ends as starting_over (hard_way: (fallback)) |

**manager's lines (variant)** (4 of 119):

| item | share of years | gate / what keeps it out |
|---|---|---|
| manager:veteran:first_scandal.high|manager.veteran.first_scandal.high.1 | 1.02% | veteran's line for the trigger "first_scandal.high" |
| manager:veteran:first_scandal.high|manager.veteran.first_scandal.high.2 | 1.06% | veteran's line for the trigger "first_scandal.high" |
| manager:guardian:first_scandal.high|manager.guardian.first_scandal.high.1 | 0.87% | guardian's line for the trigger "first_scandal.high" |
| manager:guardian:first_scandal.high|manager.guardian.first_scandal.high.2 | 0.93% | guardian's line for the trigger "first_scandal.high" |

**newspaper items, the lead paper only (variant)** (9 of 165):

| item | share of years | gate / what keeps it out |
|---|---|---|
| spillover:bside|paper.bside.spillover.1 | 0.00% | bside: frenzy spill-over (a month with 2+ scandals, spilling to the other papers from fame tier 3) |
| spillover:bside|paper.bside.spillover.2 | 0.00% | bside: frenzy spill-over (a month with 2+ scandals, spilling to the other papers from fame tier 3) |
| spillover:bside|paper.bside.spillover.3 | 0.00% | bside: frenzy spill-over (a month with 2+ scandals, spilling to the other papers from fame tier 3) |
| world:marquee|paper.marquee.world.21 | 0.36% | world story in marquee |
| spillover:marquee|paper.marquee.spillover.1 | 0.00% | marquee: frenzy spill-over (a month with 2+ scandals, spilling to the other papers from fame tier 3) |
| spillover:marquee|paper.marquee.spillover.2 | 0.00% | marquee: frenzy spill-over (a month with 2+ scandals, spilling to the other papers from fame tier 3) |
| spillover:marquee|paper.marquee.spillover.3 | 0.00% | marquee: frenzy spill-over (a month with 2+ scandals, spilling to the other papers from fame tier 3) |
| saga|paper.marquee.saga.sequel.1 | 1.24% | a world saga's beat in its season |
| saga|paper.marquee.saga.streamer.1 | 1.28% | a world saga's beat in its season |

**player's printed headlines (variant)** (2 of 96):

| item | share of years | gate / what keeps it out |
|---|---|---|
| card:world_tour|card.world_tour.headline.1 | 0.27% | card world_tour played |
| card:world_tour|card.world_tour.headline.2 | 0.27% | card world_tour played |

**events' printed answers (variant)** (7 of 32):

| item | share of years | gate / what keeps it out |
|---|---|---|
| event:sam_band:0|event.sam_band.a.press.1 | 1.67% | answer 0 to event sam_band (needs the event, then that answer) |
| event:sam_payback:1|event.sam_payback.b.press.1 | 1.44% | answer 1 to event sam_payback (needs the event, then that answer) |
| event:sam_interview:1|event.sam_interview.b.press.1 | 1.21% | answer 1 to event sam_interview (needs the event, then that answer) |
| event:ex_feature:1|event.ex_feature.b.press.1 | 0.80% | answer 1 to event ex_feature (needs the event, then that answer) |
| event:ex_reply:1|event.ex_reply.b.press.1 | 0.16% | answer 1 to event ex_reply (needs the event, then that answer) |
| event:juno_interview:1|event.juno_interview.b.press.1 | 1.62% | answer 1 to event juno_interview (needs the event, then that answer) |
| event:photographer_again:1|event.photographer_again.b.press.1 | 0.46% | answer 1 to event photographer_again (needs the event, then that answer) |

Under 5% of years for the mixed player, with the best single strategy's rate (both managers pooled) — the items nobody reaches are those under 2% for every strategy:

| type | item | mixed, share of years | best strategy |  | gate |
|---|---|---|---|---|---|
| between-month events | sam_band | 3.22% | 14.77% (random) |  | months 8-12; flags all[sam_lent]; sam:followUp |
| between-month events | sam_payback | 2.71% | 14.28% (random) |  | months 8-12; flags all[sam_half]; sam:followUp |
| cards played | sellout_ad | 4.98% | 33.06% (celebseeker) |  |  |
| cards played | world_tour | 0.54% | 7.09% (hypechaser) |  |  |
| minor endings | the_independent | 2.66% | 8.10% (minmaxer) |  | breakthrough: (fallback) |
| minor endings | redemption_arc | 1.65% | 8.00% (comeback) |  | overexposed: scandalDrop>=2 |
| minor endings | the_one_to_watch | 2.87% | 11.53% (random) |  | long_game: lane any[celebrity] |
| minor endings | nobody | 2.84% | 14.68% (random) |  | long_game: (fallback) |
| minor endings | flash_in_the_pan | 2.13% | 7.94% (random) |  | hard_way: peakHype>=75 |
| minor endings | running_on_empty | 1.76% | 7.90% (random) |  | hard_way: anyOf=[{"holds":{"any":["burnout"]}},{"craft":{"max":34}}] |
| minor endings | starting_over | 2.27% | 9.77% (random) |  | hard_way: (fallback) |
| awards | most_promising_newcomer | 4.87% | 24.48% (random) |  | (only when no other is won) |

## T7. Endings and awards across five years — mixed player

Distinct minor endings seen in five years:

| distinct | share of sequences |
|---|---|
| 2 | 2.1% |
| 3 | 20.8% |
| 4 | 49.1% |
| 5 | 28.0% |

Distinct major endings:

| distinct | share of sequences |
|---|---|
| 1 | 1.1% |
| 2 | 30.0% |
| 3 | 58.6% |
| 4 | 10.4% |

Same minor ending 3 or more times in five years: **11.8%**; all five years the same minor: 0.0%; same major 3 or more times: 57.3%.

Most times one minor ending came (sequences):

| times | share |
|---|---|
| 1 | 28.0% |
| 2 | 60.2% |
| 3 | 11.2% |
| 4 | 0.6% |

Distinct awards won after five years (of 12 awards, one of them the fallback):

| distinct awards | share of sequences |
|---|---|
| 2 | 0.1% |
| 3 | 0.2% |
| 4 | 1.1% |
| 5 | 5.5% |
| 6 | 12.8% |
| 7 | 22.1% |
| 8 | 27.6% |
| 9 | 21.3% |
| 10 | 8.0% |
| 11 | 1.6% |
| 12 | 0.0% |

Each award: share of years won, share of sequences that win it at least once in five years:

| award | share of years | ever in 5 years | conditions |
|---|---|---|---|
| best_new_artist | 9.92% | 40.8% | ending any[star,the_independent] |
| breakthrough_of_the_year | 32.09% | 84.5% | bestMonthHype>=20 |
| peoples_choice | 34.97% | 88.4% | hype>=105 |
| critics_choice | 29.94% | 83.3% | craft>=90 & ending not[breakthrough] |
| best_live_act | 30.69% | 84.0% | lane any[music] & passed any[gate_festival,gate_residency,gate_arena_tour] |
| songwriter_of_the_year | 28.48% | 81.4% | lane any[music] & craft>=60 |
| breakthrough_performance | 20.87% | 69.5% | lane any[screen] & hype>=80 |
| style_icon | 19.16% | 65.5% | lane any[celebrity] & hype>=80 |
| best_collaboration | 25.89% | 78.3% | flags all[juno_cowrite] |
| comeback_of_the_year | 7.72% | 33.0% | scandalDrop>=2 |
| scandal_of_the_year | 9.93% | 41.3% | scandalCount>=9 |
| most_promising_newcomer | 4.87% | 22.1% | (only when no other is won) |

Each minor ending:

| ending | share of years | ever in 5 years | major: condition |
|---|---|---|---|
| leading_role | 14.37% | 53.7% | breakthrough: lane any[screen] |
| household_name | 9.11% | 37.9% | breakthrough: lane any[celebrity] |
| star | 7.26% | 31.6% | breakthrough: lane any[music] & flags all[signed_label] |
| the_independent | 2.66% | 12.8% | breakthrough: (fallback) |
| redemption_arc | 1.65% | 8.1% | overexposed: scandalDrop>=2 |
| tabloid_royalty | 9.10% | 37.7% | overexposed: lane any[celebrity] |
| meltdown | 12.46% | 49.5% | overexposed: (fallback) |
| character_actor | 14.24% | 54.0% | long_game: craft>=55 & lane any[screen] |
| the_one_to_watch | 2.87% | 13.7% | long_game: lane any[celebrity] |
| craftsman | 17.29% | 61.1% | long_game: craft>=55 |
| nobody | 2.84% | 13.5% | long_game: (fallback) |
| flash_in_the_pan | 2.13% | 10.3% | hard_way: peakHype>=75 |
| running_on_empty | 1.76% | 8.5% | hard_way: anyOf=[{"holds":{"any":["burnout"]}},{"craft":{"max":34}}] |
| starting_over | 2.27% | 10.8% | hard_way: (fallback) |

## T8. Reading the same variant twice within five years — mixed player

A group "repeats" in a sequence when one of its variants shows in two or more different years. Chance = among sequences in which the group showed in 2+ years. "Same as the year before" counts neighbouring years in which the group showed in both: how often a variant of year k-1 comes straight back in year k.

| text | groups shown | chance a group reads the same variant twice in 5 years (given shown in 2+ years) | same variant as the year before (given shown both years) |
|---|---|---|---|
| once-a-run texts (variant) | 26 | 94.3% | 0.0% |
| manager's lines (variant) | 49 | 91.1% | 77.9% |
| newspaper items, every paper (variant) | 10 | 92.4% | 83.8% |
| player's printed headlines (variant) | 43 | 93.4% | 90.7% |
| scandal in-hand lines (variant) | 6 | 93.5% | 91.7% |
| events' printed answers (variant) | 32 | 100.0% | 100.0% |

Once-a-run text groups, one by one (variants: from content):

| group | variants | sequences shown | same variant twice in 5 years | same as year before |
|---|---|---|---|---|
| ending:character_actor | 2 | 2160 | 16.3% | 0.0% |
| ending:craftsman | 2 | 2442 | 20.2% | 0.0% |
| ending:flash_in_the_pan | 2 | 413 | 0.0% | 0.0% |
| ending:household_name | 2 | 1516 | 10.9% | 0.0% |
| ending:leading_role | 2 | 2148 | 13.7% | 0.0% |
| ending:meltdown | 2 | 1978 | 10.8% | 0.0% |
| ending:nobody | 2 | 540 | 0.0% | 0.0% |
| ending:redemption_arc | 2 | 325 | 0.0% | 0.0% |
| ending:running_on_empty | 2 | 340 | 0.0% | 0.0% |
| ending:star | 2 | 1263 | 3.8% | 0.0% |
| ending:starting_over | 2 | 430 | 0.0% | 0.0% |
| ending:tabloid_royalty | 2 | 1508 | 10.2% | 0.0% |
| ending:the_independent | 2 | 513 | 5.6% | 0.0% |
| ending:the_one_to_watch | 2 | 547 | 3.8% | 0.0% |
| gate:gate_arena_tour | 2 | 4000 | 100.0% | 0.0% |
| gate:gate_audition | 2 | 4000 | 100.0% | 0.0% |
| gate:gate_award_show | 2 | 4000 | 100.0% | 0.0% |
| gate:gate_festival | 2 | 4000 | 100.0% | 0.0% |
| gate:gate_label_deal | 2 | 4000 | 100.0% | 0.0% |
| gate:gate_residency | 2 | 4000 | 100.0% | 0.0% |
| gate:gate_session_work | 2 | 4000 | 100.0% | 0.0% |
| gate:gate_showcase | 2 | 4000 | 100.0% | 0.0% |
| opener:2 | 2 | 4000 | 100.0% | 0.0% |
| opener:3 | 2 | 4000 | 100.0% | 0.0% |
| opener:4 | 2 | 4000 | 100.0% | 0.0% |
| opening | 2 | 4000 | 100.0% | 0.0% |

player's printed headlines (variant): the groups most likely to repeat a variant (groups shown in 2+ years in at least 200 sequences): card:side_gig 100%, card:vocal_coaching 100%, card:press_junket 100%, card:networking 100%, card:viral_stunt 100%, card:open_mic 100%, card:cover_single 99%, scandal:copycat_story 99%

manager's lines (variant): the groups most likely to repeat a variant (groups shown in 2+ years in at least 200 sequences): manager:guardian:checkin.long_game 100%, manager:guardian:opening 100%, manager:guardian:rival 100%, monthEnd:guardian 100%, signoff:guardian:easy 100%, manager:veteran:checkin.long_game 100%, manager:veteran:opening 100%, manager:veteran:rival 100%

newspaper items, every paper (variant): the groups most likely to repeat a variant (groups shown in 2+ years in at least 200 sequences): rival 100%, saga 100%, world:bside 100%, world:flash 100%, world:marquee 100%, filler:marquee 84%, filler:bside 77%, filler:flash 62%

scandal in-hand lines (variant): the groups most likely to repeat a variant (groups shown in 2+ years in at least 200 sequences): inhand:copycat_story 98%, inhand:tabloid_story 96%, inhand:bad_press 92%, inhand:burnout 90%, inhand:public_feud 83%, inhand:old_rumor 78%

## T9. Per year, for context — mixed player (means per year)

| per year | Y1 (new player) | Y2 | Y3 | Y4 | Y5 |
|---|---|---|---|---|---|
| cardsPlayed | 31.54 | 31.65 | 31.65 | 31.68 | 31.64 |
| offersTaken | 13.83 | 14.47 | 14.53 | 14.48 | 14.56 |
| cardsOffered | 28.32 | 32.00 | 31.94 | 32.02 | 32.06 |
| events | 5.98 | 5.98 | 5.98 | 5.98 | 5.98 |
| scandalsPrinted | 4.80 | 4.84 | 4.77 | 4.88 | 4.80 |
| scandalsCrystallised | 3.93 | 3.98 | 3.93 | 4.04 | 3.94 |

Events met in a year that the year before also met (memory working): Y2 3.0%, Y3 3.2%, Y4 3.1%, Y5 3.1%.

Strategies drawn by the mixed player (years): artisan 4034, comeback 3978, dealseeker 3964, minmaxer 4154, random 3870.

Sequences per cell: 2000. Cells: minmaxer/veteran, random/veteran, crafter/veteran, hypechaser/veteran, dealseeker/veteran, comeback/veteran, artisan/veteran, screenseeker/veteran, celebseeker/veteran, mixed/veteran, minmaxer/guardian, random/guardian, crafter/guardian, hypechaser/guardian, dealseeker/guardian, comeback/guardian, artisan/guardian, screenseeker/guardian, celebseeker/guardian, mixed/guardian.

## T10. Per cell: events per year, distinct events after 5 years, minor endings distinct, awards distinct

| cell | events / yr | distinct events after 5 | distinct minors (mean) | same minor 3+ times | distinct awards (mean) |
|---|---|---|---|---|---|
| artisan/guardian | 5.92 | 14.92 | 2.09 | 94.0% | 3.71 |
| artisan/veteran | 5.91 | 14.85 | 1.97 | 98.3% | 3.59 |
| celebseeker/guardian | 6.00 | 18.39 | 2.72 | 64.9% | 5.60 |
| celebseeker/veteran | 6.00 | 18.55 | 2.21 | 88.0% | 5.05 |
| comeback/guardian | 6.00 | 18.88 | 3.51 | 27.7% | 7.55 |
| comeback/veteran | 6.00 | 18.93 | 3.58 | 23.5% | 7.34 |
| crafter/guardian | 5.51 | 11.84 | 1.93 | 99.9% | 2.98 |
| crafter/veteran | 5.54 | 11.92 | 1.94 | 100.0% | 3.00 |
| dealseeker/guardian | 6.00 | 18.62 | 3.54 | 25.9% | 7.70 |
| dealseeker/veteran | 6.00 | 18.64 | 3.47 | 30.1% | 7.76 |
| hypechaser/guardian | 6.00 | 18.54 | 1.93 | 100.0% | 6.39 |
| hypechaser/veteran | 6.00 | 18.50 | 1.85 | 100.0% | 6.16 |
| minmaxer/guardian | 6.00 | 18.44 | 3.65 | 24.1% | 7.43 |
| minmaxer/veteran | 6.00 | 18.49 | 3.60 | 27.7% | 7.51 |
| mixed/guardian | 5.98 | 18.79 | 4.01 | 12.2% | 7.64 |
| mixed/veteran | 5.98 | 18.77 | 4.05 | 11.3% | 7.81 |
| random/guardian | 5.98 | 18.89 | 4.03 | 11.1% | 5.66 |
| random/veteran | 5.98 | 18.90 | 4.02 | 11.0% | 5.64 |
| screenseeker/guardian | 6.00 | 18.04 | 2.60 | 66.9% | 4.99 |
| screenseeker/veteran | 6.00 | 18.18 | 2.60 | 66.9% | 4.79 |
