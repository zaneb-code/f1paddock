# F1Paddock

A social platform for Formula 1 fans. Follow every race weekend, argue about strategy in
driver and team communities, predict the podium against an AI, and organise meetups.

Semester project for Web Programming — **Zainab Khalid**.

> **Phase 1 status:** the complete front end plus a small Express API for the two things
> that cannot run in a browser (JWT authentication with emailed verification codes, and the
> AI prediction call). Phase 2 replaces the client-side mock data layer with MongoDB-backed
> routes on the same server.

---

## What it does

**Race information — live from the F1 API**
- The full season calendar, every round
- Each Grand Prix's complete weekend timetable: practice, qualifying, sprint qualifying,
  sprint and the race, in your own timezone
- Both sprint and conventional weekend formats handled automatically
- Live countdown to the next session
- Full race results with grid position and places gained, plus the qualifying order
- Drivers' and constructors' championship tables

**Authentication with email verification**
- Register with email, username and password
- A six-digit code is emailed to the address; the account is not usable until it is entered
- Codes expire after 10 minutes and lock after 5 wrong attempts
- Passwords hashed with bcrypt, sessions issued as real JWTs
- Logging in with an unverified account sends you to the code screen rather than refusing

**Race predictions, with an AI second opinion**
- Pick your podium and optionally the pole sitter
- Generate the machine's prediction alongside yours and compare them position by position
- Scoring: 10 points for an exact placing, 4 for the right driver in the wrong slot, 5 for pole
- Leaderboard across all scored races

