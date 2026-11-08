/**
 * ============================================================
 *  socialSlice — communities, posts and comments
 * ============================================================
 *
 * Covers four of the proposal's functionalities at once:
 *   - driver/team-based communities
 *   - posts, comments, likes and discussions
 *   - race-specific discussion rooms (a post with a raceRound attached)
 *   - search and filter across discussions
 *
 * A race discussion room is deliberately not a separate entity. It is just a
 * post whose `raceRound` is set instead of its `communityId`, which means
 * every feature built for community posts — liking, commenting, reporting,
 * searching — works in a race room with no extra code.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as db from '../../api/mockDb'

const reject = (error, rejectWithValue) =>
  rejectWithValue(error?.message ?? 'Something went wrong.')

/* ---------- Communities ---------- */

export const loadCommunities = createAsyncThunk(
  'social/loadCommunities',
  async (_, { rejectWithValue }) => {
    try {
      return await db.listCommunities()
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

export const loadCommunity = createAsyncThunk(
  'social/loadCommunity',
  async (slug, { rejectWithValue }) => {
    try {
      const community = await db.getCommunity(slug)
      if (!community) throw new Error('That community does not exist.')
      return community
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

export const createCommunity = createAsyncThunk(
  'social/createCommunity',
  async (payload, { rejectWithValue }) => {
    try {
      return await db.createCommunity(payload)
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

export const joinCommunity = createAsyncThunk(
  'social/joinCommunity',
  async ({ communityId, userId }, { rejectWithValue }) => {
    try {
      return await db.toggleCommunityMembership(communityId, userId)
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

/* ---------- Posts ---------- */

export const loadPosts = createAsyncThunk(
  'social/loadPosts',
  async (filters, { rejectWithValue }) => {
    try {
      return await db.listPosts(filters)
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

export const addPost = createAsyncThunk('social/addPost', async (payload, { rejectWithValue }) => {
  try {
    return await db.createPost(payload)
  } catch (error) {
    return reject(error, rejectWithValue)
  }
})

export const removePost = createAsyncThunk(
  'social/removePost',
  async ({ postId, requesterId }, { rejectWithValue }) => {
    try {
      return await db.deletePost(postId, requesterId)
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

export const likePost = createAsyncThunk(
  'social/likePost',
  async ({ postId, userId }, { rejectWithValue }) => {
    try {
      return await db.togglePostLike(postId, userId)
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

/* ---------- Comments ---------- */

export const loadComments = createAsyncThunk(
  'social/loadComments',
  async (postId, { rejectWithValue }) => {
    try {
      return { postId, comments: await db.listComments(postId) }
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

export const addComment = createAsyncThunk(
  'social/addComment',
  async (payload, { rejectWithValue }) => {
    try {
      return await db.createComment(payload)
    } catch (error) {
      return reject(error, rejectWithValue)
    }
  }
)

const initialState = {
  communities: [],
  communitiesStatus: 'idle',

  community: null,
  communityStatus: 'idle',
  communityError: null,

  posts: [],
  postsStatus: 'idle',
  postsError: null,

  // postId -> array of comments. Keeping them keyed means opening a second
  // post's comments does not wipe the first one's.
  commentsByPost: {},
  commentsStatus: 'idle',

  // Free-text search across discussions
  search: '',

  error: null,
  notice: null,
}

const socialSlice = createSlice({
  name: 'social',
  initialState,
  reducers: {
    setSearch(state, action) {
      state.search = action.payload
    },
    clearSocialMessages(state) {
      state.error = null
      state.notice = null
    },
    clearCommunity(state) {
      state.community = null
      state.communityStatus = 'idle'
      state.posts = []
      state.postsStatus = 'idle'
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loadCommunities.pending, (state) => {
        state.communitiesStatus = 'loading'
      })
      .addCase(loadCommunities.fulfilled, (state, action) => {
        state.communitiesStatus = 'succeeded'
        state.communities = action.payload
      })
      .addCase(loadCommunities.rejected, (state, action) => {
        state.communitiesStatus = 'failed'
        state.error = action.payload
      })

      .addCase(loadCommunity.pending, (state) => {
        state.communityStatus = 'loading'
        state.communityError = null
      })
      .addCase(loadCommunity.fulfilled, (state, action) => {
        state.communityStatus = 'succeeded'
        state.community = action.payload
      })
      .addCase(loadCommunity.rejected, (state, action) => {
        state.communityStatus = 'failed'
        state.communityError = action.payload
      })

      .addCase(createCommunity.fulfilled, (state, action) => {
        state.communities.unshift({ ...action.payload, postCount: 0 })
        state.notice = `Created "${action.payload.name}".`
      })
      .addCase(createCommunity.rejected, (state, action) => {
        state.error = action.payload
      })

      .addCase(joinCommunity.fulfilled, (state, action) => {
        const updated = action.payload
        if (state.community?.id === updated.id) {
          state.community = { ...state.community, memberIds: updated.memberIds }
        }
        state.communities = state.communities.map((c) =>
          c.id === updated.id ? { ...c, memberIds: updated.memberIds } : c
        )
      })

      .addCase(loadPosts.pending, (state) => {
        state.postsStatus = 'loading'
        state.postsError = null
      })
      .addCase(loadPosts.fulfilled, (state, action) => {
        state.postsStatus = 'succeeded'
        state.posts = action.payload
      })
      .addCase(loadPosts.rejected, (state, action) => {
        state.postsStatus = 'failed'
        state.postsError = action.payload
      })

      .addCase(addPost.fulfilled, (state, action) => {
        state.posts.unshift(action.payload)
      })
      .addCase(addPost.rejected, (state, action) => {
        state.error = action.payload
      })

      .addCase(removePost.fulfilled, (state, action) => {
        state.posts = state.posts.filter((p) => p.id !== action.payload)
        state.notice = 'Post deleted.'
      })
      .addCase(removePost.rejected, (state, action) => {
        state.error = action.payload
      })

      .addCase(likePost.fulfilled, (state, action) => {
        state.posts = state.posts.map((p) =>
          p.id === action.payload.id ? { ...p, likedBy: action.payload.likedBy } : p
        )
      })

      .addCase(loadComments.pending, (state) => {
        state.commentsStatus = 'loading'
      })
      .addCase(loadComments.fulfilled, (state, action) => {
        state.commentsStatus = 'succeeded'
        state.commentsByPost[action.payload.postId] = action.payload.comments
      })

      .addCase(addComment.fulfilled, (state, action) => {
        const { postId } = action.payload
        state.commentsByPost[postId] = [...(state.commentsByPost[postId] ?? []), action.payload]

        // Keep the count on the post card in step with the new comment.
        state.posts = state.posts.map((p) =>
          p.id === postId ? { ...p, commentCount: (p.commentCount ?? 0) + 1 } : p
        )
      })
      .addCase(addComment.rejected, (state, action) => {
        state.error = action.payload
      })
  },
})

export const { setSearch, clearSocialMessages, clearCommunity } = socialSlice.actions

/* ---------- Selectors ---------- */
export const selectCommunities = (state) => state.social.communities
export const selectCommunitiesStatus = (state) => state.social.communitiesStatus
export const selectCommunity = (state) => state.social.community
export const selectCommunityStatus = (state) => state.social.communityStatus
export const selectCommunityError = (state) => state.social.communityError

export const selectPosts = (state) => state.social.posts
export const selectPostsStatus = (state) => state.social.postsStatus
export const selectPostsError = (state) => state.social.postsError

export const selectCommentsFor = (postId) => (state) => state.social.commentsByPost[postId] ?? []
export const selectSearch = (state) => state.social.search
export const selectSocialError = (state) => state.social.error
export const selectSocialNotice = (state) => state.social.notice

/** Communities the signed-in user has joined. */
export const selectMyCommunities = (state) => {
  const userId = state.auth.user?.id
  if (!userId) return []
  return state.social.communities.filter((c) => c.memberIds?.includes(userId))
}

export default socialSlice.reducer
