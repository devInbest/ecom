import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI, setCsrfToken } from '../../services/api';

const extractError = (err, fallback) => {
  if (typeof err === 'string') return err;
  const data = err?.response?.data || err;
  if (data?.error?.message) return data.error.message;
  if (data?.message) return data.message;
  return fallback;
};

export const login = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try {
    const res = await authAPI.login(data);
    if (res.csrfToken) setCsrfToken(res.csrfToken);
    return res;
  } catch (err) {
    return rejectWithValue(extractError(err, 'Login failed'));
  }
});

export const acceptInvitation = createAsyncThunk('auth/acceptInvitation', async (data, { rejectWithValue }) => {
  try {
    const res = await authAPI.acceptInvitation(data);
    if (res.csrfToken) setCsrfToken(res.csrfToken);
    return res;
  } catch (err) {
    return rejectWithValue(extractError(err, 'Failed to accept invitation'));
  }
});

export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async (_, { rejectWithValue }) => {
  try {
    const res = await authAPI.getMe();
    return res.user || res;
  } catch (err) {
    try {
      const refreshRes = await authAPI.refresh();
      if (refreshRes.csrfToken) setCsrfToken(refreshRes.csrfToken);
      const meRes = await authAPI.getMe();
      return { ...(meRes.user || meRes), permissions: refreshRes.permissions || meRes.user?.permissions };
    } catch {
      return rejectWithValue(extractError(err, 'Not authenticated'));
    }
  }
});

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await authAPI.logout();
    setCsrfToken('');
    return true;
  } catch (err) {
    setCsrfToken('');
    return rejectWithValue(extractError(err, 'Logout failed'));
  }
});

export const register = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    return await authAPI.register(data);
  } catch (err) {
    return rejectWithValue(extractError(err, 'Registration failed'));
  }
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const res = await authAPI.getMe();
    return res.user || res;
  } catch (err) {
    return rejectWithValue(extractError(err, 'Failed to load profile'));
  }
});

export const fetchAvatar = createAsyncThunk('auth/fetchAvatar', async (_, { getState, rejectWithValue }) => {
  try {
    if (!getState().auth.user?.hasAvatar) return '';
    const res = await authAPI.getAvatar();
    return res.avatarPreview || '';
  } catch (err) {
    return rejectWithValue(extractError(err, 'Failed to load photo'));
  }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (data, { rejectWithValue }) => {
  try {
    const res = await authAPI.updateProfile(data);
    if (res.user) {
      return { user: res.user, avatarPreview: res.avatarPreview || '' };
    }
    return { user: res, avatarPreview: undefined };
  } catch (err) {
    return rejectWithValue(extractError(err, 'Update failed'));
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    permissions: [],
    avatarPreview: '',
    isAuthenticated: false,
    isLoading: true,
    loading: false,
    error: null,
  },
  reducers: {
    clearAuth: (state) => {
      state.user = null;
      state.permissions = [];
      state.avatarPreview = '';
      state.isAuthenticated = false;
      state.isLoading = false;
      setCsrfToken('');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const handlePending = (state) => {
      state.loading = true;
      state.error = null;
    };
    const handleAuthFulfilled = (state, action) => {
      state.loading = false;
      state.error = null;
      state.user = action.payload.user;
      state.permissions = action.payload.permissions || action.payload.user?.permissions || [];
      state.isAuthenticated = true;
      state.isLoading = false;
      state.avatarPreview = '';
    };
    const handleRejected = (state, action) => {
      state.loading = false;
      state.error = action.payload;
    };

    builder
      .addCase(bootstrapAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.permissions = action.payload.permissions || [];
        state.isAuthenticated = true;
        state.isLoading = false;
        if (!action.payload?.hasAvatar) state.avatarPreview = '';
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.user = null;
        state.permissions = [];
        state.isAuthenticated = false;
        state.isLoading = false;
      })
      .addCase(login.pending, handlePending)
      .addCase(login.fulfilled, handleAuthFulfilled)
      .addCase(login.rejected, handleRejected)
      .addCase(acceptInvitation.pending, handlePending)
      .addCase(acceptInvitation.fulfilled, handleAuthFulfilled)
      .addCase(acceptInvitation.rejected, handleRejected)
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.permissions = [];
        state.isAuthenticated = false;
        state.avatarPreview = '';
        state.loading = false;
      })
      .addCase(register.pending, handlePending)
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(register.rejected, handleRejected)
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.permissions = action.payload.permissions || state.permissions;
        state.isAuthenticated = true;
        if (!action.payload?.hasAvatar) state.avatarPreview = '';
      })
      .addCase(fetchAvatar.fulfilled, (state, action) => {
        state.avatarPreview = action.payload || '';
      })
      .addCase(updateProfile.pending, handlePending)
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        if (action.payload.avatarPreview !== undefined) {
          state.avatarPreview = action.payload.avatarPreview || '';
        }
      })
      .addCase(updateProfile.rejected, handleRejected);
  },
});

export const { clearAuth, clearError } = authSlice.actions;
export default authSlice.reducer;
