/**
 * Report — a piece of content a user has flagged for a moderator.
 */

import mongoose from 'mongoose'

const reportSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      required: true,
      enum: {
        values: ['post', 'comment', 'user'],
        message: '{VALUE} is not something you can report',
      },
      immutable: true,
    },

    targetId: {
      type: String,
      required: true,
      immutable: true,
    },

    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },

    reason: {
      type: String,
      required: [true, 'Say why you are reporting this'],
      minlength: [4, 'Give a little more detail than that'],
      maxlength: [300, 'Reason cannot be longer than 300 characters'],
      set: (value) => (typeof value === 'string' ? value.trim() : value),
    },

    status: {
      type: String,
      enum: ['open', 'resolved'],
      default: 'open',
      index: true,
    },

    /** What the moderator did about it. */
    action: {
      type: String,
      enum: {
        values: ['dismissed', 'removed', null],
        message: '{VALUE} is not a valid moderation action',
      },
      default: null,
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id?.toString()
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  },
)

// The moderation queue is always "open reports, newest first".
reportSchema.index({ status: 1, createdAt: -1 })

export default mongoose.model('Report', reportSchema)
