import { apiClient } from "@/api/client";
import type {
  ApiMessageResponse,
  AuthTokens,
  AvailabilityConfig,
  PublicAvailabilityConfig,
  AvailabilityUpsertPayload,
  CourseDetail,
  CourseFormPayload,
  CourseListParams,
  CourseListResponse,
  CourseSummary,
  CourseUpdatePayload,
  CreateReviewPayload,
  CreateSchedulePayload,
  CreateEnrollmentPayload,
  Enrollment,
  EnrollmentListParams,
  EnrollmentListResponse,
  GroupedSchedulesItem,
  LoginPayload,
  NotificationSettings,
  NotificationSettingsPayload,
  RegisterPayload,
  Review,
  SavedCoursesParams,
  Schedule,
  ChangePasswordPayload,
  TutorReplyPayload,
  User,
  UserListResponse,
  UserUpdatePayload,
} from "@/api/types";

/**
 * Builds multipart form data for course create/update APIs.
 */
function buildCourseFormData(payload: CourseFormPayload | CourseUpdatePayload): FormData {
  const formData = new FormData();

  if (payload.title !== undefined) formData.append("title", payload.title);
  if (payload.description !== undefined) formData.append("description", payload.description);
  if (payload.price !== undefined) formData.append("price", payload.price);
  if (payload.media) formData.append("media", payload.media);

  return formData;
}

/**
 * Course API functions.
 *
 * Grouped by domain to scale cleanly as endpoints grow.
 */
