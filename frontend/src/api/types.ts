/**
 * Shared API contracts used by the frontend client and Redux slices.
 * Keep these types close to backend schema responses for maintainability.
 */

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiMessageResponse {
  message: string;
}

export interface StripeCheckoutSessionPayload {
  course_id: number;
}

export interface StripeCheckoutSessionResponse {
  session_id: string;
  checkout_url: string;
  publishable_key: string;
}

export interface StripeFinalizePayload {
  session_id: string;
}

export interface StripeFinalizeResponse {
  message: string;
  enrollment_id: number;
  onboarding_token: string;
}

export interface OnboardingTokenValidatePayload {
  token: string;
  course_id: number;
}

export interface OnboardingTokenValidateResponse {
  valid: boolean;
  expired: boolean;
  message: string;
  enrollment_id: number | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  confirm_password: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  occupation?: string;
}

export interface ChangePasswordPayload {
  old_password: string;
  new_password: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  initials: string;
  phone_number: string | null;
  occupation: string | null;
  role: "student" | "admin";
  created_at?: string;
}

export interface UserUpdatePayload {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  occupation?: string;
}

export type UserListResponse = PaginatedResponse<User>;

export interface CourseReviewSummary {
  id: number;
  rating: number;
  comment: string | null;
  tutor_reply: string | null;
  created_at: string;
}

export interface CourseSummary {
  id: number;
  title: string;
  description: string;
  image_url: string | null;
  preview_video_url: string | null;
  price: string;
  created_at: string;
  average_rating: number;
}

export interface CourseDetail extends CourseSummary {
  reviews: CourseReviewSummary[];
}

export interface CourseListParams {
  page?: number;
  page_size?: number;
  search?: string;
  type?: "active" | "completed";
}

export interface SavedCoursesParams {
  page?: number;
  page_size?: number;
}

export type CourseListResponse = PaginatedResponse<CourseSummary>;

export interface CourseFormPayload {
  title: string;
  description: string;
  price: string;
  media?: File | null;
}

export interface CourseUpdatePayload {
  title?: string;
  description?: string;
  price?: string;
  media?: File | null;
}

export interface CreateEnrollmentPayload {
  student_id: number;
  course_id: number;
}

export interface EnrollmentListParams {
  page?: number;
  page_size?: number;
  search?: string;
}

export interface Enrollment {
  id: number;
  student_id: number;
  course_id: number;
  status: "active" | "completed";
  start_date: string;
  end_date: string | null;
}

export type EnrollmentListResponse = PaginatedResponse<Enrollment>;

export interface Schedule {
  id: number;
  enrollment_id: number;
  date: string;
  start_time: string;
  end_time: string;
  zoom_link: string | null;
  status: string;
}

export interface CreateSchedulePayload {
  enrollment_id: number;
  date: string;
  start_time: string;
  end_time: string;
  zoom_link?: string;
  status?: string;
}

export interface GroupedSchedulesItem {
  date: string;
  schedules: Schedule[];
}

export interface Review {
  id: number;
  user_id: number;
  course_id: number;
  rating: number;
  comment: string | null;
  tutor_reply: string | null;
  created_at: string;
}

export interface CreateReviewPayload {
  rating: number;
  comment?: string;
}

export interface TutorReplyPayload {
  tutor_reply: string;
}

export interface NotificationSettings {
  user_id: number;
  notify_on_new_payment: boolean;
  notify_on_schedule_change: boolean;
  notify_on_new_course: boolean;
  notify_on_meeting_reminder: boolean;
  meeting_reminder_lead_minutes: number;
}

export interface NotificationSettingsPayload {
  user_id?: number;
  notify_on_new_payment?: boolean;
  notify_on_schedule_change?: boolean;
  notify_on_new_course?: boolean;
  notify_on_meeting_reminder?: boolean;
  meeting_reminder_lead_minutes?: number;
}

export interface AvailabilityTimeSlot {
  id?: number;
  start_time: string;
  end_time: string;
}

export interface AvailabilityDay {
  id?: number;
  user_id?: number;
  day_of_week: number;
  month_start: number;
  month_end: number;
  time_slots: AvailabilityTimeSlot[];
}

export interface AvailabilityUnavailableDate {
  id?: number;
  user_id?: number;
  unavailable_date: string;
}

export interface AvailabilityConfig {
  user_id: number;
  month_start: number | null;
  month_end: number | null;
  availability: AvailabilityDay[];
  unavailable_dates: AvailabilityUnavailableDate[];
}

export interface PublicAvailabilityBookedSlot {
  date: string;
  start_time: string;
  end_time: string;
}

export interface PublicAvailabilityConfig {
  month_start: number | null;
  month_end: number | null;
  availability: AvailabilityDay[];
  unavailable_dates: string[];
  booked_slots: PublicAvailabilityBookedSlot[];
}

export interface AvailabilityUpsertPayload {
  month_start: number;
  month_end: number;
  availability: Array<{
    day_of_week: number;
    time_slots: Array<{
      start_time: string;
      end_time: string;
    }>;
  }>;
  unavailable_dates: string[];
}
