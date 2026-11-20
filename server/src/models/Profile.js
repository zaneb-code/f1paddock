/**
 * Profile — a fan's F1 identity: who they support and who they follow.
 *
 * Separate collection from User, joined by `user`. One profile per user,
 * which `unique: true` on that field enforces at the database level.
 */

import mongoose from 'mongoose'

/** A reusable definition for the arrays of ids we store as favourites. */
const idList = {
  type: [String],
  default: [],
  // Caps the array so a scripted client cannot push a million entries into
  // one document. Mongo documents have a 16MB ceiling; this keeps us far
  // from it and keeps the fan-matching query fast.
  validate: {
    validator: (list) => list.length <= 60,
    message: 'You can only keep up to 60 favourites in one category',
  },
}

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      immutable: true, // a profile can never be moved to another account
    },

    username: {
      type: String,
      required: true,
      index: true,
    },

    displayName: {
      type: String,
      default: '',
      maxlength: [40, 'Display name cannot be longer than 40 characters'],
      set: (value) => (typeof value === 'string' ? value.trim() : value),
    },

    bio: {
      type: String,
      default: '',
      maxlength: [200, 'Bio cannot be longer than 200 characters'],
      set: (value) => (typeof value === 'string' ? value.trim() : value),
    },

    favouriteDrivers: idList,
    favouriteTeams: idList,
    favouriteCircuits: idList,
    favouriteEras: idList,

    followedDrivers: idList,
    followedTeams: idList,

    followedUsers: {
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
        ret.userId = ret.user?.toString?.() ?? ret.user
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  },
)

export default mongoose.model('Profile', profileSchema)
