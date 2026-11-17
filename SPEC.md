# From Apples to Black Holes: build plan and checkpoint

**What it is.** A simulations-only site for a friend with no high-school physics or maths who has been reading
Hawking and Neil deGrasse Tyson and wants to find out whether astrophysics is for him. A tutor sits with him and they
explore together; he can also come back alone. The goal is curiosity and confidence, not exams: no flashcards, quizzes,
progress tracking or session history. Each block links a formula to a live simulation.

**Status and resuming.** The checklist at the bottom is the source of truth. Each finished block is committed and
pushed together with its tick here, so a fresh session can pick up at the first unticked box. Private tutor notes
(misconceptions, good questions) live in the git-ignored `tutor-notes.md`, one section per block.

## Decisions (grilling rounds 1–2)

| Topic | Decision |
| --- | --- |
| Use | Both side by side with the tutor and alone: each block stands alone, short on the surface, with expanders. |
| Devices | Laptop only (1280–1440 px). No phone or tablet layouts. |
| Shape | Home → three level pages. Each level is one scrolling page of blocks in story order, with a sticky contents list and a link to every block (`#/beginner/newtons-cannon`). Off-screen sims pause. |
| Block anatomy | Hook → brief explanation → formula three ways → sim → what-ifs + challenge → maths asides → go deeper → closing line to the next block. |
| Hooks | A physicist's question, pitched at an adult ("Why don't bodies always collapse into each other?"), never a kid-style one ("Why doesn't the Moon fall down?"). |
| Formula, three ways | In symbols; read out in plain English; **live**, with the current slider values plugged in. Each symbol keeps one colour across formula, slider and picture (`\ca{}`…`\cf{}` → `--m1`…`--m6`). |
| Prompts | "What if…?" cards with predict-first ("Lock in my guess" → "Show me" puts the sim in that state). An occasional "Can you…?" challenge the sim checks itself. Nothing is scored or saved. |
| Tutor notes | Not in the site: a brief git-ignored markdown file. |
| Maths gap | Two toolkit blocks open Beginner (powers of ten; arrows/vectors) + "Maths aside" expanders where an idea is first needed. Rate of change and adding up slices get their moment in "Speed is a slope". |
| Calculus notation | Beginner: Δ only (as on the formula sheet). Medium: introduce d/dt and ∫ as "the Δ idea with the slices shrunk to nothing", with a shrink-the-step slider. Advanced: free use, always with a plain-English reading. |
| Realism | Real equations and real SI numbers (formula-sheet constants). Pictures labelled when not to scale; time warp labelled ("1 s here = 10 min"). Presets for real bodies; sliders may go past reality for what-ifs ("fantasy"). |
| Newton's laws | Woven into Beginner: 1st and 2nd in "A push in empty space", 3rd in "The stranded astronaut" and again in "Newton's gravity"; 2nd recurs (e.g. the heavy cannonball). |
| Special relativity | Two blocks at the end of Medium, built carefully. Every number says whose clock or ruler measured it. Light clock: time dilation from Pythagoras, muons as the real-world anchor, length contraction in "Go deeper". Space-time diagrams: worldlines, light at 45°, elapsed time = "length" of a worldline (minus-sign Pythagoras), the travelling twin's bent path is *shorter*, toggle for "now" lines tilting and jumping at the turnaround. |
| Dancing partners | 3D, glowing trails, mass sliders, "watch from": centre of mass (ellipses) / riding with one body / drifting through the galaxy (corkscrews, like the viral helical-solar-system GIF). Accurate version: solar-system preset with the real ~60° tilt between orbital plane and direction of travel; "Go deeper" explains what the viral animation gets wrong ("vortex" dragging, 90° tilt) and that real corkscrews are stretched ~50:1. |
| Advanced | Anatomy of a black hole; Falling in (time dilation t = t₀/√(1 − r_s/r), spaghettification); Black holes aren't black (Hawking radiation). Anchor formulas r_s = 2GM/c² and gravitational time dilation. No "chapter X of your book" lines. |
| 3D | Allowed where depth earns its keep (Dancing partners for sure; gravity well and black holes likely), weighing intuition gained against build cost. 2D where a side view is clearer. |
| Name | From Apples to Black Holes. |
| Hosting | Single offline `index.html` committed to the repo, plus GitHub Pages (public repo) via `.github/workflows/pages.yml`. |
| Git | Work on `main`, commit and push after every block (checkpoint). |
| Build order | Slice first (shell + "Speed is a slope" + "Newton's cannon"), user review, then the rest. |
| Defaults | METR/MECH engine reused (React 18 + TS + esbuild → one file, KaTeX), only the sim kit kept. Formula-sheet notation and constants. Australian spelling, warm second person. Dark "space" theme default with light toggle (the only thing stored). Developer-only `npm test` of the physics. |

