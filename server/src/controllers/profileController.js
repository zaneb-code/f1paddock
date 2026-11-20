/**
 * Profiles: favourites, follows, and finding fans with similar taste.
 */

import mongoose from 'mongoose'
import Profile from '../models/Profile.js'
import User from '../models/User.js'
import { httpError } from '../middleware/errorHandler.js'

/** Weights for the fan-matching score. Drivers say most about a fan, eras least. */
const WEIGHTS = {
  favouriteDrivers: 4,
  favouriteTeams: 3,
  favouriteCircuits: 2,
  favouriteEras: 1,
}

/** How many values two lists have in common. */
function overlap(a = [], b = []) {
  const set = new Set(a)
  return b.filter((value) => set.has(value))
}

/* ------------------------------------------------------------------ */

/** GET /api/profiles/me */
export async function getMyProfile(req, res) {
  let profile = await Profile.findOne({ user: req.userId })

  // Self-healing: an account created before profiles existed, or one whose
  // profile was removed, gets one rather than a 404.
  if (!profile) {
    profile = await Profile.create({ user: req.userId, username: req.user.username })
  }

  res.json({ profile })
}

/** GET /api/profiles — the directory, used by the fan search page. */
export async function listProfiles(_req, res) {
  const profiles = await Profile.find().sort({ updatedAt: -1 }).limit(200)
  res.json({ count: profiles.length, profiles })
}

/** GET /api/profiles/:username */
export async function getProfileByUsername(req, res) {
  const profile = await Profile.findOne({ username: req.params.username })
  if (!profile) throw httpError(404, 'No fan by that name.')

  res.json({ profile })
}

/**
 * PATCH /api/profiles/me
 *
 * PATCH, not PUT: the client sends only the fields it is changing. A PUT
 * would mean "make the profile exactly this", and anything left out would
 * have to be cleared.
 */
export async function updateMyProfile(req, res) {
  // An allowlist, not a blocklist. Passing req.body straight to an update is
  // mass assignment: today it means someone can rename themselves, and the
  // day a `role` field is added to this collection it means something worse.
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

  // runValidators: true is essential. Mongoose skips schema validation on
  // update queries by default, because an update goes straight to MongoDB and
  // never passes through the document layer where validation lives. Without
  // this flag a 5000-character bio would save happily.
  const profile = await Profile.findOneAndUpdate({ user: req.userId }, patch, {
    new: true,
    runValidators: true,
  })

  if (!profile) throw httpError(404, 'Profile not found.')

  res.json({ profile })
}

/** PUT /api/profiles/me/follows/:kind/:entityId — follow or unfollow a driver or team. */
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

/**
 * PUT /api/profiles/:username/follow — follow or unfollow another fan.
 *
 * The parameter accepts a username or a user id. A username is what a person
 * types and what the URL should read as; an id is what the client already
 * holds after listing fans. Supporting both saves the caller a lookup, and
 * the two can never be confused because an id is 24 hex characters and a
 * username cannot contain anything but letters, digits and underscores.
 */
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

/**
 * GET /api/profiles/me/similar
 *
 * Scores every other fan on what they actually have in common with you, and
 * returns the best matches with the reasons, so the UI can say *why* rather
 * than just asserting a percentage.
 */
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
        // Highest possible score if you had everything in common, used to
        // turn the raw score into something a person can read.
        isFollowing: mine.followedUsers.some((id) => id.equals(other.user)),
      }
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)

  res.json({ count: scored.length, matches: scored })
}
