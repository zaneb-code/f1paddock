/**
 * Meetup — fans watching a race together, online or in person.
 */

import mongoose from 'mongoose'

const meetupSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A meetup needs a title'],
      minlength: [4, 'Title must be at least 4 characters'],
      maxlength: [80, 'Title cannot be longer than 80 characters'],
      set: (value) => (typeof value === 'string' ? value.trim() : value),
    },

    description: {
      type: String,
      default: '',
      maxlength: [400, 'Description cannot be longer than 400 characters'],
      set: (value) => (typeof value === 'string' ? value.trim() : value),
    },

    location: {
      type: String,
      required: [true, 'A meetup needs a location — a place, or a link for online'],
      maxlength: [120, 'Location cannot be longer than 120 characters'],
      set: (value) => (typeof value === 'string' ? value.trim() : value),
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    startsAt: {
      type: Date,
      required: [true, 'A meetup needs a start time'],
      validate: {
        // Only checked on create: an existing meetup is allowed to age.
        validator(value) {
          if (!this.isNew) return true
          return value.getTime() > Date.now()
        },
        message: 'A new meetup has to start in the future',
      },
    },

    raceRound: {
      type: Number,
      default: null,
      min: [1, 'Round numbers start at 1'],
      max: [30, 'There is no round beyond 30'],
    },

    season: {
      type: Number,
      default: null,
      min: [1950, 'Formula 1 started in 1950'],
    },

    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },

    attendees: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },

    capacity: {
      type: Number,
      default: null,
      min: [2, 'A meetup needs room for at least two people'],
      max: [500, 'Keep it under 500 people'],
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

export default mongoose.model('Meetup', meetupSchema)
