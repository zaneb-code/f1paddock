/**
 * ============================================================
 *  Mock data layer for the social features (Phase 1)
 * ============================================================
 *
 * Profiles, communities, posts, comments, meetups, predictions and reports
 * all live here, persisted in localStorage.
 *
 * Every function is async and returns a promise after a short delay, on
 * purpose: it behaves like a network call, so the Redux thunks, loading
 * spinners and error states written against it are exactly what Phase 2
 * needs when these become real Express routes backed by MongoDB. Swapping
 * this file for `fetch` calls should not require touching a single component.
 *
 * Authentication is NOT here — that is already real, handled by the Express
 * server in /server with JWTs and emailed verification codes.
 */

const DB_KEY = 'f1p_db_v1'
const LATENCY_MS = 180

/* ------------------------------------------------------------------
 *  Storage plumbing
 * ------------------------------------------------------------------ */

function read() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    /* storage full or blocked — the session still works in memory */
  }
}

/** Simulates a network round trip so loading states are real. */
function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))
}

let idCounter = Date.now()
const newId = (prefix) => `${prefix}_${(idCounter += 1).toString(36)}`

function daysAgo(n) {
  return new Date(Date.now() - n * 86_400_000).toISOString()
}

function daysAhead(n) {
  return new Date(Date.now() + n * 86_400_000).toISOString()
}

/* ------------------------------------------------------------------
 *  Seed data
 *
 *  Driver and constructor ids below match the real 2026 Jolpica ids, so
 *  seeded favourites line up with live API data.
 * ------------------------------------------------------------------ */

const SEED_USERS = [
  {
    id: 'seed_1', username: 'apexhunter', displayName: 'Ayesha Rahim',
    bio: 'Strategy nerd. I will defend a two-stop to my last breath.',
    favouriteDrivers: ['leclerc', 'antonelli'], favouriteTeams: ['ferrari'],
    favouriteCircuits: ['monza', 'spa'], favouriteEras: ['v10-era', 'hybrid'],
  },
  {
    id: 'seed_2', username: 'boxboxbox', displayName: 'Daniel Osei',
    bio: 'Been watching since Schumacher. Radio messages are my love language.',
    favouriteDrivers: ['max_verstappen', 'hadjar'], favouriteTeams: ['red_bull'],
    favouriteCircuits: ['suzuka', 'interlagos'], favouriteEras: ['nineties', 'ground-effect'],
  },
  {
    id: 'seed_3', username: 'papaya_rules', displayName: 'Mei Lin Chen',
    bio: 'McLaren through thick and very thin. Papaya rules are a scam.',
    favouriteDrivers: ['norris', 'piastri'], favouriteTeams: ['mclaren'],
    favouriteCircuits: ['silverstone', 'monaco'], favouriteEras: ['ground-effect'],
  },
  {
    id: 'seed_4', username: 'silverarrow', displayName: 'Jonas Weber',
    bio: 'Antonelli was always going to be this good. Screenshot this.',
    favouriteDrivers: ['antonelli', 'russell'], favouriteTeams: ['mercedes'],
    favouriteCircuits: ['spa', 'hungaroring'], favouriteEras: ['hybrid'],
  },
  {
    id: 'seed_5', username: 'tifosi_forever', displayName: 'Giulia Moretti',
    bio: 'Maranello or nothing. Hamilton in red still feels unreal.',
    favouriteDrivers: ['hamilton', 'leclerc'], favouriteTeams: ['ferrari'],
    favouriteCircuits: ['monza', 'imola'], favouriteEras: ['v10-era', 'turbo-80s'],
  },
  {
    id: 'seed_6', username: 'gridwalk', displayName: 'Tomás Herrera',
    bio: 'Here for the midfield battles nobody televises.',
    favouriteDrivers: ['gasly', 'lawson'], favouriteTeams: ['alpine', 'rb'],
    favouriteCircuits: ['interlagos', 'montreal'], favouriteEras: ['v8-era'],
  },
  {
    id: 'seed_7', username: 'degradation', displayName: 'Priya Nair',
    bio: 'Tyre data, pit windows, undercut maths. I make spreadsheets for fun.',
    favouriteDrivers: ['russell', 'piastri'], favouriteTeams: ['mercedes', 'mclaren'],
    favouriteCircuits: ['bahrain', 'suzuka'], favouriteEras: ['hybrid', 'ground-effect'],
  },
  {
    id: 'seed_8', username: 'newteam_watch', displayName: 'Marcus Bell',
    bio: 'Tracking every Audi and Cadillac rumour so you do not have to.',
    favouriteDrivers: ['hamilton', 'hadjar'], favouriteTeams: ['audi', 'cadillac'],
    favouriteCircuits: ['las_vegas', 'miami'], favouriteEras: ['ground-effect'],
  },
]

