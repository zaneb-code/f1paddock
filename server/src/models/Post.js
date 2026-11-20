/**
 * Post — one message in a community feed or a race discussion room.
 *
 * A race discussion room is just a post with `raceRound` set instead of
 * `community`. Everything built for community posts — liking, commenting,
 * reporting, searching — works in a race room with no extra code. The
 * validator below enforces that a post belongs to exactly one of the two.
 */

import mongoose from 'mongoose'

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
      index: true,
    },

    body: {
      type: String,
      required: [true, 'A post cannot be empty'],
      minlength: [2, 'A post must be at least 2 characters'],
      maxlength: [1000, 'A post cannot be longer than 1000 characters'],
      set: (value) => (typeof value === 'string' ? value.trim() : value),
    },

    /**
     * A post lives in a community OR a race room — never both, never neither.
     *
     * This is a rule spanning two fields, so it goes in a custom validator
     * rather than on either field's own options. It is attached to
     * `community` because a validator needs a field to hang on; `this` is
     * the whole document, so it can see raceRound too.
     *
     * Worth knowing: on an update query `this` is the query rather than the
     * document, so a validator written like this cannot see sibling fields
     * during findOneAndUpdate. Posts are never edited in this app, so that
     * does not bite here — but it is the reason a rule like this belongs in
     * the controller as well if updates are ever added.
     */
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Community',
      default: null,
      index: true,
      validate: [
        {
          validator: function notBoth(value) {
            return !(Boolean(value) && this.raceRound !== null && this.raceRound !== undefined)
          },
          message: 'A post belongs to a community or a race room, not both',
        },
        {
          validator: function atLeastOne(value) {
            return Boolean(value) || (this.raceRound !== null && this.raceRound !== undefined)
          },
          message: 'A post must belong to a community or a race room',
        },
      ],
    },

    /** Set instead of `community` when the post belongs to a race room. */
    raceRound: {
      type: Number,
      default: null,
      min: [1, 'Round numbers start at 1'],
      max: [30, 'There is no round beyond 30'],
      index: true,
    },

    season: {
      type: Number,
      default: null,
      min: [1950, 'Formula 1 started in 1950'],
    },

    likes: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
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
    toObject: { virtuals: true },
  },
)

postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post',
  count: true,
})

/**
 * MongoDB does not enforce foreign keys, so cascading deletes are our job.
 * Without this, deleting a post would leave its comments and reports behind
 * as orphans that no query ever reaches but every backup still carries.
 */
postSchema.pre('findOneAndDelete', async function cascade(next) {
  const doc = await this.model.findOne(this.getFilter())
  if (doc) {
    const { default: Comment } = await import('./Comment.js')
    const { default: Report } = await import('./Report.js')
    await Comment.deleteMany({ post: doc._id })
    await Report.deleteMany({ targetType: 'post', targetId: doc._id.toString() })
  }
  next()
})

export default mongoose.model('Post', postSchema)
