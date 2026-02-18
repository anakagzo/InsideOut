import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { enrollmentsApi } from "@/api/insideoutApi";
import type {
  Enrollment,
  EnrollmentListParams,
  EnrollmentListResponse,
  GroupedSchedulesItem,
  CreateEnrollmentPayload,
  ApiMessageResponse,
} from "@/api/types";
import { createRequestState, setFailed, setPending, setSucceeded } from "@/store/slices/requestState";

export const fetchEnrollments = createAsyncThunk("enrollments/fetchList", async (params?: EnrollmentListParams) =>
  enrollmentsApi.list(params),
);

export const createEnrollment = createAsyncThunk(
  "enrollments/create",
  async (payload: CreateEnrollmentPayload) => enrollmentsApi.create(payload),
);

export const fetchEnrollmentDetail = createAsyncThunk("enrollments/fetchDetail", async (id: number) =>
  enrollmentsApi.getById(id),
);

export const deleteEnrollment = createAsyncThunk("enrollments/delete", async (id: number) =>
  enrollmentsApi.remove(id),
);

export const fetchEnrollmentGroupedSchedules = createAsyncThunk(
  "enrollments/fetchGroupedSchedules",
  async () => enrollmentsApi.getGroupedSchedules(),
);

interface EnrollmentsState {
  list: EnrollmentListResponse | null;
  byId: Record<number, Enrollment>;
  groupedSchedules: GroupedSchedulesItem[];
  lastMutationMessage: string | null;
  requests: {
    list: ReturnType<typeof createRequestState>;
    create: ReturnType<typeof createRequestState>;
    detail: ReturnType<typeof createRequestState>;
    delete: ReturnType<typeof createRequestState>;
    groupedSchedules: ReturnType<typeof createRequestState>;
  };
}

const initialState: EnrollmentsState = {
  list: null,
  byId: {},
  groupedSchedules: [],
  lastMutationMessage: null,
  requests: {
    list: createRequestState(),
    create: createRequestState(),
    detail: createRequestState(),
    delete: createRequestState(),
    groupedSchedules: createRequestState(),
  },
};

const enrollmentsSlice = createSlice({
  name: "enrollments",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEnrollments.pending, (state) => setPending(state.requests.list))
      .addCase(fetchEnrollments.fulfilled, (state, action) => {
        state.list = action.payload;
        action.payload.data.forEach((enrollment) => {
          state.byId[enrollment.id] = enrollment;
        });
        setSucceeded(state.requests.list);
      })
      .addCase(fetchEnrollments.rejected, (state, action) => setFailed(state.requests.list, action.error.message))
      .addCase(createEnrollment.pending, (state) => setPending(state.requests.create))
      .addCase(createEnrollment.fulfilled, (state, action) => {
        state.byId[action.payload.id] = action.payload;
        setSucceeded(state.requests.create);
      })
      .addCase(createEnrollment.rejected, (state, action) => setFailed(state.requests.create, action.error.message))
      .addCase(fetchEnrollmentDetail.pending, (state) => setPending(state.requests.detail))
      .addCase(fetchEnrollmentDetail.fulfilled, (state, action) => {
        state.byId[action.payload.id] = action.payload;
        setSucceeded(state.requests.detail);
      })
      .addCase(fetchEnrollmentDetail.rejected, (state, action) => setFailed(state.requests.detail, action.error.message))
      .addCase(deleteEnrollment.pending, (state) => setPending(state.requests.delete))
      .addCase(deleteEnrollment.fulfilled, (state, action) => {
        state.lastMutationMessage = action.payload.message;
        setSucceeded(state.requests.delete);
      })
      .addCase(deleteEnrollment.rejected, (state, action) => setFailed(state.requests.delete, action.error.message))
      .addCase(fetchEnrollmentGroupedSchedules.pending, (state) => setPending(state.requests.groupedSchedules))
      .addCase(fetchEnrollmentGroupedSchedules.fulfilled, (state, action) => {
        state.groupedSchedules = action.payload;
        setSucceeded(state.requests.groupedSchedules);
      })
      .addCase(fetchEnrollmentGroupedSchedules.rejected, (state, action) =>
        setFailed(state.requests.groupedSchedules, action.error.message),
      );
  },
});

export default enrollmentsSlice.reducer;
