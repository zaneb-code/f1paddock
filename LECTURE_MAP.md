# Where each lecture shows up in this project

A map from the course material to the file that uses it, so any claim in the
report can be checked in about ten seconds.

---

## Lecture 10–12 — React

| Idea | Where |
| --- | --- |
| Function components, props, destructuring | every file in `client/src/components/` |
| `useState` | `PostComposer.jsx`, `Meetups.jsx`, `Profile.jsx` |
| `useEffect` for data loading | `Dashboard.jsx`, `Races.jsx`, `RaceDetail.jsx` |
| `useMemo` to avoid re-filtering on every keystroke | `Races.jsx` |
| Conditional rendering | `RaceCard.jsx` (next / sprint / finished) |
| Lists and keys | `Races.jsx`, `StandingsTable.jsx` |
| Controlled form inputs | `Register.jsx`, `Login.jsx`, `Meetups.jsx` |
| Event handling and form submission | `PostComposer.jsx` |
| SPA routing | `App.jsx`, `routes/guards.jsx` |

## Lecture 14 — Redux Toolkit

| Idea | Where |
| --- | --- |
| `configureStore` | `client/src/store/store.js` |
| `createSlice` — actions and reducer together | all seven files in `store/slices/` |
| `createAsyncThunk` | every slice; `f1Slice.js` has the clearest examples |
| `extraReducers` with the builder callback | `authSlice.js` (pending / fulfilled / rejected) |
| Selectors | the bottom of every slice |
| `useSelector` / `useDispatch` | every page |
| `Provider` at the root | `client/src/main.jsx` |

## Lecture 15–17 — Node and Express

| Idea | Where |
| --- | --- |
| MVC layout | `server/src/{models,controllers,routes}` |
| `config/db.js` called from start-up | `server/src/config/db.js`, `index.js` |
| Routers mounted under a path prefix | `server/src/app.js` |
| Middleware, and why order matters | the numbered chain in `app.js` |
| `express.json()` filling `req.body` | `app.js` |
| `req.params`, `req.query`, `req.body` | `postController.js` uses all three |
| `res.status().json()` | every controller |
| `.env` and `.gitignore` | `server/.env.example` |
| `npm run dev` vs `npm start` | `server/package.json` |
| JWT authentication | `lib/jwt.js`, `middleware/auth.js` |
| Authorisation by role | `middleware/auth.js` → `requireModerator` |
| `credentials: 'include'` on the client | `client/src/api/http.js` |
| `httpOnly` cookies | `middleware/auth.js` → `sessionCookieOptions()` |

## Lecture 18–19 — MongoDB and Mongoose

| Idea | Where |
| --- | --- |
| Schema and model | all eight files in `server/src/models/` |
| `required`, `minlength`, `maxlength`, `match` | `User.js`, `Post.js` |
| `enum` | `User.js` (role), `Report.js` (targetType), `Community.js` (type) |
| `min` / `max` on numbers | `Post.js` (raceRound), `Meetup.js` (capacity) |
| `default` | `User.js` (`emailVerified`, `role`) |
| `unique` and `index` | `User.js` (email, username), `Community.js` (slug) |
| `select: false` to keep a field out of queries | `User.js` (`passwordHash`) |
| `set` to trim on the way in | every string field |
| `immutable` | `Profile.js` (user), `Post.js` (author) |
| `timestamps: true` | every model |
| Custom validators | `Post.js`, `Prediction.js` |
| 1-to-1 with a virtual | `User.js` → `profile` |
| 1-to-many | `Post.js` → `Comment.js` |
| `populate()` | `postController.js`, `reportController.js` |
| `findOneAndUpdate(..., { runValidators: true })` | `profileController.js` — and a note on why |
| Cascading deletes done by hand | `Post.js` (`pre('findOneAndDelete')`) |
| Aggregation | `predictionController.js` (leaderboard) |
| `_id` vs `id` | the `toJSON` transform in every model |

