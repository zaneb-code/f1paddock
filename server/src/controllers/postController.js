/**
 * Posts: community feeds and race discussion rooms.
 */

import Post from '../models/Post.js'
import Community from '../models/Community.js'
import Comment from '../models/Comment.js'
import { httpError } from '../middleware/errorHandler.js'

/**
 * Turns a post document into the shape the client wants: author name
 * flattened, counts resolved, and whether *you* have liked it.
 */
function present(post, viewerId, commentCount = 0) {
  const json = post.toJSON()

  return {
    ...json,
    authorId: post.author?._id?.toString() ?? post.author?.toString(),
    authorName: post.author?.username ?? 'Unknown',
    communityId: post.community?._id?.toString() ?? post.community?.toString() ?? null,
    communityName: post.community?.name ?? null,
    communitySlug: post.community?.slug ?? null,
    likedBy: post.likes.map((id) => (id._id ?? id).toString()),
    likeCount: post.likes.length,
    likedByMe: viewerId ? post.likes.some((id) => id.equals(viewerId)) : false,
    commentCount,
  }
}

/**
 * GET /api/posts?communityId=…&raceRound=…&author=…&search=…
 *
 * Filtering lives in the query string, never in the path: the path names the
 * resource, the query narrows the view of it.
 */
export async function listPosts(req, res) {
  const { communityId, communitySlug, raceRound, season, author, search } = req.query

  const filter = {}

  if (communityId) filter.community = communityId

  if (communitySlug) {
    const community = await Community.findOne({ slug: communitySlug })
    if (!community) return res.json({ count: 0, posts: [] })
    filter.community = community._id
  }

  if (raceRound) {
    filter.raceRound = Number(raceRound)
    if (season) filter.season = Number(season)
  }

  if (author) filter.author = author

  if (search) {
    const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.body = new RegExp(safe, 'i')
  }

  const posts = await Post.find(filter)
    .populate('author', 'username')
    .populate('community', 'name slug')
    .sort({ createdAt: -1 })
    .limit(100)

  // One aggregate for all the comment counts, rather than a query per post.
  const counts = await Comment.aggregate([
    { $match: { post: { $in: posts.map((post) => post._id) } } },
    { $group: { _id: '$post', count: { $sum: 1 } } },
  ])
  const byPost = Object.fromEntries(counts.map((row) => [row._id.toString(), row.count]))

  res.json({
    count: posts.length,
    posts: posts.map((post) => present(post, req.userId, byPost[post._id.toString()] ?? 0)),
  })
}

/** POST /api/posts */
export async function createPost(req, res) {
  const { body, communityId, raceRound, season } = req.body

  if (communityId) {
    const community = await Community.findById(communityId)
    if (!community) throw httpError(404, 'That community does not exist.')
  }

  const post = await Post.create({
    author: req.userId,
    body,
    community: communityId ?? null,
    raceRound: raceRound ?? null,
    season: season ?? null,
  })

  await post.populate('author', 'username')
  await post.populate('community', 'name slug')

  res
    .status(201)
    .location(`/api/posts/${post.id}`)
    .json({ post: present(post, req.userId, 0) })
}

/** GET /api/posts/:id */
export async function getPost(req, res) {
  const post = await Post.findById(req.params.id)
    .populate('author', 'username')
    .populate('community', 'name slug')

  if (!post) throw httpError(404, 'That post no longer exists.')

  const commentCount = await Comment.countDocuments({ post: post._id })
  res.json({ post: present(post, req.userId, commentCount) })
}

/**
 * DELETE /api/posts/:id
 *
 * Authorisation on the server, where it belongs: you can delete your own
 * post, a moderator can delete anyone's. Phase 1 decided this in the browser,
 * which hid the button and stopped nothing.
 */
export async function deletePost(req, res) {
  const post = await Post.findById(req.params.id)
  if (!post) throw httpError(404, 'That post no longer exists.')

  const isAuthor = post.author.equals(req.userId)
  const isModerator = req.user.role === 'moderator'

  if (!isAuthor && !isModerator) {
    return res.status(403).json({ error: 'You can only delete your own posts.' })
  }

  // findOneAndDelete, not deleteOne, because the cascade hook on the model
  // listens for it — comments and reports go with the post.
  await Post.findOneAndDelete({ _id: post._id })

  // 204: it worked and there is deliberately nothing to send back.
  res.status(204).end()
}

/** PUT /api/posts/:id/like — the like is the resource, so it gets a noun. */
export async function toggleLike(req, res) {
  const post = await Post.findById(req.params.id)
    .populate('author', 'username')
    .populate('community', 'name slug')

  if (!post) throw httpError(404, 'That post no longer exists.')

  const liked = post.likes.some((id) => id.equals(req.userId))

  post.likes = liked
    ? post.likes.filter((id) => !id.equals(req.userId))
    : [...post.likes, req.userId]

  await post.save()

  const commentCount = await Comment.countDocuments({ post: post._id })
  res.json({ post: present(post, req.userId, commentCount), liked: !liked })
}
