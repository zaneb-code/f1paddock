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