## Architecture

```
src/
  App.tsx, main.tsx          shell: top bar (levels, theme), home or level page
  app/router.ts              #/ , #/<level>, #/<level>/<block>
  app/settings.ts            theme (localStorage 'apples.theme'; dark by default)
  content/types.ts           BlockDef, LevelDef
  content/levels.ts          the three levels, blocks in story order (planned ones as stubs)
  pages/Home.tsx, LevelPage.tsx
  blocks/<level>/<Name>.tsx  one file per block: the Sim component (formulas, sim, what-ifs) + its BlockDef text
  physics/                   pure, tested physics (SI units): constants, kinematics, gravity (+ orbit integrator)
  ui/kit.tsx                 Slider, Readout(s), Segmented, Button, Callout, More, Legend, SimLayout (from METR/MECH)
  ui/blockkit.tsx            Formula (three ways), Formulas, SimTags, WhatIfs, Challenge, num(), sci()
  ui/WhatIf.tsx              predict-first card (adapted PredictReveal, nothing recorded)
  ui/Rich.tsx                $TeX$, **bold**, lists; colour macros \ca … \cf
  plot/Plot.tsx              SVG plots (Line, Area, Poly, Dot, HLine, VLine, LivePath …)
  anim/hooks.ts              useRaf (pauses off-screen / hidden tab), useWidth, useFrameThrottled
  styles/theme.css           palette; .space panels keep the dark palette in both themes
  styles/kit.css             reused component styles;  styles/site.css  shell, level page, blocks
tests/                       harness.ts + *.test.ts (physics checks against known values)
scripts/                     build.mjs (→ index.html), serve.mjs (port 5180), test.mjs, typecheck.mjs
```

Conventions: Rich strings use `$…$` TeX; in JSX attribute strings backslashes are literal (`tex="\ca{v}"`), in JS
strings and template literals double them (`'\\ca{v}'`) or use `String.raw`. Per-frame animation goes through refs
inside `useRaf`, never React state, when the scene is heavy (see Newton's cannon). `npm run check` = typecheck +
tests + build. Preview: `.claude/launch.json` → `node scripts/serve.mjs` on port 5180.

## Block checklist

Beginner (high school)
- [ ] 1 Powers of ten (toolkit)
- [ ] 2 Arrows: velocity has a direction (toolkit)
- [x] 3 Speed is a slope, distance is an area
- [ ] 4 A push in empty space (Newton 1 & 2)
- [ ] 5 The stranded astronaut (momentum, Newton 3, rockets)
- [ ] 6 Energy: the currency of motion
- [ ] 7 Projectiles on other worlds
- [ ] 8 Going in circles
- [ ] 9 Newton's gravity (Newton 3 again)
- [x] 10 Newton's cannon
- [ ] 11 Kepler's third law: weighing the Sun

Medium (first-year uni)
- [ ] 1 How computers predict orbits (introduces d/dt and ∫)
- [ ] 2 Orbits are ellipses
- [ ] 3 Dancing partners (3D, frames, helices)
- [ ] 4 To catch up, slow down (Hohmann)
- [ ] 5 Gravity assists
- [ ] 6 Tides and the Roche limit
- [ ] 7 Gravity wells and dark stars (escape velocity, ∫ of work)
- [ ] 8 The light clock (SR)
- [ ] 9 Space-time diagrams and the twin paradox (SR)

Advanced
- [ ] 1 Anatomy of a black hole
- [ ] 2 Falling in
- [ ] 3 Black holes aren't black (Hawking radiation)

Milestones
- [x] Slice built: shell + blocks B3 and B10 (verified in the browser: dark + light themes, deep links, what-if
      "Show me", orbit/escape/landing shots, no console errors)
- [ ] Slice reviewed by the user
- [ ] GitHub Pages switched on (needs the user: Settings → Pages → Source: GitHub Actions; the workflow already
      skips the deploy until then, and deploys automatically on the next push after it is on)
