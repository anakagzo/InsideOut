import { createSelector } from "@reduxjs/toolkit";
import type { CourseSummary, Enrollment, Schedule, User } from "@/api/types";
import type { RootState } from "@/store";

export type AccountCoursesTab = "all" | "enrolled" | "completed" | "saved";

interface AccountEnrollmentRow {
  enrollment: Enrollment;
  userName: string;
  userInitials: string;
  userEmail: string;
  courseTitle: string;
}

const selectCoursesList = (state: RootState) => state.courses.list?.data ?? [];
const selectSavedCoursesList = (state: RootState) => state.courses.saved?.data ?? [];

/**
 * Returns courses for the selected account tab.
 */
export const selectCoursesForAccountTab = createSelector(
  [selectCoursesList, selectSavedCoursesList, (_state: RootState, tab: AccountCoursesTab) => tab],
  (courses, savedCourses, tab): CourseSummary[] => (tab === "saved" ? savedCourses : courses),
);

/**
 * Returns loading state for the selected account tab.
 */
export const selectCoursesLoadingForTab = createSelector(
  [
    (state: RootState) => state.courses.requests.list.status,
    (state: RootState) => state.courses.requests.savedList.status,
    (_state: RootState, tab: AccountCoursesTab) => tab,
  ],
  (listStatus, savedStatus, tab) => (tab === "saved" ? savedStatus === "loading" : listStatus === "loading"),
);

/**
 * Returns status badge label used in course rows by tab context.
 */
export const selectStatusBadgeByCoursesTab = (_state: RootState, tab: AccountCoursesTab) => {
  if (tab === "enrolled") return "enrolled";
  if (tab === "completed") return "completed";
  return null;
};

const selectUsersList = (state: RootState) => state.users.usersList?.data ?? [];
const selectEnrollmentsList = (state: RootState) => state.enrollments.list?.data ?? [];

/**
 * Lookup map for users keyed by id for fast joins.
 */
export const selectUsersById = createSelector([selectUsersList], (users) => {
  const map = new Map<number, User>();
  users.forEach((user) => {
    map.set(user.id, user);
  });
  return map;
});

/**
 * Lookup map for courses keyed by id for fast joins.
 */
export const selectCoursesById = createSelector([selectCoursesList], (courses) => {
  const map = new Map<number, CourseSummary>();
  courses.forEach((course) => {
    map.set(course.id, course);
  });
  return map;
});

/**
 * Enrollment rows joined with user/course display metadata.
 */
export const selectEnrollmentRows = createSelector(
  [selectEnrollmentsList, selectUsersById, selectCoursesById],
  (enrollments, usersById, coursesById): AccountEnrollmentRow[] =>
    enrollments.map((enrollment) => {
      const user = usersById.get(enrollment.student_id);
      const course = coursesById.get(enrollment.course_id);

      return {
        enrollment,
        userName: user ? `${user.first_name} ${user.last_name}` : `Student #${enrollment.student_id}`,
        userInitials: user?.initials ?? "--",
        userEmail: user?.email ?? "No email available",
        courseTitle: course?.title ?? `Course #${enrollment.course_id}`,
      };
    }),
);

/**
 * Enrollment rows filtered by free-text search.
 */
export const selectFilteredEnrollmentRows = createSelector(
  [selectEnrollmentRows, (_state: RootState, query: string) => query.trim().toLowerCase()],
  (rows, query) => {
    if (!query) {
      return rows;
    }

    return rows.filter((row) => {
      return (
        row.userName.toLowerCase().includes(query) ||
        row.userEmail.toLowerCase().includes(query) ||
        row.courseTitle.toLowerCase().includes(query)
      );
    });
  },
);

/**
 * Users filtered by free-text search for Users tab.
 */
export const selectFilteredUsers = createSelector(
  [selectUsersList, (_state: RootState, query: string) => query.trim().toLowerCase()],
  (users, query) => {
    if (!query) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.first_name.toLowerCase().includes(query) ||
        user.last_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.occupation ?? "").toLowerCase().includes(query)
      );
    });
  },
);

/**
 * Aggregated user stats for account Users tab.
 */
export const selectUsersStats = createSelector(
  [
    (state: RootState) => state.users.usersList?.pagination.total ?? 0,
    selectUsersList,
    (state: RootState) => state.enrollments.list?.pagination.total ?? 0,
  ],
  (usersTotal, users, enrollmentsTotal) => ({
    usersTotal,
    studentCount: users.filter((user) => user.role === "student").length,
    enrollmentsTotal,
  }),
);

const selectSchedulesList = (state: RootState) => state.schedules.list;
const selectGroupedSchedules = (state: RootState) => state.enrollments.groupedSchedules;

/**
 * Flattens schedule events from student or admin sources into one list.
 */
export const selectAccountScheduleEvents = createSelector(
  [
    selectSchedulesList,
    selectGroupedSchedules,
    (_state: RootState, isAdmin: boolean) => isAdmin,
  ],
  (studentSchedules, groupedSchedules, isAdmin): Schedule[] => {
    if (!isAdmin) {
      return studentSchedules;
    }

    return groupedSchedules.flatMap((group) =>
      group.schedules.map((schedule) => ({
        ...schedule,
        date: String(group.date),
      })),
    );
  },
);
