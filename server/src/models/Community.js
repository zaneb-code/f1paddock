/**
 * Community — a driver, team or general discussion group.
 *
 * `slug` is what appears in the URL (/communities/max-verstappen), so it is
 * unique and indexed: every community page load looks a community up by it.
 */

import mongoose from 'mongoose'

const communitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Community name is required'],
      minlength: [3, 'Community name must be at least 3 characters'],
      maxlength: [50, 'Community name cannot be longer than 50 characters'],
      set: (value) => (typeof value === 'string' ? value.trim() : value),
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'],
    },

    description: {
      type: String,
      default: '',
      maxlength: [280, 'Description cannot be longer than 280 characters'],
      set: (value) => (typeof value === 'string' ? value.trim() : value),
    },

    type: {
      type: String,
      enum: {
        values: ['driver', 'team', 'general'],
        message: '{VALUE} is not a valid community type',
      },
      default: 'general',
    },

    /** The driver or constructor id this community is about, when it has one. */
    refId: {
      type: String,
      default: null,
    },

    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },

    members: {
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

/** How many posts this community has, without storing a counter that can drift. */
communitySchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'community',
  count: true,
})

export default mongoose.model('Community', communitySchema)
