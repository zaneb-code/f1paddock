/**
 * The social data layer, talking to the real API.
 *
 * This file replaces mockDb.js, which kept everything in localStorage. It
 * exports the same function names, takes the same arguments and returns the
 * same shapes, so the Redux slices change by one line each — their import —
 * and nothing else in the app had to move.
 *
 * That was the point of writing mockDb the way it was in Phase 1: async,
 * promise-based, with the signatures a real API would need. The mock was a
 * contract, not a shortcut, and this is the file that honours it.
 *
 * Its other job is translating between two vocabularies. The API speaks in
 * flattened fields — `authorName`, `isOnline`, `totalPoints` — because that
 * is what travels well over the wire. The components were written against
 * nested objects — `post.author.username`, `meetup.mode`. The mapping lives
 * here, in one place, rather than being sprinkled through twenty components.
 */

import { request, query } from './http.js'

/* ------------------------------------------------------------------ */
/*  shape adapters                                                     */
/* ------------------------------------------------------------------ */

function asPost(post) {
  if (!post) return null

  return {
    ...post,
    author: { id: post.authorId, username: post.authorName, displayName: post.authorName },
    community: post.communityId
      ? { id: post.communityId, name: post.communityName, slug: post.communitySlug }
      : null,
    likedBy: post.likedBy ?? [],
    commentCount: post.commentCount ?? 0,
  }
}

function asComment(comment) {
  if (!comment) return null

  return {
    ...comment,
    author: { id: comment.authorId, username: comment.authorName, displayName: comment.authorName },
  }
}

function asMeetup(meetup) {
  if (!meetup) return null

  return {
    ...meetup,
    host: { id: meetup.hostId, username: meetup.hostName, displayName: meetup.hostName },
    // The database stores a boolean; the UI was written around a word.
    mode: meetup.isOnline ? 'online' : 'in-person',
  }
}

/** The server groups shared favourites by field name; the UI wants short keys. */
function asMatch(match) {
  return {
    profile: match.profile,
    score: match.score,
    isFollowing: match.isFollowing,
    shared: {
      drivers: match.shared?.favouriteDrivers ?? [],
      teams: match.shared?.favouriteTeams ?? [],
      circuits: match.shared?.favouriteCircuits ?? [],
      eras: match.shared?.favouriteEras ?? [],
    },
  }
}

/** Turns a 404 into null, for the lookups where "not found" is not an error. */
async function orNull(promise) {
  try {
    return await promise
  } catch (error) {
    if (error.status === 404) return null
    throw error
  }
}

/* ------------------------------------------------------------------ */
/*  Profiles                                                           */
/* ------------------------------------------------------------------ */

export async function ensureProfile() {
  const { profile } = await request.get('/profiles/me')
  return profile
}

export async function getProfile() {
  const { profile } = await request.get('/profiles/me')
  return profile
}

export async function getProfileByUsername(username) {
  const data = await orNull(request.get(`/profiles/${encodeURIComponent(username)}`))
  return data?.profile ?? null
}

export async function listProfiles() {
  const { profiles } = await request.get('/profiles')
  return profiles
}

export async function updateProfile(_userId, patch) {
  // The user id is not sent: the server takes it from the session cookie.
  // A client that could name whose profile to edit would be a client that
  // could edit anyone's.
  const { profile } = await request.patch('/profiles/me', patch)
  return profile
}

export async function toggleFollowUser(_viewerId, targetId) {
  const { profile } = await request.put(`/profiles/${encodeURIComponent(targetId)}/follow`)
  return profile
}

export async function toggleFollowEntity(_viewerId, kind, entityId) {
  const { profile } = await request.put(
    `/profiles/me/follows/${kind}/${encodeURIComponent(entityId)}`,
  )
  return profile
}

export async function findSimilarFans() {
  const { matches } = await request.get('/profiles/me/similar')
  return matches.map(asMatch)
}

/* ------------------------------------------------------------------ */
/*  Communities                                                        */
/* ------------------------------------------------------------------ */

export async function listCommunities() {
  const { communities } = await request.get('/communities')
  return communities
}

export async function getCommunity(slug) {
  const data = await orNull(request.get(`/communities/${encodeURIComponent(slug)}`))
  return data?.community ?? null
}

