import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { notificationSettingsApi } from "@/api/insideoutApi";
import type { NotificationSettings, NotificationSettingsPayload } from "@/api/types";
import { createRequestState, setFailed, setPending, setSucceeded } from "@/store/slices/requestState";

export const fetchNotificationSettings = createAsyncThunk(
  "notificationSettings/fetchMine",
  async () => notificationSettingsApi.getMine(),
);

export const upsertNotificationSettings = createAsyncThunk(
  "notificationSettings/upsert",
  async (payload: NotificationSettingsPayload) => notificationSettingsApi.upsert(payload),
);

interface NotificationSettingsState {
  current: NotificationSettings | null;
  requests: {
    fetch: ReturnType<typeof createRequestState>;
    upsert: ReturnType<typeof createRequestState>;
  };
}

const initialState: NotificationSettingsState = {
  current: null,
  requests: {
    fetch: createRequestState(),
    upsert: createRequestState(),
  },
};

const notificationSettingsSlice = createSlice({
  name: "notificationSettings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotificationSettings.pending, (state) => setPending(state.requests.fetch))
      .addCase(fetchNotificationSettings.fulfilled, (state, action) => {
        state.current = action.payload;
        setSucceeded(state.requests.fetch);
      })
      .addCase(fetchNotificationSettings.rejected, (state, action) => setFailed(state.requests.fetch, action.error.message))
      .addCase(upsertNotificationSettings.pending, (state) => setPending(state.requests.upsert))
      .addCase(upsertNotificationSettings.fulfilled, (state, action) => {
        state.current = action.payload;
        setSucceeded(state.requests.upsert);
      })
      .addCase(upsertNotificationSettings.rejected, (state, action) => setFailed(state.requests.upsert, action.error.message));
  },
});

export default notificationSettingsSlice.reducer;
