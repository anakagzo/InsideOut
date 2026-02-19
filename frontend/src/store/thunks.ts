/**
 * Central export hub for all async thunks.
 *
 * UI pages can import from this file and dispatch directly without coupling to
 * slice file paths.
 */

export {
  fetchCourses,
  fetchCourseDetail,
  createCourse,
  updateCourse,
  deleteCourse,
  saveCourse,
  fetchSavedCourses,
  fetchCourseSchedules,
} from "@/store/slices/coursesSlice";

export {
  fetchEnrollments,
  createEnrollment,
  fetchEnrollmentDetail,
  deleteEnrollment,
  fetchEnrollmentGroupedSchedules,
} from "@/store/slices/enrollmentsSlice";

export {
  fetchSchedules,
  createSchedules,
  fetchScheduleDetail,
  refreshEnrollmentZoomLink,
} from "@/store/slices/schedulesSlice";

export { fetchCourseReviews, createCourseReview, replyToReview } from "@/store/slices/reviewsSlice";

export {
  fetchNotificationSettings,
  upsertNotificationSettings,
} from "@/store/slices/notificationSettingsSlice";

export { fetchAvailability, fetchPublicAvailability, upsertAvailability } from "@/store/slices/availabilitySlice";

export {
  loginUser,
  registerUser,
  logoutUser,
  refreshTokens,
  fetchCurrentUser,
  updateCurrentUser,
  changeCurrentUserPassword,
  fetchUsers,
  deleteUser,
} from "@/store/slices/usersSlice";

export {
  createStripeCheckoutSession,
  finalizeStripeSession,
  validateOnboardingToken,
} from "@/store/slices/paymentsSlice";
