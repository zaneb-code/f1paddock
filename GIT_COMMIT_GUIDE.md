# Git & GitHub guide — Phase 1

Puts the project on GitHub with a readable commit history instead of one "final project"
commit. 24 commits, grouped by what they build.

Delete this file before you submit if you would rather the repo only held the project.

---

## Step 0 — Before you start

Git should already know who you are from last time. Check:

```powershell
git config --global user.name
git config --global user.email
```

If either is blank:

```powershell
git config --global user.name "Zainab Khalid"
git config --global user.email "your.email@example.com"
```

Open a terminal **in the project folder** (the one with `client`, `server` and `README.md`).

**Check `.env` is ignored** — it will hold your API keys later:

```powershell
cat .gitignore | Select-String env
```

You should see `.env` listed.

---

## Step 1 — Initialise

```powershell
git init
git branch -M main
```

---

## Step 2 — The commits

Run one block at a time. Each stages specific files and commits them.

### Commits 1–4 — Project setup

```powershell
git add .gitignore package.json package-lock.json
git commit -m "Set up monorepo with concurrently for client and server"

git add client/package.json client/package-lock.json client/vite.config.js client/index.html client/public
git commit -m "Scaffold React client with Vite and Tailwind"

git add client/src/index.css
git commit -m "Add design tokens and component classes"

git add server/package.json server/package-lock.json server/.env.example
git commit -m "Scaffold Express server with environment template"
```

### Commits 5–9 — The backend

```powershell
git add server/src/lib/store.js
git commit -m "Add in-memory data store for users and verification codes"

git add server/src/lib/jwt.js
git commit -m "Add JWT signing, verification and auth middleware"

git add server/src/lib/mailer.js
git commit -m "Add verification email with console, Ethereal and SMTP modes"

git add server/src/routes/auth.js
git commit -m "Implement registration with six-digit email verification"

git add server/src/ai/provider.js server/src/routes/ai.js server/src/index.js
git commit -m "Add swappable AI prediction provider and server entry point"
```

### Commits 10–13 — Data layer

```powershell
git add client/src/api/jolpica.js
git commit -m "Integrate Jolpica F1 API for schedules, results and standings"

git add client/src/api/backend.js
git commit -m "Add client for the F1Paddock API with token handling"

git add client/src/utils/format.js client/src/utils/teams.js
git commit -m "Add formatting, validation and team colour helpers"

git add client/src/api/mockDb.js
git commit -m "Add mock data layer for communities, posts, meetups and predictions"
```

### Commits 14–18 — Redux store

```powershell
git add client/src/store/slices/authSlice.js
git commit -m "Add auth slice with JWT session and verification flow"

git add client/src/store/slices/f1Slice.js
git commit -m "Add F1 slice with async thunks for race data"

git add client/src/store/slices/profileSlice.js
git commit -m "Add profile slice with favourites and similar-fan matching"

git add client/src/store/slices/socialSlice.js client/src/store/slices/meetupsSlice.js client/src/store/slices/moderationSlice.js
git commit -m "Add social, meetups and moderation slices"

git add client/src/store/slices/predictionsSlice.js client/src/store/store.js
git commit -m "Add predictions slice and configure the Redux store"
```

### Commits 19–22 — Components

```powershell
git add client/src/components/ui
git commit -m "Add shared UI kit with loading, error and empty states"

git add client/src/components/f1
git commit -m "Add race card, weekend schedule, countdown and standings tables"

git add client/src/components/social client/src/components/predictions
git commit -m "Add post, community, meetup and prediction components"

git add client/src/components/layout client/src/routes
git commit -m "Add navigation, footer and route guards"
```

### Commits 23–24 — Pages and wiring

```powershell
git add client/src/pages
git commit -m "Add all 16 pages covering every proposal requirement"

git add client/src/App.jsx client/src/main.jsx
git commit -m "Wire up routing and application entry point"
```

Check the count:

```powershell
git log --oneline
```

You want 24 lines.

---

## Step 3 — Push to GitHub

Create the repo at [github.com/new](https://github.com/new):

- **Name:** `f1paddock`
- **Public**
- **Leave all three checkboxes unticked** — you already have a README and .gitignore, and
  ticking them makes the first push fail.

```powershell
git remote add origin https://github.com/<your-username>/f1paddock.git
git push -u origin main
```

---

## Step 4 — A feature branch and a Pull Request

Worth doing again — it shows the workflow, and the README is a clean, self-contained change.

```powershell
git checkout -b docs/readme
git add README.md
git commit -m "Add README with setup, architecture and design decisions"
git push -u origin docs/readme
```

On GitHub, click **Compare & pull request**.

- **Title:** `Add project README`
- **Description:**

```
Documents the Phase 1 build.

- What the project does, grouped by requirement
- Setup for both the client and the server
- How verification codes are delivered in each mail mode
- How to switch the AI prediction provider from the heuristic to a real LLM
- Project structure, routes, API endpoints and Redux state shape
- Design decisions, and the Phase 1 limitations that Phase 2 addresses
```

Open **Files changed** and read it, then **Merge pull request** → **Confirm merge**.

```powershell
git checkout main
git pull origin main
```

---

## Step 5 — The submission file

```powershell
git add PHASE1_SUBMISSION.md GIT_COMMIT_GUIDE.md
git commit -m "Add Phase 1 submission details"
git push
```

Then **edit `PHASE1_SUBMISSION.md`** and replace `<your-username>` with your real GitHub
username before you hand it in.

---

## Final checks

Open your repo and confirm:

- [ ] `.env` is **not** in the file list (`server/.env.example` is fine)
- [ ] `node_modules/` is not there
- [ ] The README renders on the repo home page
- [ ] 25+ commits
- [ ] The pull request shows under **Pull requests** → Closed
- [ ] The repository is **Public**

Clone it into a different folder and run it. That catches anything you forgot to commit:

```powershell
cd ..
git clone https://github.com/<your-username>/f1paddock.git test-clone
cd test-clone
npm run install:all
cp server/.env.example server/.env
npm run dev
```

If that works from a fresh clone, your submission is complete.

---

## Troubleshooting

**"Updates were rejected"** — you ticked a checkbox when creating the repo:
```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

**You committed `.env`:**
```powershell
git rm --cached server/.env
git commit -m "Remove .env from version control"
git push
```
Then regenerate any API key that was in it — it is in your Git history now.

**You committed `node_modules/`:**
```powershell
git rm -r --cached node_modules client/node_modules server/node_modules
git commit -m "Remove node_modules from version control"
git push
```

**Undo the last commit but keep the files:**
```powershell
git reset --soft HEAD~1
```
