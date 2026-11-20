/**
 * User — the account itself.
 *
 * The profile (favourites, bio, follows) lives in its own collection, as a
 * one-to-one relation. Keeping them apart means a request that only needs to
 * know "is this person logged in" does not drag a list of favourite circuits
 * along with it.
 *
 * This is the first of the three places every value is checked:
 *
 *   1. the React form       — immediate feedback, no round trip
 *   2. the route validator  — rejects bad requests before they reach a model
 *   3. THIS FILE            — the last line of defence, enforced by the
 *                             database layer no matter who is writing
 *
 * Levels 1 and 2 are convenience and politeness. This one is the guarantee:
 * a document that breaks these rules cannot be saved, whether it came from
 * our React app, from Postman, or from a script someone wrote at 3am.
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 10

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      // `set` runs before validation, so a pasted address with a stray space
      // is cleaned rather than rejected.
      set: (value) => (typeof value === 'string' ? value.trim() : value),
      match: [/.+@.+\..+/, 'Enter a valid email address'],
    },

    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username cannot be longer than 20 characters'],
      match: [/^[A-Za-z0-9_]+$/, 'Username can only contain letters, numbers and underscores'],
      set: (value) => (typeof value === 'string' ? value.trim() : value),
    },

    /**
     * `select: false` keeps the hash out of every query result unless it is
     * asked for explicitly with .select('+passwordHash'). It means a careless
     * res.json(user) cannot leak it — which is exactly the kind of mistake
     * that is easy to make and hard to notice.
     */
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    /**
     * Authorisation. In Phase 1 this was decided in the browser, which is a
     * convenience and not a security control — anyone can edit their own
     * JavaScript. Now it lives in the database and is checked on the server.
     */
    role: {
      type: String,
      enum: {
        values: ['member', 'moderator'],
        message: '{VALUE} is not a valid role',
      },
      default: 'member',
    },

    /** The six-digit email verification code, hashed like a password. */
    verification: {
      codeHash: { type: String, select: false },
      expiresAt: { type: Date, select: false },
      attempts: { type: Number, default: 0, min: 0, select: false },
    },
  },
  {
    // Gives us createdAt and updatedAt without maintaining them by hand.
    timestamps: true,

    // Virtuals (like `profile` below) are included when a document is turned
    // into JSON for a response.
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id?.toString()
        delete ret._id
        delete ret.__v
        delete ret.passwordHash
        delete ret.verification
        return ret
      },
    },
    toObject: { virtuals: true },
  },
)

/**
 * One-to-one with Profile, declared as a virtual so a User can be populated
 * with its profile even though the foreign key lives on the other side.
 */
userSchema.virtual('profile', {
  ref: 'Profile',
  localField: '_id',
  foreignField: 'user',
  justOne: true,
})

/** Hashes and stores a plain password. Never store the plain text. */
userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, BCRYPT_ROUNDS)
}

/**
 * Compares a submitted password against the stored hash.
 * Requires the document to have been loaded with .select('+passwordHash').
 */
userSchema.methods.checkPassword = function checkPassword(plain) {
  if (!this.passwordHash) return Promise.resolve(false)
  return bcrypt.compare(plain, this.passwordHash)
}

/** The shape the client is allowed to see. Nothing sensitive in here. */
userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    email: this.email,
    username: this.username,
    emailVerified: this.emailVerified,
    role: this.role,
    createdAt: this.createdAt,
  }
}

export default mongoose.model('User', userSchema)