const SEED_COMMUNITIES = [
  { id: 'c_ferrari', slug: 'ferrari', name: 'Scuderia Ferrari', type: 'team', refId: 'ferrari',
    description: 'Everything Maranello. Celebrations, strategy meltdowns, and the eternal hope of next season.' },
  { id: 'c_mercedes', slug: 'mercedes', name: 'Mercedes-AMG', type: 'team', refId: 'mercedes',
    description: 'The Silver Arrows garage. Antonelli watch, Russell takes, and pace analysis.' },
  { id: 'c_mclaren', slug: 'mclaren', name: 'McLaren', type: 'team', refId: 'mclaren',
    description: 'Papaya corner. Norris, Piastri, and arguing about team orders.' },
  { id: 'c_redbull', slug: 'red-bull', name: 'Red Bull Racing', type: 'team', refId: 'red_bull',
    description: 'Milton Keynes talk. Verstappen, Hadjar and whatever the car is doing this week.' },
  { id: 'c_verstappen', slug: 'max-verstappen', name: 'Max Verstappen', type: 'driver', refId: 'max_verstappen',
    description: 'For fans of the most relentless qualifier on the grid.' },
  { id: 'c_antonelli', slug: 'kimi-antonelli', name: 'Kimi Antonelli', type: 'driver', refId: 'antonelli',
    description: 'The rookie who is not driving like one. Title fight HQ.' },
  { id: 'c_hamilton', slug: 'lewis-hamilton', name: 'Lewis Hamilton', type: 'driver', refId: 'hamilton',
    description: 'Seven titles and still chasing the eighth, now in red.' },
  { id: 'c_strategy', slug: 'strategy', name: 'Race Strategy', type: 'general', refId: null,
    description: 'Undercuts, overcuts, safety car gambles and tyre deg. Bring data.' },
  { id: 'c_newteams', slug: 'new-teams', name: 'Audi & Cadillac', type: 'general', refId: null,
    description: 'The 2026 arrivals. Liveries, line-ups and first-season expectations.' },
  { id: 'c_classic', slug: 'classic-f1', name: 'Classic F1', type: 'general', refId: null,
    description: 'Senna, Prost, the turbo years and everything before the hybrids.' },
]

