import { configureStore } from "@reduxjs/toolkit";
import coursesReducer from "@/store/slices/coursesSlice";
import enrollmentsReducer from "@/store/slices/enrollmentsSlice";
import schedulesReducer from "@/store/slices/schedulesSlice";
import reviewsReducer from "@/store/slices/reviewsSlice";
import notificationSettingsReducer from "@/store/slices/notificationSettingsSlice";
import availabilityReducer from "@/store/slices/availabilitySlice";
import usersReducer from "@/store/slices/usersSlice";

/**
 * Root Redux store.
 *
 * Add new domain reducers here as the application expands.
 */
export const store = configureStore({
  reducer: {
    courses: coursesReducer,
    enrollments: enrollmentsReducer,
    schedules: schedulesReducer,
    reviews: reviewsReducer,
    notificationSettings: notificationSettingsReducer,
    availability: availabilityReducer,
    users: usersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
