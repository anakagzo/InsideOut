import type { RootState } from "@/store";

/**
 * Selects course detail entity by id from normalized state.
 */
export const selectCourseDetailById = (state: RootState, courseId: number) =>
  state.courses.byId[courseId];

/**
 * Selects request status for one course detail request.
 */
export const selectCourseStatusById = (state: RootState, courseId: number) =>
  state.courses.requests.detailById[courseId]?.status ?? "idle";

/**
 * Selects request error for one course detail request.
 */
export const selectCourseErrorById = (state: RootState, courseId: number) =>
  state.courses.requests.detailById[courseId]?.error ?? null;
