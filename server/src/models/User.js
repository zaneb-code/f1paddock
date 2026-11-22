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
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: {
        values: ['member', 'moderator'],
        message: '{VALUE} is not a valid role',
      },
      default: 'member',
    },

    verification: {
      codeHash: { type: String, select: false },
      expiresAt: { type: Date, select: false },
      attempts: { type: Number, default: 0, min: 0, select: false },
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
        delete ret.passwordHash
        delete ret.verification
        return ret
      },
    },
    toObject: { virtuals: true },
  },
)
userSchema.virtual('profile', {
  ref: 'Profile',
  localField: '_id',
  foreignField: 'user',
  justOne: true,
})
userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, BCRYPT_ROUNDS)
}
userSchema.methods.checkPassword = function checkPassword(plain) {
  if (!this.passwordHash) return Promise.resolve(false)
  return bcrypt.compare(plain, this.passwordHash)
}

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
