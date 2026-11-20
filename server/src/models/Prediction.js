/**
 * Prediction — one fan's podium call for one race.
 *
 * A compound unique index enforces one prediction per user per race. That
 * rule used to live in a Redux reducer, which worked for our own UI but
 * stopped nothing else; here the database refuses the second insert no
 * matter who is asking.
 */

import mongoose from 'mongoose'

const predictionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },

    season: {
      type: Number,
      required: true,
      min: [1950, 'Formula 1 started in 1950'],
      immutable: true,
    },

    round: {
      type: Number,
      required: true,
      min: [1, 'Round numbers start at 1'],
      max: [30, 'There is no round beyond 30'],
      immutable: true,
    },

    raceName: {
      type: String,
      required: true,
      maxlength: 80,
    },

    /** First, second and third, in order. Exactly three, all different. */
    podium: {
      type: [String],
      required: true,
      validate: [
        {
          validator: (list) => list.length === 3,
          message: 'Pick exactly three drivers for the podium',
        },
        {
          validator: (list) => new Set(list).size === list.length,
          message: 'The same driver cannot finish in two places',
        },
      ],
    },

    poleDriverId: {
      type: String,
      default: null,
    },

    points: {
      type: Number,
      default: 0,
      min: 0,
    },

    scored: {
      type: Boolean,
      default: false,
    },

    scoredAt: {
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
        ret.userId = ret.user?._id?.toString?.() ?? ret.user?.toString?.() ?? ret.user
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  },
)

// One prediction per user per race, enforced by the database.
predictionSchema.index({ user: 1, season: 1, round: 1 }, { unique: true })

export default mongoose.model('Prediction', predictionSchema)