export async function createCommunity(payload) {
  const { community } = await request.post('/communities', {
    name: payload.name,
    description: payload.description,
    type: payload.type,
    refId: payload.refId,
  })
  return community
}

export async function toggleCommunityMembership(communityId) {
  const { community } = await request.put(
    `/communities/${encodeURIComponent(communityId)}/membership`,
  )
  return community
}

/* ------------------------------------------------------------------ */
/*  Posts and comments                                                 */
/* ------------------------------------------------------------------ */

export async function listPosts(filters = {}) {
  const { posts } = await request.get(
    `/posts${query({
      communityId: filters.communityId,
      raceRound: filters.raceRound,
      season: filters.season,
      author: filters.authorId,
      search: filters.search,
    })}`,
  )
  return posts.map(asPost)
}

export async function createPost(payload) {
  const { post } = await request.post('/posts', {
    body: payload.body,
    communityId: payload.communityId ?? undefined,
    raceRound: payload.raceRound ?? undefined,
    season: payload.season ?? undefined,
  })
  return asPost(post)
}

export async function deletePost(postId) {
  await request.delete(`/posts/${postId}`)
  return { id: postId }
}

export async function togglePostLike(postId) {
  const { post } = await request.put(`/posts/${postId}/like`)
  return asPost(post)
}

export async function listComments(postId) {
  const { comments } = await request.get(`/posts/${postId}/comments`)
  return comments.map(asComment)
}

export async function createComment(payload) {
  const { comment } = await request.post(`/posts/${payload.postId}/comments`, {
    body: payload.body,
  })
  return asComment(comment)
}

/* ------------------------------------------------------------------ */
/*  Meetups                                                            */
/* ------------------------------------------------------------------ */

export async function listMeetups() {
  const { meetups } = await request.get('/meetups')
  return meetups.map(asMeetup)
}

export async function createMeetup(payload) {
  const { meetup } = await request.post('/meetups', {
    title: payload.title,
    description: payload.description,
    location: payload.location,
    isOnline: payload.mode ? payload.mode === 'online' : Boolean(payload.isOnline),
    startsAt: payload.startsAt,
    raceRound: payload.raceRound ?? undefined,
    season: payload.season ?? undefined,
    capacity: payload.capacity ?? undefined,
  })
  return asMeetup(meetup)
}

export async function toggleMeetupAttendance(meetupId) {
  const { meetup } = await request.put(`/meetups/${meetupId}/attendance`)
  return asMeetup(meetup)
}

/* ------------------------------------------------------------------ */
/*  Predictions                                                        */
/* ------------------------------------------------------------------ */

export async function listPredictions({ season, round } = {}) {
  // Always your own: the route reads the user from the session.
  const { predictions } = await request.get(`/predictions/me${query({ season, round })}`)
  return predictions
}

export async function savePrediction(payload) {
  const { prediction } = await request.put(`/predictions/${payload.season}/${payload.round}`, {
    raceName: payload.raceName,
    podium: payload.podium,
    poleDriverId: payload.poleDriverId ?? undefined,
  })
  return prediction
}

export async function scorePrediction(predictionId, actualPodium, actualPole) {
  const { prediction } = await request.post(`/predictions/${predictionId}/scores`, {
    podium: actualPodium,
    poleDriverId: actualPole ?? undefined,
  })
  return prediction
}

export async function getLeaderboard() {
  const { leaderboard } = await request.get('/predictions/leaderboard')

  return leaderboard.map((row) => ({
    rank: row.position,
    userId: row.userId,
    points: row.totalPoints,
    scored: row.racesScored,
    exact: row.bestRace,
    user: { id: row.userId, username: row.username, displayName: row.username },
  }))
}

/* ------------------------------------------------------------------ */
/*  Moderation                                                         */
/* ------------------------------------------------------------------ */

export async function createReport(payload) {
  const { report } = await request.post('/reports', {
    targetType: payload.targetType,
    targetId: payload.targetId,
    reason: payload.reason,
  })
  return report
}

export async function listReports() {
  const { reports } = await request.get('/reports')
  return reports
}

export async function resolveReport(reportId, action) {
  const { report } = await request.patch(`/reports/${reportId}`, { action })
  return report
}
