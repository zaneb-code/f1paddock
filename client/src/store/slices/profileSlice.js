/**
 * ============================================================
 *  profileSlice — fan profiles, favourites, follows
 * ============================================================
 *
 * The account (email, password, JWT) lives in authSlice and on the server.
 * Everything that makes a profile an *F1* profile lives here: favourite
 * drivers, teams, circuits and eras, who you follow, and the similarity
 * matching that powers "find fans with similar interests".
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as db from '../../api/mockDb'

const reject = (error, rejectWithValue) =>
  rejectWithValue(error?.message ?? 'Something went wrong.')

/** Called after login — creates the profile row on first ever sign-in. */
export const loadMyProfile = createAsyncThunk(
  'profile/loadMine',
  async (user, { rejectWithValue }) => {
    try {
      return await db.ensureProfile(user)
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

export const saveProfile = createAsyncThunk(
  'profile/save',
  async ({ userId, patch }, { rejectWithValue }) => {
    try {
      return await db.updateProfile(userId, patch)
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

export const loadFans = createAsyncThunk('profile/loadFans', async (_, { rejectWithValue }) => {
  try {
    return await db.listProfiles()
  } catch (error) {
    return reject(error, rejectWithValue)
  }
})

export const loadSimilarFans = createAsyncThunk(
  'profile/loadSimilar',
  async (viewerId, { rejectWithValue }) => {
    try {
      return await db.findSimilarFans(viewerId)
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

export const loadPublicProfile = createAsyncThunk(
  'profile/loadPublic',
  async (username, { rejectWithValue }) => {
    try {
      const profile = await db.getProfileByUsername(username)
      if (!profile) throw new Error('No fan with that username.')
      return profile
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

export const followUser = createAsyncThunk(
  'profile/followUser',
  async ({ viewerId, targetId }, { rejectWithValue }) => {
    try {
      return await db.toggleFollowUser(viewerId, targetId)
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

/** Follow a driver or a team — the "follow favourite drivers/teams" requirement. */
export const followEntity = createAsyncThunk(
  'profile/followEntity',
  async ({ viewerId, kind, entityId }, { rejectWithValue }) => {
    try {
      return await db.toggleFollowEntity(viewerId, kind, entityId)
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

const initialState = {
  me: null,
  meStatus: 'idle',

  viewed: null,
  viewedStatus: 'idle',
  viewedError: null,

  fans: [],
  fansStatus: 'idle',

  similar: [],
  similarStatus: 'idle',

  error: null,
  notice: null,
}

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearProfileMessages(state) {
      state.error = null
      state.notice = null
    },
    clearMyProfile(state) {
      state.me = null
      state.meStatus = 'idle'
      state.similar = []
      state.similarStatus = 'idle'
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loadMyProfile.pending, (state) => {
        state.meStatus = 'loading'
      })
      .addCase(loadMyProfile.fulfilled, (state, action) => {
        state.meStatus = 'succeeded'
        state.me = action.payload
      })
      .addCase(loadMyProfile.rejected, (state, action) => {
        state.meStatus = 'failed'
        state.error = action.payload
      })

      .addCase(saveProfile.fulfilled, (state, action) => {
        state.me = action.payload
        state.notice = 'Profile saved.'
      })
      .addCase(saveProfile.rejected, (state, action) => {
        state.error = action.payload
      })

      .addCase(loadFans.pending, (state) => {
        state.fansStatus = 'loading'
      })
      .addCase(loadFans.fulfilled, (state, action) => {
        state.fansStatus = 'succeeded'
        state.fans = action.payload
      })
      .addCase(loadFans.rejected, (state, action) => {
        state.fansStatus = 'failed'
        state.error = action.payload
      })

      .addCase(loadSimilarFans.pending, (state) => {
        state.similarStatus = 'loading'
      })
      .addCase(loadSimilarFans.fulfilled, (state, action) => {
        state.similarStatus = 'succeeded'
        state.similar = action.payload
      })
      .addCase(loadSimilarFans.rejected, (state, action) => {
        state.similarStatus = 'failed'
        state.error = action.payload
      })

      .addCase(loadPublicProfile.pending, (state) => {
        state.viewedStatus = 'loading'
        state.viewedError = null
        state.viewed = null
      })
      .addCase(loadPublicProfile.fulfilled, (state, action) => {
        state.viewedStatus = 'succeeded'
        state.viewed = action.payload
      })
      .addCase(loadPublicProfile.rejected, (state, action) => {
        state.viewedStatus = 'failed'
        state.viewedError = action.payload
      })

      // Both follow actions return the updated viewer profile, and both
      // need the similar-fans list re-marked so the button flips instantly.
      .addCase(followUser.fulfilled, (state, action) => {
        state.me = action.payload
        state.similar = state.similar.map((row) => ({
          ...row,
          isFollowing: action.payload.following.includes(row.profile.id),
        }))
      })
      .addCase(followEntity.fulfilled, (state, action) => {
        state.me = action.payload
      })
  },
})

export const { clearProfileMessages, clearMyProfile } = profileSlice.actions

/* ---------- Selectors ---------- */
export const selectMyProfile = (state) => state.profile.me
export const selectMyProfileStatus = (state) => state.profile.meStatus
export const selectViewedProfile = (state) => state.profile.viewed
export const selectViewedStatus = (state) => state.profile.viewedStatus
export const selectViewedError = (state) => state.profile.viewedError
export const selectFans = (state) => state.profile.fans
export const selectFansStatus = (state) => state.profile.fansStatus
export const selectSimilarFans = (state) => state.profile.similar
export const selectSimilarStatus = (state) => state.profile.similarStatus
export const selectProfileError = (state) => state.profile.error
export const selectProfileNotice = (state) => state.profile.notice

/** Is the signed-in user following this driver / team? */
export const selectIsFollowingEntity = (kind, entityId) => (state) => {
  const me = state.profile.me
  if (!me) return false
  const list = kind === 'driver' ? me.followedDrivers : me.followedTeams
  return (list ?? []).includes(entityId)
}

export default profileSlice.reducer
