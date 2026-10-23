# Working on Soi Talk (for Claude)

Soi Talk (soitalk.app) is a Thai-learning web app for people living in Thailand. Slogan: "Thai you'll use today." Jay (Jason Pshyk) is the founder and owner. He is not a developer: explain every change in plain English, as you would to a smart business owner.

Motto for every feature: **hook, retain, reward.** Read `docs/ui-principles.md` before touching any screen. For Instagram work, read `docs/social-content-rules.md`.

## Hard rules
- **Never push to `main`.** Work on a branch named `claude/<short-topic>` and open a pull request into `main`. Only Jay merges. Merging to `main` puts it live on soitalk.app.
- **Only work on items under "Ready" in `docs/backlog.md`**, top first, one item per run. Anything else goes under "Needs Jay" with a one-line question.
- **`npm test` must pass** before a pull request is opened. Fix what it reports; don't weaken a test to make it pass. If a test is wrong, say so in the pull request and ask Jay.
- **Thai content:** any new or changed Thai line goes in the pull request under "Needs a native check", with Thai, romanization and English. Never invent cultural claims.
- **Never commit secrets.** Keys live in Vercel and in Jay's `.env.local`, never in the repo.
- **Remove before you add.** One primary action per screen. Never show "coming soon" or anything unbuilt.

## Writing rules (anything a learner or Jay reads)
- No em dashes. Use a full stop or a comma.
- Romanization under all Thai. English first.
- Both polite endings where a line is shown: ครับ khráp (men), ค่ะ khâ / คะ khá (women, คะ in questions).
- Same words everywhere: lesson (not scene), sentences (not phrases), Say it today, Extra practice, Build sentences.
- At least 4 choices in any quiz or sentence builder. No alcohol as a default option.

## The daily loop (scheduled runs)
1. Read this file, `docs/backlog.md` and `docs/ui-principles.md`.
2. Take the top item under **Ready**. If there is none, do nothing except the summary.
3. Create `claude/<short-topic>` from `main`. Make the change.
4. Run `npm test`. Fix and repeat until it passes (at most 3 tries; if it still fails, stop and report why).
5. Screenshot every changed screen at 390x844 and 964x653 and look at them.
6. **Review panel:** ask reviewers (as sub-agents) to judge the screenshots and the change against `docs/ui-principles.md`: a Learning Scientist, a Thai Teacher, an Expat Customer (lives in Bangkok, busy, impatient), a Product Designer, and a CTO. Each gives a verdict (ship / fix first) and at most 3 changes. Make the agreed fixes, rerun `npm test`. At most 2 review rounds.
7. Push the branch and open a pull request into `main` with the GitHub REST API (`gh api repos/jayp-hash/Thai_study_companion/pulls -f title=... -f head=claude/... -f base=main -f body=...`).
8. Move the item to **Done** in `docs/backlog.md` (in the same branch), with the pull request link.
9. Write the summary (below) as the pull request body and as your final message.

## Summary format (what Jay reads)
- **What changed:** 2 to 4 plain sentences.
- **Why:** which backlog item, and which principle it serves.
- **Try it:** the Vercel preview link from the pull request.
- **Checks:** tests passed (number), review verdicts in one line each.
- **Needs from Jay:** decisions, native checks, or "nothing, ready to merge".

## Useful facts
- Next.js 14 app router, Supabase, ElevenLabs audio via `/api/speak` (only speaks course text), PostHog analytics, Vercel hosting.
- Tests start a pretend database from `tests/fixtures/db.json` (`tests/mock-supabase.js`), so no keys are needed to run them.
- Lessons live in `app/lib/scenes.js`, the lesson screen in `app/start/Start.js`, Today in `app/today/Today.js`, sentence patterns in `app/lib/patterns.js` and `app/patterns/Patterns.js`.
