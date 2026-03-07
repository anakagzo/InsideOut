import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bookmark, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StarRating } from "@/components/StarRating";
import { AuthModal } from "@/components/AuthModal";
import { paymentsApi } from "@/api/insideoutApi";
import type { Review } from "@/api/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import defaultCourseImage from "@/assets/course-default-img.jpg";
import {
  createCourseReview,
  fetchCourseDetail,
  fetchCurrentUser,
  fetchCourseReviews,
  fetchCourseSchedules,
  fetchEnrollments,
  fetchSavedCourses,
  replyToReview,
  saveCourse,
  unsaveCourse,
} from "@/store/thunks";

const COURSE_DETAIL_DESCRIPTION_PREVIEW_CHAR_LIMIT = 280;
const REVIEWS_PAGE_STEP = 5;
const DEFAULT_COURSE_IMAGE = defaultCourseImage;

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
  const [isDetailDescriptionExpanded, setIsDetailDescriptionExpanded] = useState(false);
  const [visibleReviewsCount, setVisibleReviewsCount] = useState(REVIEWS_PAGE_STEP);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [selectedReviewForReply, setSelectedReviewForReply] = useState<Review | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingAuthAction, setPendingAuthAction] = useState<"enroll" | "save" | null>(null);
  const [isBookingOnboarding, setIsBookingOnboarding] = useState(false);

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
  const unsaveStatus = useAppSelector((state) => state.courses.requests.unsave.status);
  const savedCourses = useAppSelector((state) => state.courses.saved?.data ?? []);
  const enrollments = useAppSelector((state) => state.enrollments.list?.data ?? []);
  const enrollmentsStatus = useAppSelector((state) => state.enrollments.requests.list.status);
  const createReviewStatus = useAppSelector((state) => state.reviews.requests.create.status);
  const replyReviewStatus = useAppSelector((state) => state.reviews.requests.reply.status);
  const currentUser = useAppSelector((state) => state.users.currentUser);
  const accessToken = useAppSelector((state) => state.users.auth.accessToken);
  const isAuthenticated = Boolean(accessToken);
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    if (isCourseIdValid) {
      dispatch(fetchCourseDetail(courseId));
      dispatch(fetchCourseReviews(courseId));
      dispatch(fetchEnrollments({ page: 1, page_size: 100 }));
    }
  }, [courseId, dispatch, isCourseIdValid]);

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      dispatch(fetchSavedCourses({ page: 1, page_size: 100 }));
    }
  }, [dispatch, isAuthenticated, isAdmin]);

  useEffect(() => {
    if (accessToken && !currentUser) {
      dispatch(fetchCurrentUser());
    }
  }, [accessToken, currentUser, dispatch]);

  useEffect(() => {
    setIsDetailDescriptionExpanded(false);
    setVisibleReviewsCount(REVIEWS_PAGE_STEP);
  }, [courseId]);

  useEffect(() => {
    if (tab === "reviews") {
      setVisibleReviewsCount(REVIEWS_PAGE_STEP);
    }
  }, [tab]);

  useEffect(() => {
    if (isCourseIdValid && tab === "schedules") {
      dispatch(fetchCourseSchedules(courseId));
    }
  }, [courseId, dispatch, isCourseIdValid, tab]);

  const previewReviews = useMemo(() => {
    if (fullReviews.length > 0) {
      return fullReviews.slice(0, 3);
    }
    return course?.reviews ?? [];
  }, [course?.reviews, fullReviews]);

  const enrolledEnrollment = useMemo(
    () =>
      enrollments.find(
        (enrollment) => {
          const enrollmentCourseId = enrollment.course_id ?? enrollment.course?.id;
          return (
            Number(enrollmentCourseId) === courseId &&
            (enrollment.status === "active" || enrollment.status === "completed")
          );
        },
      ) ?? null,
    [courseId, enrollments],
  );
  const hasEligibleEnrollment = Boolean(enrolledEnrollment);
  const isAlreadyEnrolled = hasEligibleEnrollment;
  const totalReviewCount = fullReviews.length || previewReviews.length;
  const displayedAverageRating = useMemo(() => {
    const fallbackAverage = Number(course?.average_rating ?? 0);
    if (fullReviews.length === 0) {
      return Number.isFinite(fallbackAverage) ? fallbackAverage : 0;
    }

    const totalRating = fullReviews.reduce((sum, review) => sum + Number(review.rating ?? 0), 0);
    const average = totalRating / fullReviews.length;
    return Number.isFinite(average) ? average : (Number.isFinite(fallbackAverage) ? fallbackAverage : 0);
  }, [course?.average_rating, fullReviews]);
  const displayedAverageRatingLabel = displayedAverageRating.toFixed(1);
  const hasAuthoredReview = Boolean(currentUser && fullReviews.some((review) => review.user_id === currentUser.id));
  const isCourseSaved = useMemo(
    () => savedCourses.some((savedCourse) => savedCourse.id === courseId),
    [courseId, savedCourses],
  );
  const visibleReviews = useMemo(
    () => fullReviews.slice(0, visibleReviewsCount),
    [fullReviews, visibleReviewsCount],
  );
  const hasMoreReviews = fullReviews.length > visibleReviewsCount;

  const getReviewAuthorLabel = (review: { id: number; author?: { initials?: string; first_name?: string; last_name?: string } }) => {
    const initials = review.author?.initials || `U${String(review.id).slice(-2)}`;
    const firstName = review.author?.first_name?.trim();
    const lastInitial = review.author?.last_name?.trim()?.charAt(0).toUpperCase();
    const displayName = firstName
      ? `${firstName} ${lastInitial ? `${lastInitial}.` : ""}`.trim()
      : "Learner";

    return { initials, displayName };
  };

  const getDetailReviewAuthorLabel = (review: { id: number; author?: { initials?: string; first_name?: string; last_name?: string } }) => {
    const initials = review.author?.initials || `U${String(review.id).slice(-2)}`;
    const firstName = review.author?.first_name?.trim();
    const lastInitial = review.author?.last_name?.trim()?.charAt(0).toUpperCase();
    const displayName = firstName
      ? `${firstName} ${lastInitial ? `${lastInitial}.` : ""}`.trim()
      : "Learner";

    return { initials, displayName };
  };

  const handleSubmitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasEligibleEnrollment) {
      setReviewMessage("Only enrolled learners (active/completed) can submit a review.");
      return;
    }

    if (hasAuthoredReview) {
      setReviewMessage("You have already submitted a review for this course.");
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
      dispatch(fetchCourseDetail(courseId));
    } catch {
      setReviewMessage("Unable to submit review right now.");
    }
  };

  const handleEnrollNow = () => {
    if (!isAuthenticated) {
      setPendingAuthAction("enroll");
      setIsAuthModalOpen(true);
      return;
    }
    navigate(`/checkout/${course.id}`);
  };

  const handleToggleSaveCourse = async () => {
    if (!isAuthenticated) {
      setPendingAuthAction("save");
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const action = isCourseSaved ? unsaveCourse(courseId) : saveCourse(courseId);
      const response = await dispatch(action).unwrap();
      toast.success(response.message || (isCourseSaved ? "Course removed from saved list." : "Course saved successfully."));

      if (!isCourseSaved) {
        dispatch(fetchSavedCourses({ page: 1, page_size: 100 }));
      }
    } catch {
      toast.error(isCourseSaved ? "Unable to remove saved course right now." : "Unable to save course right now.");
    }
  };

  const handleBookOnboardingMeeting = async () => {
    if (!isAuthenticated) {
      setPendingAuthAction("enroll");
      setIsAuthModalOpen(true);
      return;
    }

    if (!isAlreadyEnrolled) {
      navigate(`/checkout/${course.id}`);
      return;
    }

    setIsBookingOnboarding(true);
    try {
      const response = await paymentsApi.createOnboardingToken({ course_id: course.id });
      navigate(`/onboarding/${course.id}/${response.onboarding_token}`);
    } catch {
      toast.error("Unable to generate onboarding booking link right now.");
    } finally {
      setIsBookingOnboarding(false);
    }
  };

  const handleOpenReplyEditor = (review: Review) => {
    setSelectedReviewForReply(review);
    setReplyDraft(review.tutor_reply ?? "");
    setReplyModalOpen(true);
  };

  const handleSubmitReply = async () => {
    if (!selectedReviewForReply) {
      return;
    }

    const replyText = replyDraft.trim();
    if (!replyText) {
      toast.error("Reply cannot be empty.");
      return;
    }

    try {
      await dispatch(
        replyToReview({
          courseId,
          reviewId: selectedReviewForReply.id,
          payload: { tutor_reply: replyText },
        }),
      ).unwrap();
      toast.success("Reply saved successfully.");
      setReplyModalOpen(false);
      setSelectedReviewForReply(null);
      setReplyDraft("");
      dispatch(fetchCourseReviews(courseId));
      dispatch(fetchCourseDetail(courseId));
    } catch {
      toast.error("Unable to save reply right now.");
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

  const hasLongDetailDescription =
    course.description.length > COURSE_DETAIL_DESCRIPTION_PREVIEW_CHAR_LIMIT;
  const displayedDetailDescription =
    hasLongDetailDescription && !isDetailDescriptionExpanded
      ? `${course.description.slice(0, COURSE_DETAIL_DESCRIPTION_PREVIEW_CHAR_LIMIT).trimEnd()}...`
      : course.description;
  const heroImageSrc = course.image_url?.trim() ? course.image_url : DEFAULT_COURSE_IMAGE;
  const handleHeroImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    if (target.src !== DEFAULT_COURSE_IMAGE) {
      target.src = DEFAULT_COURSE_IMAGE;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero image */}
        <div className="w-full h-64 md:h-80 overflow-hidden relative">
          <img
            src={heroImageSrc}
            alt={course.title}
            onError={handleHeroImageError}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-6 left-0 right-0 max-w-6xl mx-auto px-4">
            <span className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1 rounded-full">Course</span>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-2 break-words max-w-4xl">{course.title}</h1>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8 items-start">
            <div className="xl:col-span-8">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="bg-muted mb-6 w-full sm:w-auto max-w-full justify-start overflow-x-auto whitespace-nowrap">
                  <TabsTrigger value="details" className="shrink-0">Details</TabsTrigger>
                  {!isAdmin && <TabsTrigger value="schedules" className="shrink-0">Schedules</TabsTrigger>}
                  <TabsTrigger value="reviews" className="shrink-0">Reviews</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6">
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                      <StarRating rating={displayedAverageRating} />
                      <span className="font-semibold text-foreground">{displayedAverageRatingLabel}</span>
                      <span className="text-sm text-muted-foreground">({totalReviewCount} reviews)</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">£{Number(course.price).toFixed(2)}</span>
                  </div>

                  <div className="max-w-3xl">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">{displayedDetailDescription}</p>
                    {hasLongDetailDescription && (
                      <button
                        type="button"
                        className="mt-2 text-sm text-primary font-medium hover:underline"
                        onClick={() => setIsDetailDescriptionExpanded((prev) => !prev)}
                      >
                        {isDetailDescriptionExpanded ? "Read less" : "Read more"}
                      </button>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Student Reviews</h3>
                    <div className="space-y-4">
                      {previewReviews.map((review) => (
                        <div key={review.id} className="p-4 bg-card border border-border rounded-lg">
                          {(() => {
                            const { initials, displayName } = getDetailReviewAuthorLabel(review);
                            return (
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-card-foreground">{displayName}</p>
                              <div className="flex items-center gap-1">
                                <StarRating rating={review.rating} size={12} />
                                <span className="text-xs text-muted-foreground ml-1">{new Date(review.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                            );
                          })()}
                          <p className="text-sm text-muted-foreground">{review.comment ?? "No comment provided."}</p>
                          {(isAdmin || review.tutor_reply) && (
                            <div className="mt-3 ml-4 pl-3 border-l-2 border-primary/30">
                              <p className="text-xs font-semibold text-primary mb-1">Tutor Reply</p>
                              <p className="text-sm text-muted-foreground">{review.tutor_reply ?? "No reply yet."}</p>
                            </div>
                          )}
                          {isAdmin && (
                            <div className="mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenReplyEditor(review as Review)}
                              >
                                {review.tutor_reply ? "Edit Reply" : "Add Reply"}
                              </Button>
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
                </TabsContent>

                {!isAdmin && (
                  <TabsContent value="schedules">
                    {(schedulesStatus === "idle" || schedulesStatus === "loading") && (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <p className="text-muted-foreground">Loading schedule...</p>
                      </div>
                    )}
                    {schedulesStatus === "failed" && (
                      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                        <p className="text-muted-foreground">Unable to load schedules right now.</p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            dispatch(fetchCourseSchedules(courseId));
                          }}
                        >
                          Retry
                        </Button>
                      </div>
                    )}
                    {schedulesStatus === "succeeded" && schedules.length > 0 && (
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
                    {schedulesStatus === "succeeded" && schedules.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                        {isAlreadyEnrolled ? (
                          <>
                            <p className="text-muted-foreground">No schedules yet.</p>
                            <Button
                              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
                              onClick={handleBookOnboardingMeeting}
                              disabled={isBookingOnboarding}
                            >
                              {isBookingOnboarding ? "Preparing booking..." : "Book Onboarding Meeting"}
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="text-muted-foreground">You are not enrolled for this course — no schedule.</p>
                            <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleEnrollNow}>
                              Enroll to See Schedule
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </TabsContent>
                )}

                <TabsContent value="reviews">
                  <div className="mb-6 p-4 bg-card border border-border rounded-lg">
                    <h3 className="text-base font-semibold text-card-foreground mb-3">Write a Review</h3>

                    {isAdmin && (
                      <p className="text-sm text-muted-foreground">
                        Admins can reply to student reviews.
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

                    {!isAdmin && enrollmentsStatus !== "loading" && hasEligibleEnrollment && hasAuthoredReview && (
                      <p className="text-sm text-muted-foreground">
                        You have already submitted a review for this course.
                      </p>
                    )}

                    {!isAdmin && !hasAuthoredReview && (
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
                    {visibleReviews.map((review) => (
                      <div key={review.id} className="p-4 bg-card border border-border rounded-lg">
                        {(() => {
                          const { initials, displayName } = getReviewAuthorLabel(review);
                          return (
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-card-foreground">{displayName}</p>
                            <div className="flex items-center gap-1">
                              <StarRating rating={review.rating} size={12} />
                              <span className="text-xs text-muted-foreground ml-1">{new Date(review.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                          );
                        })()}
                        <p className="text-sm text-muted-foreground">{review.comment ?? "No comment provided."}</p>
                        {(isAdmin || review.tutor_reply) && (
                          <div className="mt-3 ml-4 pl-3 border-l-2 border-primary/30">
                            <p className="text-xs font-semibold text-primary mb-1">Tutor Reply</p>
                            <p className="text-sm text-muted-foreground">{review.tutor_reply ?? "No reply yet."}</p>
                          </div>
                        )}
                        {isAdmin && (
                          <div className="mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReplyEditor(review)}
                            >
                              {review.tutor_reply ? "Edit Reply" : "Add Reply"}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {fullReviews.length === 0 && (
                      <p className="text-muted-foreground">No reviews yet for this course.</p>
                    )}
                    {fullReviews.length > 0 && hasMoreReviews && (
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setVisibleReviewsCount((current) => current + REVIEWS_PAGE_STEP)}
                        >
                          Load More Reviews
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <aside className="xl:col-span-4">
              <div className="bg-card border border-border rounded-lg p-4 sm:p-5 space-y-4 xl:sticky xl:top-24">
                <div className="flex items-start gap-3">
                  <img
                    src={heroImageSrc}
                    alt={course.title}
                    onError={handleHeroImageError}
                    className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-card-foreground break-words line-clamp-2">{course.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">InsideOut Course</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-semibold text-primary">£{Number(course.price).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Rating</span>
                    <span className="font-medium text-card-foreground">{displayedAverageRatingLabel}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Reviews</span>
                    <span className="font-medium text-card-foreground">{totalReviewCount}</span>
                  </div>
                </div>

                {!isAdmin && !isAlreadyEnrolled && (
                  <div className="flex flex-col sm:flex-row xl:flex-col gap-2 pt-2">
                    <Button size="lg" onClick={handleEnrollNow} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full">
                      Enroll Now
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleToggleSaveCourse}
                      disabled={saveStatus === "loading" || unsaveStatus === "loading"}
                      className="w-full"
                    >
                      <Bookmark className="w-4 h-4 mr-2" /> {isCourseSaved ? "Remove from Saved" : "Save for Later"}
                    </Button>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
      <Dialog open={replyModalOpen} onOpenChange={setReplyModalOpen}>
        <DialogContent className="bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">
              {selectedReviewForReply?.tutor_reply ? "Edit Reply" : "Add Reply"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Reply to this student review.</p>
            <Textarea
              value={replyDraft}
              onChange={(event) => setReplyDraft(event.target.value)}
              placeholder="Write your reply"
              rows={4}
              disabled={replyReviewStatus === "loading"}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReplyModalOpen(false);
                setSelectedReviewForReply(null);
                setReplyDraft("");
              }}
              disabled={replyReviewStatus === "loading"}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSubmitReply()} disabled={replyReviewStatus === "loading"}>
              {replyReviewStatus === "loading" ? "Saving..." : "Save Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AuthModal
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        onAuthenticated={() => {
          const action = pendingAuthAction;
          setPendingAuthAction(null);

          if (action === "save") {
            void handleToggleSaveCourse();
            return;
          }

          navigate(`/checkout/${course.id}`);
        }}
      />
    </div>
  );
};

export default CourseDetailPage;