const SEED_POSTS = [
  { communityId: 'c_mercedes', authorId: 'seed_4', daysOld: 1,
    body: 'Antonelli has out-qualified Russell in six of the last eight. In his rookie season. We are watching someone become a generational driver in real time.' },
  { communityId: 'c_strategy', authorId: 'seed_7', daysOld: 2,
    body: 'Hot take: the undercut is dead at circuits with this much tyre deg. Pit window maths says track position is worth less than fresh rubber now. Change my mind.' },
  { communityId: 'c_ferrari', authorId: 'seed_5', daysOld: 2,
    body: 'Three podiums in four races and the strategy wall still finds new ways to lose us points. I love this team and it is killing me.' },
  { communityId: 'c_mclaren', authorId: 'seed_3', daysOld: 3,
    body: 'Letting them race was the right call and I will not be taking questions. Both drivers finished. Nobody crashed. The constructors gap stayed the same.' },
  { communityId: 'c_newteams', authorId: 'seed_8', daysOld: 4,
    body: 'Audi scoring in their debut season was not on my bingo card. The power unit regulations genuinely reset the field this year.' },
  { communityId: 'c_redbull', authorId: 'seed_2', daysOld: 5,
    body: 'Hadjar in the second seat has quietly been the best driver-swap decision of the season. 97 points as a first-year starter is no accident.' },
  { communityId: 'c_classic', authorId: 'seed_1', daysOld: 6,
    body: 'Rewatched Suzuka 1989 last night. The racing was worse, the cars were deathtraps, and it was still more compelling than anything we got this spring.' },
  { communityId: 'c_antonelli', authorId: 'seed_4', daysOld: 7,
    body: 'The thing nobody mentions about Kimi is how little he complains on the radio. Total information, zero drama. Rare for a 19-year-old.' },
]

function seed() {
  const now = new Date().toISOString()

  const profiles = SEED_USERS.map((u) => ({
    ...u,
    avatarSeed: u.username,
    followedDrivers: u.favouriteDrivers,
    followedTeams: u.favouriteTeams,
    following: [],
    isSeed: true,
    createdAt: daysAgo(40),
  }))

  const communities = SEED_COMMUNITIES.map((c) => ({
    ...c,
    memberIds: SEED_USERS.filter(() => Math.random() > 0.5).map((u) => u.id),
    createdAt: daysAgo(60),
  }))

  const posts = SEED_POSTS.map((p) => ({
    id: newId('p'),
    communityId: p.communityId,
    raceRound: null,
    season: null,
    authorId: p.authorId,
    body: p.body,
    createdAt: daysAgo(p.daysOld),
    likedBy: SEED_USERS.filter(() => Math.random() > 0.45).map((u) => u.id),
    hidden: false,
  }))

  const comments = [
    { postId: posts[1].id, authorId: 'seed_2', body: 'Deg is circuit-dependent though. Try that logic at Monaco and you finish eleventh.', daysOld: 1 },
    { postId: posts[1].id, authorId: 'seed_3', body: 'Agreed on high-deg tracks. The model falls apart the moment there is a safety car.', daysOld: 1 },
    { postId: posts[0].id, authorId: 'seed_1', body: 'The scary part is he is still finding time in sector 3 every weekend.', daysOld: 0 },
    { postId: posts[2].id, authorId: 'seed_1', body: 'Every single year. I have made peace with it. (I have not.)', daysOld: 1 },
  ].map((c) => ({
    id: newId('cm'),
    postId: c.postId,
    authorId: c.authorId,
    body: c.body,
    createdAt: daysAgo(c.daysOld),
    likedBy: [],
    hidden: false,
  }))

  const meetups = [
    { id: newId('m'), title: 'Las Vegas GP watch party', mode: 'in-person',
      location: 'Dolmen Mall food court, Karachi', raceRound: 22,
      description: 'Big screen, terrible snacks, excellent company. We claim the corner tables by 9pm.',
      startsAt: daysAhead(5), hostId: 'seed_1', attendeeIds: ['seed_1', 'seed_5', 'seed_7'], capacity: 20 },
    { id: newId('m'), title: 'Qualifying call — voice chat', mode: 'online',
      location: 'Discord: F1Paddock voice', raceRound: 22,
      description: 'We react to Q3 live. Mics optional, opinions mandatory.',
      startsAt: daysAhead(4), hostId: 'seed_3', attendeeIds: ['seed_3', 'seed_4'], capacity: 50 },
    { id: newId('m'), title: 'Season review quiz night', mode: 'online',
      location: 'Discord: F1Paddock stage', raceRound: null,
      description: '40 questions on the 2026 season. Prize is bragging rights and nothing else.',
      startsAt: daysAhead(16), hostId: 'seed_7', attendeeIds: ['seed_7', 'seed_2', 'seed_6', 'seed_8'], capacity: 30 },
  ]

  return {
    version: 1,
    createdAt: now,
    profiles,
    communities,
    posts,
    comments,
    meetups,
    predictions: [],
    reports: [],
  }
}

