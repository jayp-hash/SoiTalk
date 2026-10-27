# Soi Talk backlog

Jay owns this list. Claude works only on items under **Ready**, top first, one item per run.
To add something, write one line under **Ready** (or under **Needs Jay** if a decision is missing).
When an item is done, Claude moves it to **Done** with the pull request link.

## Ready
1. **Lesson test on every size.** The lesson walk runs every lesson on a phone but only some on the small phone and the laptop. Run all lessons at all three sizes once the run time allows (under 10 minutes on GitHub).

## Needs Jay
- **Journey 1 (metro check-in):** answer the 4 questions on the board, then build Quick practice, Replay a lesson, and a quick check after a new-words-only session.
- **Landing headline** still says "Thai for the street you live on". Change it to match the slogan "Thai you'll use today"?
- **Native check** of lessons 1 to 10 (Thai lines, romanization, endings).

## Done
- 27 Oct: the "er" rule (Jay; Thai teacher + expat panel): the vowel in เดิน, เงิน, เจอ is written er everywhere (dern, ngern, jer, phêrm, bpèrt, yér, maaw-dter-sai), and เ-ย is oei (เคย khoei, เลย loei). Short and long are not told apart. Course, Say it today, test word list and the import script all follow it; a test fails if "oe" comes back. Live word list follows after the next import. Also นึง is nùeng.
- 27 Oct: pre-launch polish from the 26 Oct review: navy main and play buttons everywhere, Classifiers list corners fixed, no "0 known" on Words, landing no longer promises day-coloured streaks; analytics: one person across devices (PostHog identify), Google and email-link sign-ins counted, "Yes, I said it" on Today counted, calendar reminder taps and the landing reason picker counted. Slot machine test made steadier.
- 26 Oct: romanization as Jay picked: the "oi" sound is written oi everywhere (nói, nít-nòi, à-ròi, rói, soi), and เดียว diao, แก้ว gâaew, ตั๋ว dtǔaa, อันนี้ an-níi, เลี้ยวซ้าย líaao sáai, วินมอเตอร์ไซค์ win maaw-dtoe-sai. The import script now does the same, so the live word list matches after the next import ([PR #4](https://github.com/jayp-hash/SoiTalk/pull/4)).
- 25 Oct: romanization check in the tests: flags any Thai word romanized two ways; 8 current ones listed for Jay ([PR #4](https://github.com/jayp-hash/SoiTalk/pull/4)).
- 23 Oct: Word library banner says "Done for today ✓" with the Tomorrow line once today's lesson is done, matching Today ([PR #1](https://github.com/jayp-hash/SoiTalk/pull/1)).
- 23 Oct: every lesson step keeps its main button in view (sticky on long steps); automated tests added to the repo; fonts served from the app instead of Google.
