import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { schedulesApi } from "@/api/insideoutApi";
import type { CreateSchedulePayload, Schedule } from "@/api/types";
import { createRequestState, setFailed, setPending, setSucceeded } from "@/store/slices/requestState";

export const fetchSchedules = createAsyncThunk("schedules/fetchList", async () => schedulesApi.listMine());

export const createSchedules = createAsyncThunk(
  "schedules/createMany",
  async (payload: CreateSchedulePayload[]) => schedulesApi.createMany(payload),
);

export const fetchScheduleDetail = createAsyncThunk("schedules/fetchDetail", async (id: number) => schedulesApi.getById(id));

interface SchedulesState {
  list: Schedule[];
  byId: Record<number, Schedule>;
  requests: {
    list: ReturnType<typeof createRequestState>;
    createMany: ReturnType<typeof createRequestState>;
    detail: ReturnType<typeof createRequestState>;
  };
}

const initialState: SchedulesState = {
  list: [],
  byId: {},
  requests: {
    list: createRequestState(),
    createMany: createRequestState(),
    detail: createRequestState(),
  },
};

const schedulesSlice = createSlice({
  name: "schedules",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchedules.pending, (state) => setPending(state.requests.list))
      .addCase(fetchSchedules.fulfilled, (state, action) => {
        state.list = action.payload;
        action.payload.forEach((schedule) => {
          state.byId[schedule.id] = schedule;
        });
        setSucceeded(state.requests.list);
      })
      .addCase(fetchSchedules.rejected, (state, action) => setFailed(state.requests.list, action.error.message))
      .addCase(createSchedules.pending, (state) => setPending(state.requests.createMany))
      .addCase(createSchedules.fulfilled, (state, action) => {
        state.list = action.payload;
        action.payload.forEach((schedule) => {
          state.byId[schedule.id] = schedule;
        });
        setSucceeded(state.requests.createMany);
      })
      .addCase(createSchedules.rejected, (state, action) => setFailed(state.requests.createMany, action.error.message))
      .addCase(fetchScheduleDetail.pending, (state) => setPending(state.requests.detail))
      .addCase(fetchScheduleDetail.fulfilled, (state, action) => {
        state.byId[action.payload.id] = action.payload;
        setSucceeded(state.requests.detail);
      })
      .addCase(fetchScheduleDetail.rejected, (state, action) => setFailed(state.requests.detail, action.error.message));
  },
});

export default schedulesSlice.reducer;
