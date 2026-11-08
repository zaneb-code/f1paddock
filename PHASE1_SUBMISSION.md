# F1Paddock — Phase 1 Submission

**Student:** Zainab Khalid
**Course:** Web Programming
**Project:** F1Paddock — Social Platform for Formula 1 Fans

---

## Repository

```
https://github.com/<your-username>/f1paddock
```

> Replace `<your-username>` with your GitHub username before submitting.

---

## What Phase 1 contains

The **complete front end**, plus a small Express API for the two things a browser cannot do
on its own: issue JWTs with emailed verification codes, and call a language model without
exposing an API key.

This is more than the "whole front end" the phase requires, and covers roughly 60% of the
full project.

### The three added requirements

**1. Race information API** — Live data from the Jolpica-F1 API (the open successor to
Ergast; free, no key). The app shows the full season calendar and, for every Grand Prix, the
complete weekend timetable: practice 1–3, sprint qualifying, the sprint and qualifying,
each with its start time converted to the viewer's own timezone. Sprint and conventional
weekend formats are both handled without a special case. Completed races show the full
finishing order with grid positions and places gained or lost, the qualifying order with
Q1/Q2/Q3 times, and both championship tables.

**2. AI race predictions** — A user picks their podium, then generates the machine's
prediction and compares the two position by position. The server builds a prompt from the
current standings and the podiums of the last three rounds, and calls whichever provider is
configured — Gemini, OpenAI or Anthropic. With no key configured it uses a transparent
points-and-form calculation instead, and the UI says so rather than passing arithmetic off
as a model's answer. The provider is swappable from one line in `.env`.

**3. Authentication with email verification** — Registration creates an unverified account
and emails a six-digit code via Nodemailer. The account cannot be used until the code is
entered. Codes expire after 10 minutes and lock after 5 wrong attempts. Passwords are hashed
with bcrypt and sessions are real signed JWTs. Three delivery modes are supported: console
(printed in the terminal, zero setup), Ethereal (a real email with a preview link, no
account needed) and SMTP (a real inbox).

### Original proposal requirements — all implemented

| # | Requirement | Where |
| --- | --- | --- |
| 1 | Registration, login, F1 profile | `/register`, `/login`, `/profile` |
| 2 | Favourite drivers, teams, circuits, eras | `/profile` |
| 3 | Find fans with similar interests | `/fans` |
| 4 | Driver and team communities | `/communities` |
| 5 | Posts, comments, likes, discussions | Communities and race rooms |
| 6 | Race-specific discussion rooms | `/races/:round` → Discussion |
| 7 | Race prediction system | `/predictions` |
| 8 | Prediction scores and leaderboard | `/leaderboard` |
| 9 | Create and join meetups | `/meetups` |
| 10 | Search and filter | Races, communities, fans, discussions |
| 11 | Follow drivers and teams | `/standings`, `/profile` |
| 12 | Personalised dashboard | `/` |
| 13 | Admin moderation and reporting | Report buttons, `/admin` |

---

## Running it

```bash
git clone https://github.com/<your-username>/f1paddock.git
cd f1paddock
npm run install:all
cp server/.env.example server/.env
npm run dev
```

Client at <http://localhost:5173>, API at <http://localhost:4000>.

Everything works with the `.env` untouched — no API keys are needed to run or mark it. F1
data requires no key at all.

**To get a verification code when registering:** the default mail mode prints it in the
server terminal:

```
  [verification] you@example.com -> code 349855
```

**To see the moderation queue:** register with the username `admin`, `moderator` or
`steward`.

---

## Scale

| | |
| --- | --- |
| Pages | 16 |
| Redux slices | 7 |
| React components | 25+ |
| API endpoints (ours) | 8 |
| External API endpoints used | 7 |
| Commits | 25 |

---

## Phase 2 plan

Phase 1 was built so that Phase 2 is a replacement, not a rewrite:

1. **MongoDB + Mongoose.** Every server storage call already goes through
   `server/src/lib/store.js` — that one file becomes Mongoose models.
2. **Move the social features to the server.** `client/src/api/mockDb.js` defines the exact
   contract: same function names, same arguments, same promise-based returns. It becomes
   real Express routes and the client calls `fetch` instead.
3. **Server-side authorisation.** The moderator check is currently client-side, which is a
   convenience rather than a security control. Every moderation route must verify the user's
   role on the server.
4. **Server-side prediction scoring**, run when results arrive rather than on demand.
5. **A real LLM provider** — set `AI_PROVIDER` and the matching key; no code changes needed.
6. **Deployment** of both halves.
