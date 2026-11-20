/**
 * Comments on posts.
 *
 * The routes are nested one level — /api/posts/:postId/comments — because a
 * comment list only means anything inside a post. Acting on one comment that
 * already has an id uses the shallow /api/comments/:id instead, which cannot
 * contradict itself the way /api/posts/7/comments/3 can when comment 3
 * belongs to post 5.
 */

import Comment from '../models/Comment.js'
import Post from '../models/Post.js'
import { httpError } from '../middleware/errorHandler.js'

function present(comment) {
  return {
    ...comment.toJSON(),
    postId: comment.post?.toString(),
    authorId: comment.author?._id?.toString() ?? comment.author?.toString(),
    authorName: comment.author?.username ?? 'Unknown',
  }
}

/** GET /api/posts/:postId/comments */
export async function listComments(req, res) {
  const post = await Post.findById(req.params.postId)
  if (!post) throw httpError(404, 'That post no longer exists.')

  const comments = await Comment.find({ post: post._id })
    .populate('author', 'username')
    .sort({ createdAt: 1 })
    .limit(200)

  res.json({ count: comments.length, comments: comments.map(present) })
}

/** POST /api/posts/:postId/comments */
export async function createComment(req, res) {
  const post = await Post.findById(req.params.postId)
  if (!post) throw httpError(404, 'That post no longer exists.')

  const comment = await Comment.create({
    post: post._id,
    author: req.userId,
    body: req.body.body,
  })

  await comment.populate('author', 'username')

  res
    .status(201)
    .location(`/api/comments/${comment.id}`)
    .json({ comment: present(comment) })
}

/** DELETE /api/comments/:id */
export async function deleteComment(req, res) {
  const comment = await Comment.findById(req.params.id)
  if (!comment) throw httpError(404, 'That comment is already gone.')

  const isAuthor = comment.author.equals(req.userId)
  const isModerator = req.user.role === 'moderator'

  if (!isAuthor && !isModerator) {
    return res.status(403).json({ error: 'You can only delete your own comments.' })
  }

  await Comment.findByIdAndDelete(comment._id)
  res.status(204).end()
}