function load() {
  let db = read()
  if (!db || db.version !== 1) {
    db = seed()
    write(db)
  }
  return db
}

/** Wipes everything and re-seeds. Used by the dev reset button. */
export async function resetDatabase() {
  const db = seed()
  write(db)
  return delay(true)
}

/* ------------------------------------------------------------------
 *  Profiles
 * ------------------------------------------------------------------ */

const EMPTY_PROFILE = {
  bio: '',
  favouriteDrivers: [],
  favouriteTeams: [],
  favouriteCircuits: [],
  favouriteEras: [],
  followedDrivers: [],
  followedTeams: [],
  following: [],
}

/** Creates the profile row for a freshly registered account, if absent. */
export async function ensureProfile(user) {
  const db = load()
  let profile = db.profiles.find((p) => p.id === user.id)

  if (!profile) {
    profile = {
      ...EMPTY_PROFILE,
      id: user.id,
      username: user.username,
      displayName: user.username,
      avatarSeed: user.username,
      isSeed: false,
      createdAt: new Date().toISOString(),
    }
    db.profiles.push(profile)
    write(db)
  }

  return delay(profile)
}

export async function getProfile(userId) {
  const db = load()
  return delay(db.profiles.find((p) => p.id === userId) ?? null)
}

export async function getProfileByUsername(username) {
  const db = load()
  const wanted = String(username).toLowerCase()
  return delay(db.profiles.find((p) => p.username.toLowerCase() === wanted) ?? null)
}

export async function listProfiles() {
  const db = load()
  return delay([...db.profiles])
}

export async function updateProfile(userId, patch) {
  const db = load()
  const profile = db.profiles.find((p) => p.id === userId)
  if (!profile) throw new Error('Profile not found.')

  Object.assign(profile, patch)
  write(db)
  return delay({ ...profile })
}

/** Follow / unfollow another fan. Returns the updated viewer profile. */
export async function toggleFollowUser(viewerId, targetId) {
  const db = load()
  const me = db.profiles.find((p) => p.id === viewerId)
  if (!me) throw new Error('Profile not found.')
  if (viewerId === targetId) throw new Error('You cannot follow yourself.')

  me.following = me.following.includes(targetId)
    ? me.following.filter((id) => id !== targetId)
    : [...me.following, targetId]

  write(db)
  return delay({ ...me })
}

/** Follow / unfollow a driver or a team. */
export async function toggleFollowEntity(viewerId, kind, entityId) {
  const db = load()
  const me = db.profiles.find((p) => p.id === viewerId)
  if (!me) throw new Error('Profile not found.')

  const key = kind === 'driver' ? 'followedDrivers' : 'followedTeams'
  me[key] = me[key].includes(entityId)
    ? me[key].filter((id) => id !== entityId)
    : [...me[key], entityId]

  write(db)
  return delay({ ...me })
}

/**
 * "Find fans with similar F1 interests."
 *
 * Scores every other profile by how much its favourites overlap with yours,
 * weighting drivers highest because that is the most specific signal, then
 * teams, circuits and eras. Returns only profiles with at least one thing
 * in common, best match first.
 */
