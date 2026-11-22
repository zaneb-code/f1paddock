import { request, query } from './http.js'

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
    mode: meetup.isOnline ? 'online' : 'in-person',
  }
}

function asProfile(profile) {
  if (!profile) return null

  return {
    ...profile,
    following: (profile.followedUsers ?? []).map(String),
  }
}

function asMatch(match) {
  return {
    profile: asProfile(match.profile),
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

async function orNull(promise) {
  try {
    return await promise
  } catch (error) {
    if (error.status === 404) return null
    throw error
  }
}

export async function ensureProfile() {
  const { profile } = await request.get('/profiles/me')
  return profile
}

export async function getProfile() {
  const { profile } = await request.get('/profiles/me')
  return asProfile(profile)
}

export async function getProfileByUsername(username) {
  const data = await orNull(request.get(`/profiles/${encodeURIComponent(username)}`))
  return asProfile(data?.profile ?? null)
}

export async function listProfiles() {
  const { profiles } = await request.get('/profiles')
  return profiles.map(asProfile)
}

export async function updateProfile(_userId, patch) {
  const { profile } = await request.patch('/profiles/me', patch)
  return asProfile(profile)
}

export async function toggleFollowUser(_viewerId, target) {
  const { profile } = await request.put(`/profiles/${encodeURIComponent(target)}/follow`)
  return asProfile(profile)
}

export async function toggleFollowEntity(_viewerId, kind, entityId) {
  const { profile } = await request.put(
    `/profiles/me/follows/${kind}/${encodeURIComponent(entityId)}`,
  )
  return asProfile(profile)
}

export async function findSimilarFans() {
  const { matches } = await request.get('/profiles/me/similar')
  return matches.map(asMatch)
}

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

export async function listPredictions({ season, round } = {}) {
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

export async function createReport(payload) {
  const { report } = await request.post('/reports', {
    targetType: payload.targetType,
    targetId: payload.targetId,
    reason: payload.reason,
  })
  return report
}

function asReport(report) {
  if (!report) return null

  const status =
    report.status === 'resolved'
      ? report.action === 'removed'
        ? 'actioned'
        : 'dismissed'
      : 'open'

  return {
    ...report,
    status,
    target: report.preview ? { body: report.preview.body, removed: false } : null,
    targetAuthor: report.preview?.author ? { displayName: report.preview.author } : null,
  }
}

const MODERATION_ACTIONS = { hide: 'removed', dismiss: 'dismissed' }

export async function listReports() {
  const { reports } = await request.get('/reports')
  return reports.map(asReport)
}

export async function resolveReport(reportId, action) {
  const { report } = await request.patch(`/reports/${reportId}`, {
    action: MODERATION_ACTIONS[action] ?? action,
  })
  return asReport(report)
}