import Profile from '../models/Profile.js'
import User from '../models/User.js'
import { httpError } from '../middleware/errorHandler.js'

const WEIGHTS = {
  favouriteDrivers: 4,
  favouriteTeams: 3,
  favouriteCircuits: 2,
  favouriteEras: 1,
}

function overlap(a = [], b = []) {
  const set = new Set(a)
  return b.filter((value) => set.has(value))
}

export async function getMyProfile(req, res) {
  let profile = await Profile.findOne({ user: req.userId })

  if (!profile) {
    profile = await Profile.create({ user: req.userId, username: req.user.username })
  }

  res.json({ profile })
}

export async function listProfiles(_req, res) {
  const profiles = await Profile.find().sort({ updatedAt: -1 }).limit(200)
  res.json({ count: profiles.length, profiles })
}

export async function getProfileByUsername(req, res) {
  const profile = await Profile.findOne({ username: req.params.username })
  if (!profile) throw httpError(404, 'No fan by that name.')

  res.json({ profile })
}

export async function updateMyProfile(req, res) {
  const ALLOWED = [
    'displayName',
    'bio',
    'favouriteDrivers',
    'favouriteTeams',
    'favouriteCircuits',
    'favouriteEras',
    'followedDrivers',
    'followedTeams',
  ]

  const patch = {}
  for (const field of ALLOWED) {
    if (field in req.body) patch[field] = req.body[field]
  }

  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'Nothing to change.' })
  }

  const profile = await Profile.findOneAndUpdate({ user: req.userId }, patch, {
    new: true,
    runValidators: true,
  })

  if (!profile) throw httpError(404, 'Profile not found.')

  res.json({ profile })
}

export async function toggleFollowEntity(req, res) {
  const { kind, entityId } = req.params
  const field = kind === 'driver' ? 'followedDrivers' : 'followedTeams'

  const profile = await Profile.findOne({ user: req.userId })
  if (!profile) throw httpError(404, 'Profile not found.')

  const current = profile[field] ?? []
  const following = current.includes(entityId)

  profile[field] = following ? current.filter((id) => id !== entityId) : [...current, entityId]
  await profile.save()

  res.json({ profile, following: !following })
}

export async function toggleFollowUser(req, res) {
  const key = req.params.username

  const target = /^[a-f\d]{24}$/i.test(key)
    ? await User.findById(key)
    : await User.findOne({ username: key })

  if (!target) throw httpError(404, 'No fan by that name.')

  if (target._id.equals(req.userId)) {
    return res.status(400).json({ error: 'You cannot follow yourself.' })
  }

  const profile = await Profile.findOne({ user: req.userId })
  if (!profile) throw httpError(404, 'Profile not found.')

  const following = profile.followedUsers.some((id) => id.equals(target._id))

  profile.followedUsers = following
    ? profile.followedUsers.filter((id) => !id.equals(target._id))
    : [...profile.followedUsers, target._id]

  await profile.save()

  res.json({ profile, following: !following })
}

export async function findSimilarFans(req, res) {
  const mine = await Profile.findOne({ user: req.userId })
  if (!mine) throw httpError(404, 'Profile not found.')

  const others = await Profile.find({ user: { $ne: req.userId } }).limit(300)

  const scored = others
    .map((other) => {
      const shared = {}
      let score = 0

      for (const [field, weight] of Object.entries(WEIGHTS)) {
        const common = overlap(mine[field], other[field])
        if (common.length > 0) {
          shared[field] = common
          score += common.length * weight
        }
      }

      return {
        profile: other.toJSON(),
        score,
        shared,
        isFollowing: mine.followedUsers.some((id) => id.equals(other.user)),
      }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)

  res.json({ count: scored.length, matches: scored })
}