export const coursesApi = {
  /**
   * Fetch paginated courses.
   */
  async list(params?: CourseListParams): Promise<CourseListResponse> {
    const { data } = await apiClient.get<CourseListResponse>("/courses/", {
      params,
    });
    return data;
  },

  /**
   * Fetch a single course with latest reviews.
   */
  async getById(courseId: number): Promise<CourseDetail> {
    const { data } = await apiClient.get<CourseDetail>(`/courses/${courseId}`);
    return data;
  },

  /**
   * Create a course with multipart form data (admin only).
   */
  async create(payload: CourseFormPayload): Promise<CourseSummary> {
    const formData = buildCourseFormData(payload);
    const { data } = await apiClient.post<CourseSummary>("/courses/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  /**
   * Update a course with multipart form data (admin only).
   */
  async update(courseId: number, payload: CourseUpdatePayload): Promise<CourseSummary> {
    const formData = buildCourseFormData(payload);
    const { data } = await apiClient.put<CourseSummary>(`/courses/${courseId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  /**
   * Delete a course (admin only).
   */
  async remove(courseId: number): Promise<ApiMessageResponse> {
    const { data } = await apiClient.delete<ApiMessageResponse>(`/courses/${courseId}`);
    return data;
  },

  /**
   * Save a course for the authenticated user.
   */
  async save(courseId: number): Promise<ApiMessageResponse> {
    const { data } = await apiClient.post<ApiMessageResponse>(`/courses/${courseId}/save`);
    return data;
  },

  /**
   * List saved courses for the authenticated user.
   */
  async listSaved(params?: SavedCoursesParams): Promise<CourseListResponse> {
    const { data } = await apiClient.get<CourseListResponse>("/courses/saved", { params });
    return data;
  },

  /**
   * Read schedules for current user in a given course.
   */
  async getUserSchedules(courseId: number): Promise<Schedule[]> {
    const { data } = await apiClient.get<Schedule[]>(`/courses/${courseId}/schedules`);
    return data;
  },
};

/**
 * Enrollment API functions.
 */
export const enrollmentsApi = {
  /**
  * List enrollments (admins get all, students get own).
   */
  async list(params?: EnrollmentListParams): Promise<EnrollmentListResponse> {
    const { data } = await apiClient.get<EnrollmentListResponse>("/enrollments/", { params });
    return data;
  },

  /**
   * Create an enrollment for the authenticated user.
   */
  async create(payload: CreateEnrollmentPayload): Promise<Enrollment> {
    const { data } = await apiClient.post<Enrollment>("/enrollments/", payload);
    return data;
  },

  /**
   * Get one enrollment if caller has access.
   */
  async getById(enrollmentId: number): Promise<Enrollment> {
    const { data } = await apiClient.get<Enrollment>(`/enrollments/${enrollmentId}`);
    return data;
  },

  /**
   * Delete one enrollment (admin endpoint).
   */
  async remove(enrollmentId: number): Promise<ApiMessageResponse> {
    const { data } = await apiClient.delete<ApiMessageResponse>(`/enrollments/${enrollmentId}`);
    return data;
  },

  /**
   * Get schedules grouped by date from enrollments.
   */
  async getGroupedSchedules(): Promise<GroupedSchedulesItem[]> {
    const { data } = await apiClient.get<GroupedSchedulesItem[]>("/enrollments/schedules");
    return data;
  },
};

/**
 * Schedule API functions.
 */
export const schedulesApi = {
  /**
   * List schedules linked to the current user.
   */
  async listMine(): Promise<Schedule[]> {
    const { data } = await apiClient.get<Schedule[]>("/schedules/");
    return data;
  },

  /**
   * Create one or more schedules for the same enrollment.
   */
  async createMany(payload: CreateSchedulePayload[]): Promise<Schedule[]> {
    const { data } = await apiClient.post<Schedule[]>("/schedules/", payload);
    return data;
  },

  /**
   * Get a single schedule by id.
   */
  async getById(scheduleId: number): Promise<Schedule> {
    const { data } = await apiClient.get<Schedule>(`/schedules/${scheduleId}`);
    return data;
  },
};

/**
 * Review API functions.
 */
export const reviewsApi = {
  /**
   * List reviews for a course.
   */
  async listByCourse(courseId: number): Promise<Review[]> {
    const { data } = await apiClient.get<Review[]>(`/courses/${courseId}/reviews/`);
    return data;
  },

  /**
   * Create a review for a course.
   */
  async create(courseId: number, payload: CreateReviewPayload): Promise<Review> {
    const { data } = await apiClient.post<Review>(`/courses/${courseId}/reviews/`, payload);
    return data;
  },

  /**
   * Reply to a course review.
   */
  async reply(courseId: number, reviewId: number, payload: TutorReplyPayload): Promise<Review> {
    const { data } = await apiClient.put<Review>(`/courses/${courseId}/reviews/${reviewId}/reply`, payload);
    return data;
  },
};

/**
 * Notification settings API functions.
 */
export const notificationSettingsApi = {
  /**
   * Upsert current user's notification settings.
   */
  async upsert(payload: NotificationSettingsPayload): Promise<NotificationSettings> {
    const { data } = await apiClient.post<NotificationSettings>("/notification-settings/", payload);
    return data;
  },

  /**
   * Get current user's notification settings.
   */
  async getMine(): Promise<NotificationSettings> {
    const { data } = await apiClient.get<NotificationSettings>("/notification-settings/me");
    return data;
  },
};

/**
 * Availability API functions (admin).
 */
export const availabilityApi = {
  /**
   * Get current admin availability configuration.
   */
  async getMine(): Promise<AvailabilityConfig> {
    const { data } = await apiClient.get<AvailabilityConfig>("/availability/");
    return data;
  },

  /**
   * Upsert availability configuration.
   */
  async upsert(payload: AvailabilityUpsertPayload): Promise<AvailabilityConfig> {
    const { data } = await apiClient.post<AvailabilityConfig>("/availability/", payload);
    return data;
  },

  /**
   * Get read-only availability for learner onboarding booking.
   */
  async getPublic(): Promise<PublicAvailabilityConfig> {
    const { data } = await apiClient.get<PublicAvailabilityConfig>("/availability/public");
    return data;
  },
};

/**
 * User and authentication API functions.
 */
export const usersApi = {
  /**
   * Login with user credentials.
   */
  async login(payload: LoginPayload): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>("/auth/login", payload);
    return data;
  },

  /**
   * Register a new user.
   */
  async register(payload: RegisterPayload): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>("/auth/register", payload);
    return data;
  },

  /**
   * Logout current user by revoking active access token.
   */
  async logout(): Promise<ApiMessageResponse> {
    const { data } = await apiClient.post<ApiMessageResponse>("/auth/logout");
    return data;
  },

  /**
   * Refresh access token pair using refresh token.
   */
  async refresh(): Promise<AuthTokens> {
    const { data } = await apiClient.post<AuthTokens>("/auth/refresh");
    return data;
  },

  /**
   * Get authenticated user profile.
   */
  async getMe(): Promise<User> {
    const { data } = await apiClient.get<User>("/me");
    return data;
  },

  /**
   * Update authenticated user profile.
   */
  async updateMe(payload: UserUpdatePayload): Promise<User> {
    const { data } = await apiClient.put<User>("/me", payload);
    return data;
  },

  /**
   * Change authenticated user password.
   */
  async changePassword(payload: ChangePasswordPayload): Promise<ApiMessageResponse> {
    const { data } = await apiClient.put<ApiMessageResponse>("/me/change_password", payload);
    return data;
  },

  /**
   * List non-admin users (admin endpoint).
   */
  async listUsers(params?: { page?: number; page_size?: number; search?: string }): Promise<UserListResponse> {
    const { data } = await apiClient.get<UserListResponse>("/users", { params });
    return data;
  },

  /**
   * Delete one user (admin endpoint).
   */
  async deleteUser(userId: number): Promise<ApiMessageResponse> {
    const { data } = await apiClient.delete<ApiMessageResponse>(`/users/${userId}`);
    return data;
  },
};
