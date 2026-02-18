import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { coursesApi } from "@/api/insideoutApi";
import type {
  ApiMessageResponse,
  CourseDetail,
  CourseFormPayload,
  CourseListParams,
  CourseListResponse,
  CourseSummary,
  CourseUpdatePayload,
  SavedCoursesParams,
  Schedule,
} from "@/api/types";
import { createRequestState, setFailed, setPending, setSucceeded, type RequestState } from "@/store/slices/requestState";

/**
 * Course domain thunks.
 */
export const fetchCourses = createAsyncThunk("courses/fetchList", async (params?: CourseListParams) =>
  coursesApi.list(params),
);

export const fetchCourseDetail = createAsyncThunk("courses/fetchDetail", async (courseId: number) =>
  coursesApi.getById(courseId),
);

export const createCourse = createAsyncThunk("courses/create", async (payload: CourseFormPayload) =>
  coursesApi.create(payload),
);

export const updateCourse = createAsyncThunk(
  "courses/update",
  async ({ courseId, payload }: { courseId: number; payload: CourseUpdatePayload }) =>
    coursesApi.update(courseId, payload),
);

export const deleteCourse = createAsyncThunk("courses/delete", async (courseId: number) =>
  coursesApi.remove(courseId),
);

export const saveCourse = createAsyncThunk("courses/save", async (courseId: number) =>
  coursesApi.save(courseId),
);

export const fetchSavedCourses = createAsyncThunk(
  "courses/fetchSaved",
  async (params?: SavedCoursesParams) => coursesApi.listSaved(params),
);

export const fetchCourseSchedules = createAsyncThunk("courses/fetchSchedules", async (courseId: number) =>
  coursesApi.getUserSchedules(courseId),
);

interface CoursesState {
  list: CourseListResponse | null;
  saved: CourseListResponse | null;
  byId: Record<number, CourseDetail>;
  schedulesByCourseId: Record<number, Schedule[]>;
  lastMutationMessage: string | null;
  requests: {
    list: RequestState;
    detailById: Record<number, RequestState>;
    create: RequestState;
    update: RequestState;
    delete: RequestState;
    save: RequestState;
    savedList: RequestState;
    schedulesByCourseId: Record<number, RequestState>;
  };
}

const initialState: CoursesState = {
  list: null,
  saved: null,
  byId: {},
  schedulesByCourseId: {},
  lastMutationMessage: null,
  requests: {
    list: createRequestState(),
    detailById: {},
    create: createRequestState(),
    update: createRequestState(),
    delete: createRequestState(),
    save: createRequestState(),
    savedList: createRequestState(),
    schedulesByCourseId: {},
  },
};

const ensureRequest = (map: Record<number, RequestState>, id: number): RequestState => {
  if (!map[id]) {
    map[id] = createRequestState();
  }
  return map[id];
};

const coursesSlice = createSlice({
  name: "courses",
  initialState,
  reducers: {
    clearCoursesMutationMessage(state) {
      state.lastMutationMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourses.pending, (state) => {
        setPending(state.requests.list);
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.list = action.payload;
        action.payload.data.forEach((course) => {
          const existing = state.byId[course.id];
          if (existing) {
            state.byId[course.id] = { ...existing, ...course };
          }
        });
        setSucceeded(state.requests.list);
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        setFailed(state.requests.list, action.error.message);
      })
      .addCase(fetchCourseDetail.pending, (state, action) => {
        setPending(ensureRequest(state.requests.detailById, action.meta.arg));
      })
      .addCase(fetchCourseDetail.fulfilled, (state, action) => {
        state.byId[action.payload.id] = action.payload;
        setSucceeded(ensureRequest(state.requests.detailById, action.payload.id));
      })
      .addCase(fetchCourseDetail.rejected, (state, action) => {
        setFailed(ensureRequest(state.requests.detailById, action.meta.arg), action.error.message);
      })
      .addCase(createCourse.pending, (state) => {
        setPending(state.requests.create);
      })
      .addCase(createCourse.fulfilled, (state, action) => {
        const course = action.payload;
        state.byId[course.id] = {
          ...course,
          reviews: state.byId[course.id]?.reviews ?? [],
        };
        state.lastMutationMessage = "Course created successfully.";
        setSucceeded(state.requests.create);
      })
      .addCase(createCourse.rejected, (state, action) => {
        setFailed(state.requests.create, action.error.message);
      })
      .addCase(updateCourse.pending, (state) => {
        setPending(state.requests.update);
      })
      .addCase(updateCourse.fulfilled, (state, action) => {
        const course = action.payload;
        const existing = state.byId[course.id];
        state.byId[course.id] = {
          id: course.id,
          title: course.title,
          description: course.description,
          image_url: course.image_url,
          preview_video_url: course.preview_video_url,
          price: course.price,
          created_at: course.created_at,
          average_rating: course.average_rating,
          reviews: existing?.reviews ?? [],
        };
        state.lastMutationMessage = "Course updated successfully.";
        setSucceeded(state.requests.update);
      })
      .addCase(updateCourse.rejected, (state, action) => {
        setFailed(state.requests.update, action.error.message);
      })
      .addCase(deleteCourse.pending, (state) => {
        setPending(state.requests.delete);
      })
      .addCase(deleteCourse.fulfilled, (state, action) => {
        state.lastMutationMessage = action.payload.message;
        setSucceeded(state.requests.delete);
      })
      .addCase(deleteCourse.rejected, (state, action) => {
        setFailed(state.requests.delete, action.error.message);
      })
      .addCase(saveCourse.pending, (state) => {
        setPending(state.requests.save);
      })
      .addCase(saveCourse.fulfilled, (state, action) => {
        state.lastMutationMessage = action.payload.message;
        setSucceeded(state.requests.save);
      })
      .addCase(saveCourse.rejected, (state, action) => {
        setFailed(state.requests.save, action.error.message);
      })
      .addCase(fetchSavedCourses.pending, (state) => {
        setPending(state.requests.savedList);
      })
      .addCase(fetchSavedCourses.fulfilled, (state, action) => {
        state.saved = action.payload;
        setSucceeded(state.requests.savedList);
      })
      .addCase(fetchSavedCourses.rejected, (state, action) => {
        setFailed(state.requests.savedList, action.error.message);
      })
      .addCase(fetchCourseSchedules.pending, (state, action) => {
        setPending(ensureRequest(state.requests.schedulesByCourseId, action.meta.arg));
      })
      .addCase(fetchCourseSchedules.fulfilled, (state, action) => {
        state.schedulesByCourseId[action.meta.arg] = action.payload;
        setSucceeded(ensureRequest(state.requests.schedulesByCourseId, action.meta.arg));
      })
      .addCase(fetchCourseSchedules.rejected, (state, action) => {
        setFailed(ensureRequest(state.requests.schedulesByCourseId, action.meta.arg), action.error.message);
      });
  },
});

export const { clearCoursesMutationMessage } = coursesSlice.actions;
export default coursesSlice.reducer;
