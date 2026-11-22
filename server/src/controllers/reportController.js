import Report from '../models/Report.js'
import Post from '../models/Post.js'
import Comment from '../models/Comment.js'
import { httpError } from '../middleware/errorHandler.js'

export async function createReport(req, res) {
  const { targetType, targetId, reason } = req.body

  const exists =
    targetType === 'post'
      ? await Post.exists({ _id: targetId })
      : targetType === 'comment'
        ? await Comment.exists({ _id: targetId })
        : true

  if (!exists) throw httpError(404, 'That content no longer exists.')

  const already = await Report.findOne({
    targetType,
    targetId,
    reporter: req.userId,
    status: 'open',
  })

  if (already) {
    return res.status(409).json({ error: 'You have already reported this.' })
  }

  const report = await Report.create({ targetType, targetId, reporter: req.userId, reason })

  res.status(201).json({ report })
}

export async function listReports(req, res) {
  const filter = {}
  if (req.query.status) filter.status = req.query.status

  const reports = await Report.find(filter)
    .populate('reporter', 'username')
    .populate('resolvedBy', 'username')
    .sort({ status: 1, createdAt: -1 })
    .limit(200)

  const withPreview = await Promise.all(
    reports.map(async (report) => {
      let preview = null

      if (report.targetType === 'post') {
        const post = await Post.findById(report.targetId).populate('author', 'username')
        preview = post ? { body: post.body, author: post.author?.username } : null
      } else if (report.targetType === 'comment') {
        const comment = await Comment.findById(report.targetId).populate('author', 'username')
        preview = comment ? { body: comment.body, author: comment.author?.username } : null
      }

      return { ...report.toJSON(), preview }
    }),
  )

  res.json({ count: withPreview.length, reports: withPreview })
}

export async function resolveReport(req, res) {
  const { action } = req.body

  const report = await Report.findById(req.params.id)
  if (!report) throw httpError(404, 'That report no longer exists.')

  if (report.status === 'resolved') {
    return res.status(409).json({ error: 'That report has already been dealt with.' })
  }

  report.status = 'resolved'
  report.action = action
  report.resolvedBy = req.userId
  report.resolvedAt = new Date()
  await report.save()

  if (action === 'removed') {
    if (report.targetType === 'post') {
      await Post.findOneAndDelete({ _id: report.targetId })
    } else if (report.targetType === 'comment') {
      await Comment.findByIdAndDelete(report.targetId)
    }
  }

  await report.populate('reporter', 'username')
  await report.populate('resolvedBy', 'username')

  res.json({ report })
}