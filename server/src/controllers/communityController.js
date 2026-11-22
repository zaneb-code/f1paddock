import Community from '../models/Community.js'
import Post from '../models/Post.js'
import { httpError } from '../middleware/errorHandler.js'

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

export async function listCommunities(req, res) {
  const { type, search } = req.query

  const filter = {}
  if (type) filter.type = type
  if (search) {
    const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.name = new RegExp(safe, 'i')
  }

  const communities = await Community.find(filter).sort({ createdAt: -1 }).limit(200)
  const counts = await Post.aggregate([
    { $match: { community: { $ne: null } } },
    { $group: { _id: '$community', count: { $sum: 1 } } },
  ])
  const countBySlugId = Object.fromEntries(counts.map((row) => [row._id.toString(), row.count]))

  res.json({
    count: communities.length,
    communities: communities.map((community) => ({
      ...community.toJSON(),
      postCount: countBySlugId[community._id.toString()] ?? 0,
      memberIds: community.members.map((id) => id.toString()),
      memberCount: community.members.length,
    })),
  })
}

export async function getCommunity(req, res) {
  const community = await Community.findOne({ slug: req.params.slug }).populate(
    'creator',
    'username',
  )
  if (!community) throw httpError(404, 'No community at that address.')

  const postCount = await Post.countDocuments({ community: community._id })

  res.json({
    community: {
      ...community.toJSON(),
      postCount,
      memberIds: community.members.map((id) => id.toString()),
      memberCount: community.members.length,
    },
  })
}

export async function createCommunity(req, res) {
  const { name, description, type, refId } = req.body
  const slug = slugify(name)

  if (!slug) {
    return res.status(400).json({
      error: 'Please fix the highlighted fields.',
      fields: { name: 'Use at least a few letters or numbers' },
    })
  }

  const existing = await Community.findOne({ slug })
  if (existing) {
    return res.status(409).json({
      error: 'A community with a very similar name already exists.',
      fields: { name: 'Already taken' },
      slug: existing.slug,
    })
  }

  const community = await Community.create({
    name,
    slug,
    description: description ?? '',
    type: type ?? 'general',
    refId: refId ?? null,
    creator: req.userId,
    members: [req.userId],
  })

  res
    .status(201)
    .location(`/api/communities/${community.slug}`)
    .json({
      community: {
        ...community.toJSON(),
        postCount: 0,
        memberIds: [req.userId.toString()],
        memberCount: 1,
      },
    })
}

export async function toggleMembership(req, res) {
  const key = req.params.slug
  const community = /^[a-f\d]{24}$/i.test(key)
    ? await Community.findById(key)
    : await Community.findOne({ slug: key })

  if (!community) throw httpError(404, 'No community at that address.')

  const isMember = community.members.some((id) => id.equals(req.userId))

  community.members = isMember
    ? community.members.filter((id) => !id.equals(req.userId))
    : [...community.members, req.userId]

  await community.save()

  res.json({
    community: {
      ...community.toJSON(),
      memberIds: community.members.map((id) => id.toString()),
      memberCount: community.members.length,
    },
    member: !isMember,
  })
}
