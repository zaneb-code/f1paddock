/**
 * Meetups: fans arranging to watch a race together.
 */

import Meetup from '../models/Meetup.js'
import { httpError } from '../middleware/errorHandler.js'

function present(meetup, viewerId) {
  return {
    ...meetup.toJSON(),
    hostId: meetup.host?._id?.toString() ?? meetup.host?.toString(),
    hostName: meetup.host?.username ?? 'Unknown',
    attendeeIds: meetup.attendees.map((id) => (id._id ?? id).toString()),
    attendeeCount: meetup.attendees.length,
    attending: viewerId ? meetup.attendees.some((id) => (id._id ?? id).equals(viewerId)) : false,
    isFull: meetup.capacity ? meetup.attendees.length >= meetup.capacity : false,
  }
}

/** GET /api/meetups?raceRound=21&upcoming=true */
export async function listMeetups(req, res) {
  const { raceRound, season, upcoming } = req.query

  const filter = {}
  if (raceRound) filter.raceRound = Number(raceRound)
  if (season) filter.season = Number(season)
  if (upcoming === 'true') filter.startsAt = { $gte: new Date() }

  const meetups = await Meetup.find(filter)
    .populate('host', 'username')
    .sort({ startsAt: 1 })
    .limit(200)

  res.json({ count: meetups.length, meetups: meetups.map((m) => present(m, req.userId)) })
}

/** POST /api/meetups */
export async function createMeetup(req, res) {
  const { title, description, location, isOnline, startsAt, raceRound, season, capacity } = req.body

  const meetup = await Meetup.create({
    title,
    description: description ?? '',
    location,
    isOnline: Boolean(isOnline),
    startsAt,
    raceRound: raceRound ?? null,
    season: season ?? null,
    capacity: capacity ?? null,
    host: req.userId,
    // Hosting is attending.
    attendees: [req.userId],
  })

  await meetup.populate('host', 'username')

  res
    .status(201)
    .location(`/api/meetups/${meetup.id}`)
    .json({ meetup: present(meetup, req.userId) })
}

/** PUT /api/meetups/:id/attendance */
export async function toggleAttendance(req, res) {
  const meetup = await Meetup.findById(req.params.id).populate('host', 'username')
  if (!meetup) throw httpError(404, 'That meetup no longer exists.')

  const attending = meetup.attendees.some((id) => (id._id ?? id).equals(req.userId))

  if (!attending && meetup.capacity && meetup.attendees.length >= meetup.capacity) {
    // 409, not 400: the request is perfectly valid, the meetup is just full.
    return res.status(409).json({ error: 'That meetup is full.' })
  }

  meetup.attendees = attending
    ? meetup.attendees.filter((id) => !(id._id ?? id).equals(req.userId))
    : [...meetup.attendees, req.userId]

  await meetup.save()

  res.json({ meetup: present(meetup, req.userId), attending: !attending })
}

/** DELETE /api/meetups/:id — the host or a steward. */
export async function deleteMeetup(req, res) {
  const meetup = await Meetup.findById(req.params.id)
  if (!meetup) throw httpError(404, 'That meetup no longer exists.')

  const isHost = meetup.host.equals(req.userId)
  if (!isHost && req.user.role !== 'moderator') {
    return res.status(403).json({ error: 'Only the host can cancel a meetup.' })
  }

  await Meetup.findByIdAndDelete(meetup._id)
  res.status(204).end()
}
