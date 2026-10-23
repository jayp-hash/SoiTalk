# Soi Talk UI principles

Agreed with Jay on 21 Oct 2026; 12 to 14 added 22 Oct after the 7-day walkthrough; 15 to 16 and the audit added 22 Oct evening. Check every new screen against this list before shipping.

**Motto: hook, retain, reward.** Every feature must do at least one of these:
- **Hook:** a win in the first minute.
- **Retain:** a clear reason to come back tomorrow.
- **Reward:** something real you can now say.

1. **Everything clickable reacts to the mouse.** Every button, link, card and menu has a hover state: a colour change, lift or shadow. The current-page nav link is the only exception. A hover audit script (shim/hov.py) checks every page for this.
2. **Cards share one look.** A coloured category band sits on top, with the icon and name in uppercase. Play and turtle buttons are always top left. Word cards, topic cards, pattern cards and lesson speech cards all follow this. There are no smaller second-class versions.
3. **Instructions are one-time hints, not permanent text.** Show a bright hint on first visit that points at the thing to tap. It goes away after the first use or when closed, and stays gone on replays. Never leave a centred instruction line above the content.
4. **Settings apply everywhere.** For example, "English sentence: Blur" blurs every practice sentence in the app: word cards, patterns, Today's pattern and lessons. Tap the blur to reveal the sentence. Quiz answers are never blurred.
5. **Nothing jumps.** Swapping content fades in place. Cards keep a steady height, with room reserved for the longest content at that level. Anything that appears after you answer (the words, "It was…", Continue) has its space kept from the start. Never use autoFocus: it scrolls the page. Focus with preventScroll instead.
6. **Fit the screen.** The whole card, including its main button, is visible without scrolling on a laptop window (964 x 653) and on phones (390 x 844, 360 x 640). Tiles stay on one row. Where a lesson step can't fit (a two-part conversation), the main button sticks to the bottom of the screen so it is always in view.
7. **Don't distract at the start.** The start of a lesson shows only the goal and Start. Progress (the street meter, and how much of the 1,083 words are known) comes after the lesson, in the progress pop-up.
8. **One message per number.** The same count is never shown twice on one screen.
9. **Brand colour is limited.**
   - Navy #0E2E63 is for headers and main buttons.
   - Soi blue is for accents only.
   - Green is for places only (the district plate, the other speaker's band).
   - Gold is for "your turn", "Say it today" and milestones only. Never use gold for information, such as marking new words.
10. **Romanization goes under all Thai, there are no em dashes, and copy is English-first.**
11. **The same job always uses the same control.** Levels are always the Level dropdown plus a "?" button, the same as on the Patterns page. Patterns are always the pattern dropdown (on phone) or the sidebar (on desktop). Never invent a new control (pills, tabs, sliders) for something that already has one, including in mockups.
12. **One finish line a day.**
    - The lesson is the day.
    - The Done screen has one main button, "Done for today".
    - Today and the Word library then say "Done for today ✓" and stay done.
    - Extra practice (words, building sentences) is clearly optional and never shown as a new goal. After extra practice, the progress pop-up closes back onto that same Today screen, never a second "done" page.
13. **One primary action per screen. Remove before you add.** If a screen has more than one thing asking to be tapped first, cut, merge or fold something away. Design quality must hold when things are removed.
14. **Never show anything unbuilt.** No "coming soon" or "coming next". If something isn't ready, leave it out.
15. **One shuffle button, not one per word.** A sentence builder has a single Shuffle button beside play and slow. Each tap changes one or more words and gives a sentence you haven't made yet. Tapping a word plays it and reveals its meaning, the same as in lessons.
16. **Learning principle: at least 4 choices.** Every shuffler, card set and quiz slot offers at least 4 words. Words the learner knows come first; if there are fewer than 4, useful new words fill the gap (and are taught by the practice). Alcohol is never a default or a fill-in, since some learners don't drink. (lib/patterns.js shuffleOptions, MIN_OPTIONS.)

## How we check (automated, on every push)
- **`npm test`** runs the checks in `tests/` (they also run on GitHub for every push):
  - `tests/e2e/screens.spec.js`: every main screen at 390x844, 360x640, 964x653 and 1440x800. Fails on sideways scroll, anything sticking out, or the main button below the screen.
  - `tests/e2e/lessons.spec.js`: walks every lesson to the Done screen and checks every step.
  - `tests/e2e/today.spec.js`: a practice session with the sentence-pattern block. Fails if answering moves the page, or if the progress pop-up doesn't close onto Today.
  - `tests/content.spec.js`: no em dashes, never "coming soon", and every lesson has a mission and a teaser.
- Screenshot every changed screen at phone and laptop size and look at it before sending.
- **Lessons:** where a step is taller than the screen (two-part conversations), the main button sticks to the bottom of the screen and the content scrolls under it (23 Oct).

## Words we use (one vocabulary)
- **lesson:** not "scene"
- **sentences:** not "phrases"
- **Say it today:** the one line to use in real life
- **I said it to someone**
- **Extra practice (optional)**
- **Practise words**
- **Build sentences:** the Patterns feature
- **Shuffle:** the sentence-builder button
- **Practice done:** the pop-up after extra practice (not "Lesson complete")
- **Tomorrow:**

## Coverage claim
"The 1,083 words make up about 78% of everyday spoken Thai." This comes from the app's own Zipf model (lib/words.js coverageCurve), the same model the street meter uses. For comparison, the most common 1,000 word families cover roughly 80–85% of spoken English (Nation, 2006). Recheck the figure if the word list changes. It is computed live, so it updates on its own.
