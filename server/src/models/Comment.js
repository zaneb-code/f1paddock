/**
 * Comment — a reply to a post.
 *
 * One-to-many: a post has many comments, each comment belongs to one post.
 * The `post` field is the foreign key, indexed because every time a post is
 * opened we query comments by it.
 */

import mongoose from 'mongoose'

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      immutable: true,
      index: true,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },

    body: {
      type: String,
      required: [true, 'A comment cannot be empty'],
      minlength: [2, 'A comment must be at least 2 characters'],
      maxlength: [500, 'A comment cannot be longer than 500 characters'],
      set: (value) => (typeof value === 'string' ? value.trim() : value),
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

export default mongoose.model('Comment', commentSchema)