export async function findSimilarFans(viewerId) {
  const db = load()
  const me = db.profiles.find((p) => p.id === viewerId)
  if (!me) return delay([])

  const overlap = (a = [], b = []) => a.filter((x) => b.includes(x))

  const scored = db.profiles
    .filter((p) => p.id !== viewerId)
    .map((p) => {
      const drivers = overlap(me.favouriteDrivers, p.favouriteDrivers)
      const teams = overlap(me.favouriteTeams, p.favouriteTeams)
      const circuits = overlap(me.favouriteCircuits, p.favouriteCircuits)
      const eras = overlap(me.favouriteEras, p.favouriteEras)

      const score = drivers.length * 4 + teams.length * 3 + circuits.length * 2 + eras.length

      return {
        profile: p,
        score,
        shared: { drivers, teams, circuits, eras },
        isFollowing: me.following.includes(p.id),
      }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)

  return delay(scored)
}

/* ------------------------------------------------------------------
 *  Communities
 * ------------------------------------------------------------------ */

export async function listCommunities() {
  const db = load()
  return delay(
    db.communities.map((c) => ({
      ...c,
      postCount: db.posts.filter((p) => p.communityId === c.id && !p.hidden).length,
    }))
  )
}

export async function getCommunity(slug) {
  const db = load()
  const community = db.communities.find((c) => c.slug === slug)
  if (!community) return delay(null)
  return delay({
    ...community,
    postCount: db.posts.filter((p) => p.communityId === community.id && !p.hidden).length,
  })
}

export async function createCommunity({ name, description, type, refId, creatorId }) {
  const db = load()
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  if (db.communities.some((c) => c.slug === slug)) {
    throw new Error('A community with a similar name already exists.')
  }

  const community = {
    id: newId('c'),
    slug,
    name,
    description,
    type: type ?? 'general',
    refId: refId ?? null,
    memberIds: [creatorId],
    createdAt: new Date().toISOString(),
  }

  db.communities.push(community)
  write(db)
  return delay(community)
}

export async function toggleCommunityMembership(communityId, userId) {
  const db = load()
  const community = db.communities.find((c) => c.id === communityId)
  if (!community) throw new Error('Community not found.')

  community.memberIds = community.memberIds.includes(userId)
    ? community.memberIds.filter((id) => id !== userId)
    : [...community.memberIds, userId]

  write(db)
  return delay({ ...community })
}

/* ------------------------------------------------------------------
 *  Posts and comments
 * ------------------------------------------------------------------ */

/** Attaches author + comment count so components do not have to look them up. */
function decoratePost(db, post) {
  return {
    ...post,
    author: db.profiles.find((p) => p.id === post.authorId) ?? null,
    community: db.communities.find((c) => c.id === post.communityId) ?? null,
    commentCount: db.comments.filter((c) => c.postId === post.id && !c.hidden).length,
  }
}

/**
 * Lists posts with optional filters.
 * @param {object} options
 * @param {string} options.communityId  only this community
 * @param {number} options.raceRound    only this race's discussion room
 * @param {string} options.authorId     only this author
 * @param {string} options.search       free-text match on the body
 */
export async function listPosts({ communityId, raceRound, authorId, search, season } = {}) {
  const db = load()

  let posts = db.posts.filter((p) => !p.hidden)

  if (communityId) posts = posts.filter((p) => p.communityId === communityId)
  if (raceRound != null) {
    posts = posts.filter((p) => p.raceRound === raceRound && String(p.season) === String(season))
  }
  if (authorId) posts = posts.filter((p) => p.authorId === authorId)

  if (search) {
    const needle = search.toLowerCase()
    posts = posts.filter((p) => p.body.toLowerCase().includes(needle))
  }

  posts = posts
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((p) => decoratePost(db, p))

  return delay(posts)
}

export async function createPost({ authorId, body, communityId = null, raceRound = null, season = null }) {
  const trimmed = String(body ?? '').trim()
  if (trimmed.length < 2) throw new Error('Write something first.')
  if (trimmed.length > 1200) throw new Error('Posts are limited to 1200 characters.')

  const db = load()
  const post = {
    id: newId('p'),
    communityId,
    raceRound,
    season: season ? String(season) : null,
    authorId,
    body: trimmed,
    createdAt: new Date().toISOString(),
    likedBy: [],
    hidden: false,
  }

  db.posts.unshift(post)
  write(db)
  return delay(decoratePost(db, post))
}

export async function deletePost(postId, requesterId) {
  const db = load()
  const post = db.posts.find((p) => p.id === postId)
  if (!post) throw new Error('Post not found.')
  if (post.authorId !== requesterId) throw new Error('You can only delete your own posts.')

  db.posts = db.posts.filter((p) => p.id !== postId)
  db.comments = db.comments.filter((c) => c.postId !== postId)
  write(db)
  return delay(postId)
}

export async function togglePostLike(postId, userId) {
  const db = load()
  const post = db.posts.find((p) => p.id === postId)
  if (!post) throw new Error('Post not found.')

  post.likedBy = post.likedBy.includes(userId)
    ? post.likedBy.filter((id) => id !== userId)
    : [...post.likedBy, userId]

  write(db)
  return delay(decoratePost(db, post))
}

export async function listComments(postId) {
  const db = load()
  const comments = db.comments
    .filter((c) => c.postId === postId && !c.hidden)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((c) => ({ ...c, author: db.profiles.find((p) => p.id === c.authorId) ?? null }))

  return delay(comments)
}

export async function createComment({ postId, authorId, body }) {
  const trimmed = String(body ?? '').trim()
  if (!trimmed) throw new Error('Write something first.')

  const db = load()
  const comment = {
    id: newId('cm'),
    postId,
    authorId,
    body: trimmed,
    createdAt: new Date().toISOString(),
    likedBy: [],
    hidden: false,
  }

  db.comments.push(comment)
  write(db)
  return delay({ ...comment, author: db.profiles.find((p) => p.id === authorId) ?? null })
}

/* ------------------------------------------------------------------
 *  Meetups
 * ------------------------------------------------------------------ */

export async function listMeetups() {
  const db = load()
  const meetups = db.meetups
    .map((m) => ({ ...m, host: db.profiles.find((p) => p.id === m.hostId) ?? null }))
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))

  return delay(meetups)
}

