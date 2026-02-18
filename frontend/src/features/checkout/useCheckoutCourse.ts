import { useEffect } from "react";
import { fetchCourseDetail } from "@/store/slices/coursesSlice";
import {
  selectCourseDetailById,
  selectCourseErrorById,
  selectCourseStatusById,
} from "@/store/selectors/courseSelectors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * Checkout course data hook.
 *
 * Encapsulates data loading and state selection so UI components remain focused
 * on rendering logic.
 */
export function useCheckoutCourse(courseId: number | null) {
  const dispatch = useAppDispatch();

  const course = useAppSelector((state) =>
    courseId !== null ? selectCourseDetailById(state, courseId) : undefined,
  );
  const status = useAppSelector((state) =>
    courseId !== null ? selectCourseStatusById(state, courseId) : "idle",
  );
  const error = useAppSelector((state) =>
    courseId !== null ? selectCourseErrorById(state, courseId) : null,
  );

  useEffect(() => {
    if (courseId !== null) {
      dispatch(fetchCourseDetail(courseId));
    }
  }, [courseId, dispatch]);

  const refetch = () => {
    if (courseId !== null) {
      dispatch(fetchCourseDetail(courseId));
    }
  };

  return {
    course,
    status,
    error,
    refetch,
  };
}
