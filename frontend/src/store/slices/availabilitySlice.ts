import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { availabilityApi } from "@/api/insideoutApi";
import type { AvailabilityConfig, AvailabilityUpsertPayload, PublicAvailabilityConfig } from "@/api/types";
import { createRequestState, setFailed, setPending, setSucceeded } from "@/store/slices/requestState";

export const fetchAvailability = createAsyncThunk("availability/fetchMine", async () => availabilityApi.getMine());
export const fetchPublicAvailability = createAsyncThunk("availability/fetchPublic", async () => availabilityApi.getPublic());

export const upsertAvailability = createAsyncThunk(
  "availability/upsert",
  async (payload: AvailabilityUpsertPayload) => availabilityApi.upsert(payload),
);

interface AvailabilityState {
  current: AvailabilityConfig | null;
  publicView: PublicAvailabilityConfig | null;
  requests: {
    fetch: ReturnType<typeof createRequestState>;
    fetchPublic: ReturnType<typeof createRequestState>;
    upsert: ReturnType<typeof createRequestState>;
  };
}

const initialState: AvailabilityState = {
  current: null,
  publicView: null,
  requests: {
    fetch: createRequestState(),
    fetchPublic: createRequestState(),
    upsert: createRequestState(),
  },
};

const availabilitySlice = createSlice({
  name: "availability",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAvailability.pending, (state) => setPending(state.requests.fetch))
      .addCase(fetchAvailability.fulfilled, (state, action) => {
        state.current = action.payload;
        setSucceeded(state.requests.fetch);
      })
      .addCase(fetchAvailability.rejected, (state, action) => setFailed(state.requests.fetch, action.error.message))
      .addCase(fetchPublicAvailability.pending, (state) => setPending(state.requests.fetchPublic))
      .addCase(fetchPublicAvailability.fulfilled, (state, action) => {
        state.publicView = action.payload;
        setSucceeded(state.requests.fetchPublic);
      })
      .addCase(fetchPublicAvailability.rejected, (state, action) =>
        setFailed(state.requests.fetchPublic, action.error.message),
      )
      .addCase(upsertAvailability.pending, (state) => setPending(state.requests.upsert))
      .addCase(upsertAvailability.fulfilled, (state, action) => {
        state.current = action.payload;
        setSucceeded(state.requests.upsert);
      })
      .addCase(upsertAvailability.rejected, (state, action) => setFailed(state.requests.upsert, action.error.message));
  },
});

export default availabilitySlice.reducer;
