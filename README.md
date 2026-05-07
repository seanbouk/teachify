# Teachify

Stuff worth learning by heart. 🧠💪🩵

A small static site for rote-learning anything you can write as a
question and an answer — times tables, capital cities, Henry VIII's
wives, NATO callsigns, your friends' birthdays. Pick a built-in quiz
or drop in your own `.txt` file.

**Live:** https://seanbouk.github.io/teachify/

## How it works

- Each quiz is a plain Markdown `.txt` file. The app only reads
  fenced ` ```q ` blocks; everything else is ignored prose, so authors
  can sprinkle freeform notes anywhere without breaking anything.
- Multiple-choice play. Pick the right answer and a green "answer
  pill" rises from the click; pick a wrong one and it shakes red until
  you tap the highlighted correct option.
- Per-question probability decays as you get it right, recovers when
  you get it wrong. Once a question is "learned" (its odds fall below
  the threshold), the next un-pooled question joins the pool. Nothing
  ever leaves the pool.
- Wrong picks remember which decoy you chose so it shows up more often
  next time you see that question.
- Progress is local to your browser. You can download a `.json`
  backup from the manage menu or share the quiz file itself via the
  Web Share API on mobile / direct download on desktop.

## Quiz file format

Authors write a Markdown file. Two block types matter:

````markdown
```meta
title: Capital Cities of Europe
description: A practice quiz on European capitals.
color: cyan
author: Sean
```

# Capital Cities of Europe

Anything you write outside the `q` and `meta` blocks is ignored, so
you can leave instructions, sources, or random notes here without
worrying about them.

```q
France 🇫🇷?
Paris
#id: france
```

```q
Switzerland 🇨🇭?
Bern
#id: switzerland
#alt: Berne
```
````

Recognised `meta` keys (all optional):
- `title` — quiz title shown on the home grid
- `description` (or `desc`) — one-line blurb
- `color` — card accent: `cyan`, `pink`, `mint`, `purple`, `orange`,
  `rose`, `yellow`, `sky`, plus aliases (`green`, `violet`, `red`,
  `amber`, `blue`); or any 3/6-digit hex
- `author` — informational

Inside a `q` block:
- First non-meta line: the question
- Second non-meta line: the answer
- Optional `#id: short-label` keeps progress stable across edits — if
  you fix a typo in the question, progress sticks because the id
  hasn't changed
- Optional `#alt: another correct form` accepts alternative spellings;
  multiple `#alt:` lines are fine

If you skip the `meta` block, the parser falls back to the first `#`
heading as the title and the first paragraph after it as the
description, so a "just write a normal Markdown study sheet" file
still works.

## Run it locally

```sh
npm install
npm run dev
```

Then open the printed URL. Hot-reload is on; tweak a quiz file in
`public/quizzes/` and it shows up immediately.

```sh
npm run build
```

Builds the static site to `dist/`.

## Deployment

GitHub Pages, via `.github/workflows/deploy.yml`. Pushes to `main`
build with Vite and ship the `dist/` artifact through
`actions/deploy-pages`. The Pages source needs to be set to **GitHub
Actions** (not "Deploy from a branch") in repo settings.

## Project layout

```
public/quizzes/        starter quiz files + manifest.json
scripts/               one-shot generators for the longer quizzes
src/
  parser.js            .txt -> { title, description, meta, questions }
  selector.js          pool, probability, threshold, expansion
  distractors.js       wrong-option picker with confusion bias
  progress.js          per-quiz localStorage save / download / upload
  catalog.js           built-in fetch + user uploads + share/wrap
  order.js             home-screen ordering + auto-promote
  reorder.js           drag-to-reorder helper
  main.js              hash routing + screen orchestration
  ui/
    home.js            quiz grid
    play.js            question screen
    manage.js          per-quiz manage panel
    dom.js             el() builder
  style.css            single mid-grey theme
```

## Adding a built-in quiz

1. Drop a `<name>.txt` file into `public/quizzes/`.
2. Add the filename to `public/quizzes/manifest.json`.
3. Push.

That's it. No code changes; the parser handles it.