**The social platform**
- Personalised F1 profile: favourite drivers, teams, circuits and eras
- Find fans with similar interests, scored on what you actually have in common
- Driver, team and general communities with posts, comments and likes
- A discussion room attached to every Grand Prix
- Follow drivers, teams and other fans
- Create and join meetups, online or in person
- Report content, and a moderation queue for stewards
- Search and filter across races, communities, discussions and fans

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| UI | React 19 | Component model, the course stack |
| State | Redux Toolkit | Shared state across seven feature areas |
| Routing | React Router 7 | Client-side routing, protected routes |
| Styling | Tailwind CSS 4 | Utility-first, configured in CSS via `@theme` |
| Build | Vite 8 | Fast dev server, `/api` proxy to the backend |
| API | Express 5 | Auth and the AI endpoint |
| Auth | jsonwebtoken + bcryptjs | Real JWTs, hashed passwords |
| Email | Nodemailer | Verification codes |
| F1 data | [Jolpica-F1](https://github.com/jolpica/jolpica-f1) | Free, no key, Ergast's successor |

---

## Running it

### 1. Prerequisites

Node.js 18 or newer. Check with `node -v`.

### 2. Install

```bash
git clone https://github.com/<your-username>/f1paddock.git
cd f1paddock
npm run install:all
```

That installs the root, the server and the client.

### 3. Configure the server

```bash
cp server/.env.example server/.env
```

**Every value has a working default, so the app runs with the file untouched.** Out of the
box it uses `MAIL_MODE=console` (verification codes are printed in the server terminal
rather than emailed) and `AI_PROVIDER=heuristic` (predictions are calculated, not generated
by a model). Both are explained below.

### 4. Run both halves

```bash
npm run dev
```

- Client: <http://localhost:5173>
- API: <http://localhost:4000>

Or in two terminals: `npm run dev:server` and `npm run dev:client`.

The F1 data needs no key and works immediately.

---

## Getting the verification code

Registration always emails a code. How it is delivered depends on `MAIL_MODE` in
`server/.env`:

| Mode | What happens | Setup |
| --- | --- | --- |
| `console` *(default)* | The code is printed in the server terminal | None |
| `ethereal` | A real email is composed and you get a preview link in the terminal | None — an account is created automatically |
| `smtp` | A real email is sent to a real inbox | Fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` |

In `console` mode, look for this in the server terminal after signing up:

```
  [verification] you@example.com -> code 349855
```

There is also a development-only endpoint listing pending codes:
<http://localhost:4000/api/_debug/state>

---

## Turning on the real AI

By default `AI_PROVIDER=heuristic`: predictions come from a transparent calculation
(championship points 75%, recent podiums 25%). It is labelled as such everywhere in the
UI — it is deliberately **not** presented as an AI prediction.

To use a language model, set the provider and its key in `server/.env`:

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
```

`openai` and `anthropic` work the same way. If a provider call fails the server falls back
to the heuristic and says so in the response, so the feature never breaks the page.

**The key stays on the server.** Anything in React code is downloadable by anyone who opens
devtools, so an API key in the frontend is a published API key. That is the main reason this
project has a backend in Phase 1 at all.

---

## Project structure

```
f1paddock/
├── client/                      React front end
│   └── src/
│       ├── api/
│       │   ├── jolpica.js       F1 API client + response flattening
│       │   ├── backend.js       Our Express API (auth, AI)
│       │   └── mockDb.js        Social data layer (Phase 2 replaces this)
│       ├── store/
│       │   ├── store.js         configureStore
│       │   └── slices/          auth, profile, f1, social, predictions, meetups, moderation
│       ├── components/
│       │   ├── ui/              Buttons, cards, states, modal, tabs
│       │   ├── f1/              Race card, weekend schedule, countdown, standings
│       │   ├── social/          Post card, composer, community/fan/meetup cards
│       │   ├── predictions/     Prediction form, AI panel, comparison, leaderboard
│       │   └── layout/          Navbar, footer, scroll reset
│       ├── pages/               16 pages, one per route
│       ├── routes/guards.jsx    Protected / public-only / moderator routes
│       └── utils/               Formatting, validation, team colours
│
└── server/                      Express API
    └── src/
        ├── index.js             App setup and routes
        ├── routes/auth.js       register, verify, resend, login, me
        ├── routes/ai.js         AI prediction endpoint
        ├── ai/provider.js       Swappable LLM provider + heuristic fallback
        └── lib/
            ├── store.js         In-memory data (Phase 2: MongoDB)
            ├── jwt.js           Token signing, verification, auth middleware
            └── mailer.js        Verification email, three delivery modes
```

---

## Routes

| Path | Page | Access |
| --- | --- | --- |
| `/` | Personalised dashboard | Public |
| `/races` | Season calendar | Public |
| `/races/:round` | Weekend schedule, results, discussion room | Public |
| `/standings` | Championship tables | Public |
| `/communities` | Browse and create communities | Public |
| `/communities/:slug` | One community's feed | Public |
| `/leaderboard` | Prediction leaderboard | Public |
| `/meetups` | Create and join meetups | Public |
| `/fans` | Find fans with similar interests | Public |
| `/fans/:username` | A fan's public profile | Public |
| `/predictions` | Your picks and the AI's | **Logged in** |
| `/profile` | Your favourites | **Logged in** |
| `/admin` | Moderation queue | **Moderators** |
| `/login`, `/register` | Authentication | Logged out only |
| `*` | 404 | Public |

To see the admin page, register with the username `admin`, `moderator` or `steward`
(see `MODERATOR_USERNAMES` in `moderationSlice.js`).

---

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create account, email a code |
| `POST` | `/api/auth/verify` | Check the code, issue a JWT |
| `POST` | `/api/auth/resend` | Send a fresh code |
| `POST` | `/api/auth/login` | Email + password, issue a JWT |
| `GET` | `/api/auth/me` | Current user (requires a token) |
| `GET` | `/api/ai/status` | Which prediction engine is configured |
| `POST` | `/api/ai/predict` | Generate a podium prediction (requires a token) |
| `GET` | `/api/health` | Server status |

External, called from the browser:

| Endpoint | Used for |
| --- | --- |
| `GET /ergast/f1/{season}/races` | Season calendar with session times |
| `GET /ergast/f1/{season}/{round}/results` | Race results |
| `GET /ergast/f1/{season}/{round}/qualifying` | Qualifying order |
| `GET /ergast/f1/{season}/driverstandings` | Drivers' championship |
| `GET /ergast/f1/{season}/constructorstandings` | Constructors' championship |
| `GET /ergast/f1/{season}/drivers\|constructors\|circuits` | Grid lists for favourites |

---

## Redux state

```
store
├── auth         user, JWT state, verification stage
├── profile      favourites, follows, similar-fan matching
├── f1           calendar, standings, grid, per-race detail (cached by round)
├── social       communities, posts, comments, race discussion rooms
├── predictions  your picks, AI predictions, scoring, leaderboard
├── meetups      meetups and attendance
└── moderation   reports and the admin queue
```

Redux Toolkit features used: `configureStore`, `createSlice`, `createAsyncThunk`,
`extraReducers` with the builder callback, auto-generated actions, selectors, and
`useSelector` / `useDispatch` throughout.

---

## Design decisions

- **A race discussion room is just a post with a `raceRound` instead of a `communityId`.**
  Everything built for community posts — liking, commenting, reporting, searching — works
  in a race room with no extra code.
- **The mock data layer is async and returns promises.** It behaves like a network call, so
  the thunks, loading spinners and error states written against it are exactly what Phase 2
  needs when these become real routes. Swapping it for `fetch` should not touch a component.
- **Session times are rendered in the viewer's timezone.** "When is qualifying" is the only
  question a fan is actually asking.
- **Weekend sessions are sorted by start time rather than hardcoded.** That produces the
  correct order for both sprint and conventional weekends with no special case.
- **Per-race data is cached by round.** A completed race's result never changes, so visiting
  it twice does not refetch.
- **The AI provider is swappable and falls back honestly.** If no key is configured, or a
  provider fails, the UI says the result came from a calculation rather than a model.
- **Duplicate prevention and scoring live in reducers, not components.** The rules hold no
  matter which part of the UI dispatches the action.
- **Logout navigates before clearing the session.** Clearing first makes the route guard
  redirect to `/login`, overriding wherever we meant to send the user.

---

## Known limitations in Phase 1

These are deliberate, and are what Phase 2 addresses:

- **Server data is in memory**, so accounts are lost when the server restarts. All storage
  calls go through `server/src/lib/store.js`, which is the single file Phase 2 replaces with
  Mongoose models.
- **Social data lives in the browser's localStorage**, so posts and predictions are
  per-browser rather than shared between users.
- **The moderator check is client-side**, which is a convenience, not a security control.
  Phase 2 must check the user's role on the server for every moderation request.
- **Predictions are scored on demand** from the race page. Phase 2 scores them on the server
  when results arrive.

---

## Credits

Race data from the [Jolpica-F1 API](https://github.com/jolpica/jolpica-f1), the open
community successor to Ergast. This project is not affiliated with or endorsed by Formula 1.
