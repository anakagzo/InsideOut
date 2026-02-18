import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { reviewsApi } from "@/api/insideoutApi";
import type { CreateReviewPayload, Review, TutorReplyPayload } from "@/api/types";
import { createRequestState, setFailed, setPending, setSucceeded, type RequestState } from "@/store/slices/requestState";

export const fetchCourseReviews = createAsyncThunk("reviews/fetchByCourse", async (courseId: number) =>
  reviewsApi.listByCourse(courseId),
);

export const createCourseReview = createAsyncThunk(
  "reviews/create",
  async ({ courseId, payload }: { courseId: number; payload: CreateReviewPayload }) =>
    reviewsApi.create(courseId, payload),
);

export const replyToReview = createAsyncThunk(
  "reviews/reply",
  async ({ courseId, reviewId, payload }: { courseId: number; reviewId: number; payload: TutorReplyPayload }) =>
    reviewsApi.reply(courseId, reviewId, payload),
);

interface ReviewsState {
  byCourseId: Record<number, Review[]>;
  requests: {
    listByCourseId: Record<number, RequestState>;
    create: ReturnType<typeof createRequestState>;
    reply: ReturnType<typeof createRequestState>;
  };
}

const initialState: ReviewsState = {
  byCourseId: {},
  requests: {
    listByCourseId: {},
    create: createRequestState(),
    reply: createRequestState(),
  },
};

const ensureRequest = (map: Record<number, RequestState>, id: number): RequestState => {
  if (!map[id]) {
    map[id] = createRequestState();
  }
  return map[id];
};

const reviewsSlice = createSlice({
  name: "reviews",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourseReviews.pending, (state, action) => {
        setPending(ensureRequest(state.requests.listByCourseId, action.meta.arg));
      })
      .addCase(fetchCourseReviews.fulfilled, (state, action) => {
        state.byCourseId[action.meta.arg] = action.payload;
        setSucceeded(ensureRequest(state.requests.listByCourseId, action.meta.arg));
      })
      .addCase(fetchCourseReviews.rejected, (state, action) => {
        setFailed(ensureRequest(state.requests.listByCourseId, action.meta.arg), action.error.message);
      })
      .addCase(createCourseReview.pending, (state) => setPending(state.requests.create))
      .addCase(createCourseReview.fulfilled, (state, action) => {
        const review = action.payload;
        const existing = state.byCourseId[review.course_id] ?? [];
        state.byCourseId[review.course_id] = [review, ...existing];
        setSucceeded(state.requests.create);
      })
      .addCase(createCourseReview.rejected, (state, action) => setFailed(state.requests.create, action.error.message))
      .addCase(replyToReview.pending, (state) => setPending(state.requests.reply))
      .addCase(replyToReview.fulfilled, (state, action) => {
        const review = action.payload;
        const existing = state.byCourseId[review.course_id] ?? [];
        state.byCourseId[review.course_id] = existing.map((item) =>
          item.id === review.id ? review : item,
        );
        setSucceeded(state.requests.reply);
      })
      .addCase(replyToReview.rejected, (state, action) => setFailed(state.requests.reply, action.error.message));
  },
});

export default reviewsSlice.reducer;