## Lecture 21 — Template engines

Not used in the app: this is a React SPA, so the browser builds the pages and
there is no server-rendered HTML to template. The one place the idea appears
is `server/src/lib/mailer.js`, which builds the verification email — and
`middleware/sanitize.js` → `escapeHtml()` is there for exactly the reason the
lecture gives, since that HTML is assembled by the server rather than escaped
by React.

## Lecture 22 — SOA and web services

| Idea | Where |
| --- | --- |
| Services over HTTP | the whole `server/src/routes/` tree |
| Resources as nouns, verbs as HTTP methods | `routes/*.js` |
| `POST /rides/:id/book` → `POST /posts/:id/comments` | `routes/postRoutes.js` |
| Nesting one level only | `/posts/:postId/comments` vs `/comments/:id` |
| Query string for filtering, path for identity | `postController.listPosts` |
| Status codes 200/201/204/400/401/403/404/409/413 | across the controllers |
| `201` + `Location` header | `createPost`, `createCommunity`, `createMeetup` |
| `204` with no body | `deletePost`, `deleteComment` |
| Statelessness | no server session store; the cookie carries a signed JWT |
| Consuming a third-party web service | `client/src/api/jolpica.js` |

## Lecture 23 — HTTPS, SSL/TLS

| Idea | Where |
| --- | --- |
| HSTS, in production only | `app.js` (helmet config, and why it is off locally) |
| HTTP → HTTPS redirect | `app.js` |
| `trust proxy` for nginx in front | `app.js` |
| Local TLS with a self-signed certificate | `index.js` → `createServer()`, `.env.example` |
| `secure` cookies only over HTTPS | `middleware/auth.js` |
| "HTTPS does not stop XSS or validate input" | why `middleware/sanitize.js` exists as well |

## Lecture 24–25 — Web security

| Idea | Where |
| --- | --- |
| Stored XSS | `middleware/sanitize.js` — the attack is in the comment at the top |
| Sanitise before saving | `sanitizeBody()` on every write route |
| Escape when displaying | React does it; `escapeHtml()` for server-built HTML |
| No `dangerouslySetInnerHTML` | nowhere in `client/src` — grep for it |
| CSRF, and the `<img src="...">` attack | `middleware/csrf.js` |
| CSRF tokens | `middleware/csrf.js`, `client/src/api/http.js` |
| `SameSite` cookies | `middleware/auth.js` |
| `httpOnly` so script cannot read the session | `middleware/auth.js` |
| Same-Origin Policy | explained in the CORS comment in `app.js` |
| CORS restricted to one origin, never `*` | `app.js` |
| `credentials: true` and why `*` then fails | `app.js` |
| "CORS protects users, not your backend" | why every route still authenticates |
| Never trust user input | the three validation levels below |

---

## Validation, at all three levels

The course material asks for validation on the frontend, the backend and the
database. Each level does a different job:

| Level | File | What it is for |
| --- | --- | --- |
| 1. React form | `client/src/utils/validate.js` | Instant feedback. **Not a control** — it runs on the visitor's machine and can be edited away in devtools or skipped with curl. |
| 2. Route validator | `server/src/middleware/validate.js` | Rejects bad requests before any model is touched, with a per-field message. Catches things a schema cannot see, like "confirmPassword must match password". |
| 3. Mongoose schema | `server/src/models/*.js` | The guarantee. A document breaking these rules cannot be saved, whoever is writing — our app, Postman, or a script. |

Levels 1 and 2 share a rule vocabulary (`required`, `minLength`, `oneOf`,
`integer`, …) so the two schemas read the same, and every limit is named once
in `LIMITS` in `client/src/utils/validate.js`. That constant exists because
the limits had already drifted: the post box allowed 1200 characters while
the server allowed 1000.

All three levels answer in the same shape, so one piece of form code displays
them all:

```json
{ "error": "Please fix the highlighted fields.",
  "fields": { "email": "Enter a valid email address" } }
```
