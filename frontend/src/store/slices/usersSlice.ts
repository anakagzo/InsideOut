import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { usersApi } from "@/api/insideoutApi";
import type {
  AuthTokens,
  ChangePasswordPayload,
  LoginPayload,
  RefreshTokensResponse,
  RegisterPayload,
  User,
  UserListResponse,
  UserUpdatePayload,
} from "@/api/types";
import { createRequestState, setFailed, setPending, setSucceeded } from "@/store/slices/requestState";

type FetchUsersParams = { page?: number; page_size?: number; search?: string; append?: boolean };

const mergeById = <T extends { id: number }>(current: T[], incoming: T[]) => {
  const map = new Map<number, T>();
  current.forEach((item) => map.set(item.id, item));
  incoming.forEach((item) => map.set(item.id, item));
  return [...map.values()];
};

const ACCESS_TOKEN_KEY = "insideout_access_token";
const REFRESH_TOKEN_KEY = "insideout_refresh_token";

const persistAuthTokens = (tokens: AuthTokens) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
};

const persistRefreshedTokens = (tokens: RefreshTokensResponse) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  if (tokens.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }
};

const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const loginUser = createAsyncThunk("users/login", async (payload: LoginPayload) => usersApi.login(payload));

export const registerUser = createAsyncThunk("users/register", async (payload: RegisterPayload) => usersApi.register(payload));

export const logoutUser = createAsyncThunk("users/logout", async () => usersApi.logout());

export const refreshTokens = createAsyncThunk<RefreshTokensResponse>("users/refresh", async () => usersApi.refresh());

export const fetchCurrentUser = createAsyncThunk("users/fetchMe", async () => usersApi.getMe());

export const updateCurrentUser = createAsyncThunk(
  "users/updateMe",
  async (payload: UserUpdatePayload) => usersApi.updateMe(payload),
);

export const changeCurrentUserPassword = createAsyncThunk(
  "users/changePassword",
  async (payload: ChangePasswordPayload) => usersApi.changePassword(payload),
);

export const fetchUsers = createAsyncThunk(
  "users/fetchList",
  async (params?: FetchUsersParams) => {
    const { append: _append, ...apiParams } = params ?? {};
    return usersApi.listUsers(apiParams);
  },
);

export const deleteUser = createAsyncThunk("users/delete", async (userId: number) => usersApi.deleteUser(userId));

interface UsersState {
  auth: {
    accessToken: string | null;
    refreshToken: string | null;
  };
  currentUser: User | null;
  usersList: UserListResponse | null;
  lastMessage: string | null;
  requests: {
    login: ReturnType<typeof createRequestState>;
    register: ReturnType<typeof createRequestState>;
    logout: ReturnType<typeof createRequestState>;
    refresh: ReturnType<typeof createRequestState>;
    fetchMe: ReturnType<typeof createRequestState>;
    updateMe: ReturnType<typeof createRequestState>;
    changePassword: ReturnType<typeof createRequestState>;
    fetchUsers: ReturnType<typeof createRequestState>;
    deleteUser: ReturnType<typeof createRequestState>;
  };
}

const initialState: UsersState = {
  auth: {
    accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  },
  currentUser: null,
  usersList: null,
  lastMessage: null,
  requests: {
    login: createRequestState(),
    register: createRequestState(),
    logout: createRequestState(),
    refresh: createRequestState(),
    fetchMe: createRequestState(),
    updateMe: createRequestState(),
    changePassword: createRequestState(),
    fetchUsers: createRequestState(),
    deleteUser: createRequestState(),
  },
};

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearUserMessage(state) {
      state.lastMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => setPending(state.requests.login))
      .addCase(loginUser.fulfilled, (state, action) => {
        persistAuthTokens(action.payload);
        state.auth.accessToken = action.payload.access_token;
        state.auth.refreshToken = action.payload.refresh_token;
        setSucceeded(state.requests.login);
      })
      .addCase(loginUser.rejected, (state, action) => setFailed(state.requests.login, action.error.message))
      .addCase(registerUser.pending, (state) => setPending(state.requests.register))
      .addCase(registerUser.fulfilled, (state, action) => {
        persistAuthTokens(action.payload);
        state.auth.accessToken = action.payload.access_token;
        state.auth.refreshToken = action.payload.refresh_token;
        setSucceeded(state.requests.register);
      })
      .addCase(registerUser.rejected, (state, action) => setFailed(state.requests.register, action.error.message))
      .addCase(logoutUser.pending, (state) => setPending(state.requests.logout))
      .addCase(logoutUser.fulfilled, (state, action) => {
        clearTokens();
        state.auth.accessToken = null;
        state.auth.refreshToken = null;
        state.currentUser = null;
        state.lastMessage = action.payload.message;
        setSucceeded(state.requests.logout);
      })
      .addCase(logoutUser.rejected, (state, action) => setFailed(state.requests.logout, action.error.message))
      .addCase(refreshTokens.pending, (state) => setPending(state.requests.refresh))
      .addCase(refreshTokens.fulfilled, (state, action) => {
        persistRefreshedTokens(action.payload);
        state.auth.accessToken = action.payload.access_token;
        if (action.payload.refresh_token) {
          state.auth.refreshToken = action.payload.refresh_token;
        }
        setSucceeded(state.requests.refresh);
      })
      .addCase(refreshTokens.rejected, (state, action) => setFailed(state.requests.refresh, action.error.message))
      .addCase(fetchCurrentUser.pending, (state) => setPending(state.requests.fetchMe))
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.currentUser = action.payload;
        setSucceeded(state.requests.fetchMe);
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => setFailed(state.requests.fetchMe, action.error.message))
      .addCase(updateCurrentUser.pending, (state) => setPending(state.requests.updateMe))
      .addCase(updateCurrentUser.fulfilled, (state, action) => {
        state.currentUser = action.payload;
        setSucceeded(state.requests.updateMe);
      })
      .addCase(updateCurrentUser.rejected, (state, action) => setFailed(state.requests.updateMe, action.error.message))
      .addCase(changeCurrentUserPassword.pending, (state) => setPending(state.requests.changePassword))
      .addCase(changeCurrentUserPassword.fulfilled, (state, action) => {
        state.lastMessage = action.payload.message;
        setSucceeded(state.requests.changePassword);
      })
      .addCase(changeCurrentUserPassword.rejected, (state, action) =>
        setFailed(state.requests.changePassword, action.error.message),
      )
      .addCase(fetchUsers.pending, (state) => setPending(state.requests.fetchUsers))
      .addCase(fetchUsers.fulfilled, (state, action) => {
        const shouldAppend = Boolean((action.meta.arg as FetchUsersParams | undefined)?.append && state.usersList);
        state.usersList = shouldAppend && state.usersList
          ? {
              data: mergeById(state.usersList.data, action.payload.data),
              pagination: action.payload.pagination,
            }
          : action.payload;
        setSucceeded(state.requests.fetchUsers);
      })
      .addCase(fetchUsers.rejected, (state, action) => setFailed(state.requests.fetchUsers, action.error.message))
      .addCase(deleteUser.pending, (state) => setPending(state.requests.deleteUser))
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.lastMessage = action.payload.message;
        setSucceeded(state.requests.deleteUser);
      })
      .addCase(deleteUser.rejected, (state, action) => setFailed(state.requests.deleteUser, action.error.message));
  },
});

export const { clearUserMessage } = usersSlice.actions;
export default usersSlice.reducer;
