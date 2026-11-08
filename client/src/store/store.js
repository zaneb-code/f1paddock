/**
 * ============================================================
 *  The Redux store
 * ============================================================
 *
 * Seven slices, each owning one area of the app:
 *
 *   auth        who is signed in — real JWT from the Express server
 *   profile     F1 profile: favourites, follows, similar-fan matching
 *   f1          everything fetched from the Jolpica F1 API
 *   social      communities, posts, comments, race discussion rooms
 *   predictions user predictions, AI predictions, scoring, leaderboard
 *   meetups     fan meetups
 *   moderation  reports and the admin queue
 *
 * configureStore wires up Redux DevTools and the thunk middleware that
 * createAsyncThunk needs, with no manual setup.
 */

import { configureStore } from '@reduxjs/toolkit'

import authReducer from './slices/authSlice'
import profileReducer from './slices/profileSlice'
import f1Reducer from './slices/f1Slice'
import socialReducer from './slices/socialSlice'
import predictionsReducer from './slices/predictionsSlice'
import meetupsReducer from './slices/meetupsSlice'
import moderationReducer from './slices/moderationSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    f1: f1Reducer,
    social: socialReducer,
    predictions: predictionsReducer,
    meetups: meetupsReducer,
    moderation: moderationReducer,
  },
  devTools: import.meta.env.MODE !== 'production',
})

export default store