export async function createMeetup(meetup) {
  const db = load()
  const record = {
    id: newId('m'),
    attendeeIds: [meetup.hostId],
    createdAt: new Date().toISOString(),
    ...meetup,
  }
  db.meetups.push(record)
  write(db)
  return delay({ ...record, host: db.profiles.find((p) => p.id === record.hostId) ?? null })
}

export async function toggleMeetupAttendance(meetupId, userId) {
  const db = load()
  const meetup = db.meetups.find((m) => m.id === meetupId)
  if (!meetup) throw new Error('Meetup not found.')

  const joined = meetup.attendeeIds.includes(userId)

  if (!joined && meetup.capacity && meetup.attendeeIds.length >= meetup.capacity) {
    throw new Error('This meetup is full.')
  }

  meetup.attendeeIds = joined
    ? meetup.attendeeIds.filter((id) => id !== userId)
    : [...meetup.attendeeIds, userId]

  write(db)
  return delay({ ...meetup, host: db.profiles.find((p) => p.id === meetup.hostId) ?? null })
}

/* ------------------------------------------------------------------
 *  Predictions
 * ------------------------------------------------------------------ */

export async function listPredictions({ userId, season, round } = {}) {
  const db = load()
  let rows = [...db.predictions]

  if (userId) rows = rows.filter((p) => p.userId === userId)
  if (season != null) rows = rows.filter((p) => String(p.season) === String(season))
  if (round != null) rows = rows.filter((p) => Number(p.round) === Number(round))

  return delay(
    rows
      .map((p) => ({ ...p, user: db.profiles.find((x) => x.id === p.userId) ?? null }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  )
}

/**
 * Saves a prediction. One per user per race — submitting again replaces
 * the previous one, which is simpler than blocking it and is what people expect.
 */
export async function savePrediction({ userId, season, round, raceName, podium, poleDriverId }) {
  if (!Array.isArray(podium) || podium.length !== 3 || podium.some((d) => !d)) {
    throw new Error('Pick all three podium positions.')
  }
  if (new Set(podium).size !== 3) {
    throw new Error('Pick three different drivers for the podium.')
  }

  const db = load()
  const existingIndex = db.predictions.findIndex(
    (p) => p.userId === userId && String(p.season) === String(season) && Number(p.round) === Number(round)
  )

  const record = {
    id: existingIndex >= 0 ? db.predictions[existingIndex].id : newId('pr'),
    userId,
    season: String(season),
    round: Number(round),
    raceName,
    podium,
    poleDriverId: poleDriverId ?? null,
    points: null,
    scoredAt: null,
    createdAt: new Date().toISOString(),
  }

  if (existingIndex >= 0) db.predictions[existingIndex] = record
  else db.predictions.push(record)

  write(db)
  return delay(record)
}

/**
 * Scores a prediction against the real result.
 *
 * Scoring: 10 points for a driver in exactly the right podium slot, 4 for a
 * driver who made the podium but in a different position, 5 for the pole
 * sitter. Maximum 35.
 */
export async function scorePrediction(predictionId, actualPodiumDriverIds, actualPoleDriverId) {
  const db = load()
  const prediction = db.predictions.find((p) => p.id === predictionId)
  if (!prediction) throw new Error('Prediction not found.')

  let points = 0
  prediction.podium.forEach((driverId, index) => {
    if (actualPodiumDriverIds[index] === driverId) points += 10
    else if (actualPodiumDriverIds.includes(driverId)) points += 4
  })

  if (prediction.poleDriverId && prediction.poleDriverId === actualPoleDriverId) points += 5

  prediction.points = points
  prediction.scoredAt = new Date().toISOString()
  write(db)

  return delay({ ...prediction })
}

/** Leaderboard: total points per user across every scored prediction. */
export async function getLeaderboard() {
  const db = load()

  const totals = new Map()
  db.predictions.forEach((p) => {
    if (p.points == null) return
    const row = totals.get(p.userId) ?? { userId: p.userId, points: 0, scored: 0, exact: 0 }
    row.points += p.points
    row.scored += 1
    if (p.points >= 30) row.exact += 1
    totals.set(p.userId, row)
  })

  const rows = [...totals.values()]
    .map((row) => ({ ...row, user: db.profiles.find((p) => p.id === row.userId) ?? null }))
    .sort((a, b) => b.points - a.points)
    .map((row, index) => ({ ...row, rank: index + 1 }))

  return delay(rows)
}

/* ------------------------------------------------------------------
 *  Moderation
 * ------------------------------------------------------------------ */

export async function createReport({ targetType, targetId, reporterId, reason }) {
  const db = load()

  const already = db.reports.some(
    (r) => r.targetId === targetId && r.reporterId === reporterId && r.status === 'open'
  )
  if (already) throw new Error('You have already reported this.')

  const report = {
    id: newId('r'),
    targetType,
    targetId,
    reporterId,
    reason,
    status: 'open',
    createdAt: new Date().toISOString(),
  }

  db.reports.push(report)
  write(db)
  return delay(report)
}

export async function listReports() {
  const db = load()

  return delay(
    db.reports
      .map((r) => {
        const target =
          r.targetType === 'post'
            ? db.posts.find((p) => p.id === r.targetId)
            : db.comments.find((c) => c.id === r.targetId)

        return {
          ...r,
          reporter: db.profiles.find((p) => p.id === r.reporterId) ?? null,
          target: target ?? null,
          targetAuthor: target ? db.profiles.find((p) => p.id === target.authorId) ?? null : null,
        }
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  )
}

/** Moderator action: 'hide' the content, or 'dismiss' the report. */
export async function resolveReport(reportId, action) {
  const db = load()
  const report = db.reports.find((r) => r.id === reportId)
  if (!report) throw new Error('Report not found.')

  if (action === 'hide') {
    const collection = report.targetType === 'post' ? db.posts : db.comments
    const target = collection.find((t) => t.id === report.targetId)
    if (target) target.hidden = true
    report.status = 'actioned'
  } else {
    report.status = 'dismissed'
  }

  report.resolvedAt = new Date().toISOString()
  write(db)
  return delay({ ...report })
}
