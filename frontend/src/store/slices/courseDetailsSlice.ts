import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { coursesApi } from "@/api/insideoutApi";
import type { CourseDetail } from "@/api/types";

/**
 * Request lifecycle states used per-entity for granular UI rendering.
 */
export type RequestStatus = "idle" | "loading" | "succeeded" | "failed";

interface CourseDetailsState {
  entities: Record<number, CourseDetail>;
  statusById: Record<number, RequestStatus>;
  errorById: Record<number, string | null>;
}

const initialState: CourseDetailsState = {
  entities: {},
  statusById: {},
  errorById: {},
};

/**
 * Fetch a single course detail by id.
 *
 * This thunk caches responses by course id in `entities` for efficient re-renders
 * and avoids duplicate concurrent requests using the `condition` option.
 */
export const fetchCourseDetail = createAsyncThunk(
  "courseDetails/fetchCourseDetail",
  async (courseId: number) => {
    return coursesApi.getById(courseId);
  },
  {
    condition: (courseId, { getState }) => {
      const state = getState() as { courseDetails: CourseDetailsState };
      return state.courseDetails.statusById[courseId] !== "loading";
    },
  },
);

const courseDetailsSlice = createSlice({
  name: "courseDetails",
  initialState,
  reducers: {
    /**
     * Clears cached course detail for one course id.
     */
    clearCourseDetail(state, action: { payload: number }) {
      const courseId = action.payload;
      delete state.entities[courseId];
      delete state.statusById[courseId];
      delete state.errorById[courseId];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourseDetail.pending, (state, action) => {
        const courseId = action.meta.arg;
        state.statusById[courseId] = "loading";
        state.errorById[courseId] = null;
      })
      .addCase(fetchCourseDetail.fulfilled, (state, action) => {
        const course = action.payload;
        state.entities[course.id] = course;
        state.statusById[course.id] = "succeeded";
        state.errorById[course.id] = null;
      })
      .addCase(fetchCourseDetail.rejected, (state, action) => {
        const courseId = action.meta.arg;
        state.statusById[courseId] = "failed";
        state.errorById[courseId] = action.error.message ?? "Failed to fetch course details.";
      });
  },
});

export const { clearCourseDetail } = courseDetailsSlice.actions;
export default courseDetailsSlice.reducer;
