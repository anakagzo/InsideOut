import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bookmark, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StarRating } from "@/components/StarRating";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createCourseReview,
  fetchCourseDetail,
  fetchCurrentUser,
  fetchCourseReviews,
  fetchCourseSchedules,
  fetchEnrollments,
  saveCourse,
} from "@/store/thunks";

const CourseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const courseId = id ? Number(id) : NaN;
  const isCourseIdValid = Number.isInteger(courseId) && courseId > 0;
  const [tab, setTab] = useState("details");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  const course = useAppSelector((state) =>
    isCourseIdValid ? state.courses.byId[courseId] : undefined,
  );
  const courseStatus = useAppSelector((state) =>
    isCourseIdValid
      ? state.courses.requests.detailById[courseId]?.status ?? "idle"
      : "idle",
  );
  const courseError = useAppSelector((state) =>
    isCourseIdValid ? state.courses.requests.detailById[courseId]?.error ?? null : null,
  );

  const fullReviews = useAppSelector((state) =>
    isCourseIdValid ? state.reviews.byCourseId[courseId] ?? [] : [],
  );

  const schedules = useAppSelector((state) =>
    isCourseIdValid ? state.courses.schedulesByCourseId[courseId] ?? [] : [],
  );
  const schedulesStatus = useAppSelector((state) =>
    isCourseIdValid
      ? state.courses.requests.schedulesByCourseId[courseId]?.status ?? "idle"
      : "idle",
  );

  const saveStatus = useAppSelector((state) => state.courses.requests.save.status);
  const enrollments = useAppSelector((state) => state.enrollments.list?.data ?? []);
  const enrollmentsStatus = useAppSelector((state) => state.enrollments.requests.list.status);
  const createReviewStatus = useAppSelector((state) => state.reviews.requests.create.status);
  const currentUser = useAppSelector((state) => state.users.currentUser);
  const accessToken = useAppSelector((state) => state.users.auth.accessToken);

  useEffect(() => {
    if (isCourseIdValid) {
      dispatch(fetchCourseDetail(courseId));
      dispatch(fetchCourseReviews(courseId));
      dispatch(fetchEnrollments({ page: 1, page_size: 100 }));
    }
  }, [courseId, dispatch, isCourseIdValid]);

  useEffect(() => {
    if (accessToken && !currentUser) {
      dispatch(fetchCurrentUser());
    }
  }, [accessToken, currentUser, dispatch]);

  useEffect(() => {
    if (isCourseIdValid && tab === "schedules" && schedulesStatus === "idle") {
      dispatch(fetchCourseSchedules(courseId));
    }
  }, [courseId, dispatch, isCourseIdValid, schedulesStatus, tab]);

  const previewReviews = useMemo(() => {
    if (course?.reviews?.length) {
      return course.reviews;
    }
    return fullReviews.slice(0, 3).map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      tutor_reply: review.tutor_reply,
      created_at: review.created_at,
    }));
  }, [course?.reviews, fullReviews]);

  const hasEligibleEnrollment = useMemo(
    () =>
      enrollments.some(
        (enrollment) =>
          enrollment.course_id === courseId &&
          (enrollment.status === "active" || enrollment.status === "completed"),
      ),
    [courseId, enrollments],
  );

  const isAdmin = currentUser?.role === "admin";

  const handleSubmitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasEligibleEnrollment) {
      setReviewMessage("Only enrolled learners (active/completed) can submit a review.");
      return;
    }

    try {
      await dispatch(
        createCourseReview({
          courseId,
          payload: {
            rating: reviewRating,
            comment: reviewComment.trim() || undefined,
          },
        }),
      ).unwrap();

      setReviewComment("");
      setReviewRating(5);
      setReviewMessage("Review submitted successfully.");
      dispatch(fetchCourseReviews(courseId));
    } catch {
      setReviewMessage("Unable to submit review right now.");
    }
  };

  if (!isCourseIdValid) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Invalid course identifier.</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (courseStatus === "idle" || courseStatus === "loading") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading course details...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (courseStatus === "failed") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-muted-foreground">{courseError ?? "Unable to load this course right now."}</p>
          <Button onClick={() => dispatch(fetchCourseDetail(courseId))} variant="outline">
            Retry
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Course not found.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero image */}
        <div className="w-full h-64 md:h-80 overflow-hidden relative">
          <img src={course.image_url ?? "/media/defaults/course-default.png"} alt={course.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-6 left-0 right-0 container mx-auto px-4">
            <span className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1 rounded-full">Course</span>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-2">{course.title}</h1>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-muted mb-6">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="schedules">Schedules</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <StarRating rating={course.average_rating} />
                  <span className="font-semibold text-foreground">{course.average_rating}</span>
                  <span className="text-sm text-muted-foreground">({fullReviews.length || previewReviews.length} reviews)</span>
                </div>
                <span className="text-2xl font-bold text-primary">£{Number(course.price).toFixed(2)}</span>
              </div>

              <p className="text-muted-foreground leading-relaxed max-w-2xl">{course.description}</p>

              {/* Preview reviews */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Student Reviews</h3>
                <div className="space-y-4">
                  {previewReviews.map((review) => (
                    <div key={review.id} className="p-4 bg-card border border-border rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          U{String(review.id).slice(-2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-card-foreground">Learner</p>
                          <div className="flex items-center gap-1">
                            <StarRating rating={review.rating} size={12} />
                            <span className="text-xs text-muted-foreground ml-1">{new Date(review.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.comment ?? "No comment provided."}</p>
                      {review.tutor_reply && (
                        <div className="mt-3 ml-4 pl-3 border-l-2 border-primary/30">
                          <p className="text-xs font-semibold text-primary mb-1">Tutor Reply</p>
                          <p className="text-sm text-muted-foreground">{review.tutor_reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setTab("reviews");
                    dispatch(fetchCourseReviews(courseId));
                  }}
                  className="mt-3 text-sm text-primary font-medium hover:underline"
                >
                  See more reviews →
                </button>
              </div>

              <div className="flex flex-wrap gap-3 pt-4">
                <Button size="lg" onClick={() => navigate(`/checkout/${course.id}`)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Enroll Now
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => dispatch(saveCourse(courseId))}
                  disabled={saveStatus === "loading"}
                >
                  <Bookmark className="w-4 h-4 mr-2" /> Save for Later
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="schedules">
              {schedulesStatus === "loading" && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-muted-foreground">Loading schedule...</p>
                </div>
              )}
              {schedulesStatus !== "loading" && schedules.length > 0 && (
                <div className="space-y-4">
                  {schedules.map((schedule) => (
                    <div key={schedule.id} className="p-4 bg-card border border-border rounded-lg">
                      <p className="text-sm font-semibold text-card-foreground">
                        {new Date(schedule.date).toLocaleDateString()} · {schedule.start_time} - {schedule.end_time}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Status: {schedule.status}</p>
                      {schedule.zoom_link && (
                        <a
                          href={schedule.zoom_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary font-medium hover:underline mt-2 inline-block"
                        >
                          Join Zoom Session
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {schedulesStatus !== "loading" && schedules.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">You are not enrolled for this course — no schedule.</p>
                <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate(`/checkout/${course.id}`)}>
                  Enroll to See Schedule
                </Button>
              </div>
              )}
            </TabsContent>

            <TabsContent value="reviews">
              <div className="mb-6 p-4 bg-card border border-border rounded-lg">
                <h3 className="text-base font-semibold text-card-foreground mb-3">Write a Review</h3>

                {isAdmin && (
                  <p className="text-sm text-muted-foreground">
                    Admin accounts are read-only for student reviews.
                  </p>
                )}

                {!isAdmin && enrollmentsStatus === "loading" && (
                  <p className="text-sm text-muted-foreground">Checking enrollment eligibility...</p>
                )}

                {!isAdmin && enrollmentsStatus !== "loading" && !hasEligibleEnrollment && (
                  <p className="text-sm text-muted-foreground">
                    Only learners with an active or completed enrollment in this course can submit a review.
                  </p>
                )}

                {!isAdmin && (
                <form className="space-y-4 mt-3" onSubmit={handleSubmitReview}>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Your rating</p>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Button
                          key={value}
                          type="button"
                          variant={reviewRating === value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setReviewRating(value)}
                          disabled={!hasEligibleEnrollment || createReviewStatus === "loading"}
                        >
                          {value}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Comment</p>
                    <Textarea
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      placeholder="Share your learning experience"
                      rows={4}
                      disabled={!hasEligibleEnrollment || createReviewStatus === "loading"}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!hasEligibleEnrollment || createReviewStatus === "loading"}
                  >
                    {createReviewStatus === "loading" ? "Submitting..." : "Submit Review"}
                  </Button>

                  {reviewMessage && (
                    <p className="text-sm text-muted-foreground">{reviewMessage}</p>
                  )}
                </form>
                )}
              </div>

              <div className="space-y-4">
                {fullReviews.map((review) => (
                  <div key={review.id} className="p-4 bg-card border border-border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        U{String(review.id).slice(-2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-card-foreground">Learner</p>
                        <div className="flex items-center gap-1">
                          <StarRating rating={review.rating} size={12} />
                          <span className="text-xs text-muted-foreground ml-1">{new Date(review.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.comment ?? "No comment provided."}</p>
                    {review.tutor_reply && (
                      <div className="mt-3 ml-4 pl-3 border-l-2 border-primary/30">
                        <p className="text-xs font-semibold text-primary mb-1">Tutor Reply</p>
                        <p className="text-sm text-muted-foreground">{review.tutor_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
                {fullReviews.length === 0 && (
                  <p className="text-muted-foreground">No reviews yet for this course.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CourseDetailPage;
