import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { addDays, addMinutes, format, isAfter, parse, startOfDay } from "date-fns";
import { CalendarCheck, Clock, Video, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createSchedules,
  fetchCourseDetail,
  fetchCourseSchedules,
  fetchPublicAvailability,
} from "@/store/thunks";
import { usePayments } from "@/features/payments/usePayments";

const ONBOARDING_DURATION_MINUTES = 60;
const SLOT_STEP_MINUTES = 30;

const normalizeTime = (value: string) => value.slice(0, 5);
const normalizeTimeForApi = (value: string) => (value.length === 5 ? `${value}:00` : value);
const toMinuteIndex = (value: string) => {
  const [hours, minutes] = normalizeTime(value).split(":").map(Number);
  return hours * 60 + minutes;
};
const hasOverlap = (
  startMinute: number,
  endMinute: number,
  bookedRanges: Array<{ startMinute: number; endMinute: number }>,
) => bookedRanges.some((range) => startMinute < range.endMinute && endMinute > range.startMinute);
const dayOfWeekToAvailabilityNumber = (date: Date) => (date.getDay() === 0 ? 7 : date.getDay());

const OnboardingBookingPage = () => {
  const { id, token } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const courseId = id ? Number(id) : NaN;
  const isCourseIdValid = Number.isInteger(courseId) && courseId > 0;

  const course = useAppSelector((state) =>
    isCourseIdValid ? state.courses.byId[courseId] : undefined,
  );
  const courseStatus = useAppSelector((state) =>
    isCourseIdValid ? state.courses.requests.detailById[courseId]?.status ?? "idle" : "idle",
  );
  const courseError = useAppSelector((state) =>
    isCourseIdValid ? state.courses.requests.detailById[courseId]?.error ?? null : null,
  );

  const onboardingAvailability = useAppSelector((state) => state.availability.publicView);
  const onboardingAvailabilityStatus = useAppSelector((state) => state.availability.requests.fetchPublic.status);
  const onboardingAvailabilityError = useAppSelector((state) => state.availability.requests.fetchPublic.error);

  const existingCourseSchedules = useAppSelector((state) =>
    isCourseIdValid ? state.courses.schedulesByCourseId[courseId] ?? [] : [],
  );
  const createScheduleStatus = useAppSelector((state) => state.schedules.requests.createMany.status);
  const {
    tokenValidationStatus,
    tokenValidationError,
    tokenValidationResponse,
    validateToken,
  } = usePayments();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isBooked, setIsBooked] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookedRange, setBookedRange] = useState<{ start: string; end: string } | null>(null);

  useEffect(() => {
    if (!isCourseIdValid) {
      return;
    }
    dispatch(fetchCourseDetail(courseId));
    dispatch(fetchPublicAvailability());
    dispatch(fetchCourseSchedules(courseId));
  }, [courseId, dispatch, isCourseIdValid]);

  useEffect(() => {
    if (!token || !isCourseIdValid) {
      return;
    }

    validateToken(token, courseId);
  }, [courseId, isCourseIdValid, token, validateToken]);

  const effectiveTokenValidationStatus = !token || !isCourseIdValid ? "failed" : tokenValidationStatus;
  const tokenValidationMessage =
    !token || !isCourseIdValid
      ? "Booking link is missing or invalid."
      : tokenValidationResponse?.message ?? tokenValidationError ?? null;
  const validatedEnrollmentId = tokenValidationResponse?.enrollment_id ?? null;
  const isTokenValid = tokenValidationResponse?.valid ?? false;
  const isTokenExpired = !token || !isCourseIdValid ? true : (tokenValidationResponse?.expired ?? true);

  const availabilityDays = onboardingAvailability?.availability ?? [];
  const unavailableDateSet = useMemo(
    () => new Set((onboardingAvailability?.unavailable_dates ?? []).map((date) => date.slice(0, 10))),
    [onboardingAvailability?.unavailable_dates],
  );

  const availableSlots = useMemo(() => {
    if (!selectedDate || !onboardingAvailability) {
      return [] as Array<{ start: string; end: string }>;
    }

    const dayNumber = dayOfWeekToAvailabilityNumber(selectedDate);
    const dayConfig = availabilityDays.find((day) => day.day_of_week === dayNumber);
    if (!dayConfig) {
      return [];
    }

    const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
    if (unavailableDateSet.has(selectedDateKey)) {
      return [];
    }

    const bookedRanges = (onboardingAvailability.booked_slots ?? [])
      .filter((slot) => slot.date.slice(0, 10) === selectedDateKey)
      .map((slot) => ({
        startMinute: toMinuteIndex(slot.start_time),
        endMinute: toMinuteIndex(slot.end_time),
      }));

    const startMap = new Map<string, { start: string; end: string }>();

    dayConfig.time_slots.forEach((slot) => {
      const slotStart = toMinuteIndex(slot.start_time);
      const slotEnd = toMinuteIndex(slot.end_time);

      for (
        let candidateStart = slotStart;
        candidateStart + ONBOARDING_DURATION_MINUTES <= slotEnd;
        candidateStart += SLOT_STEP_MINUTES
      ) {
        const candidateEnd = candidateStart + ONBOARDING_DURATION_MINUTES;
        if (hasOverlap(candidateStart, candidateEnd, bookedRanges)) {
          continue;
        }

        const startLabel = format(addMinutes(parse("00:00", "HH:mm", new Date()), candidateStart), "HH:mm");
        const endLabel = format(addMinutes(parse("00:00", "HH:mm", new Date()), candidateEnd), "HH:mm");
        if (!startMap.has(startLabel)) {
          startMap.set(startLabel, { start: startLabel, end: endLabel });
        }
      }
    });

    return [...startMap.values()].sort((left, right) => left.start.localeCompare(right.start));
  }, [availabilityDays, onboardingAvailability, selectedDate, unavailableDateSet]);

  const isExpired =
    !token ||
    effectiveTokenValidationStatus === "failed" ||
    isTokenExpired ||
    !isTokenValid ||
    existingCourseSchedules.length > 0;

  const disabledDays = (date: Date) => {
    const today = startOfDay(new Date());
    if (!onboardingAvailability) return true;
    if (!isAfter(date, today)) return true;
    if (isAfter(date, addDays(today, 30))) return true;

    const month = date.getMonth() + 1;
    if (
      onboardingAvailability.month_start !== null &&
      onboardingAvailability.month_end !== null &&
      (month < onboardingAvailability.month_start || month > onboardingAvailability.month_end)
    ) {
      return true;
    }

    const dayConfig = availabilityDays.find((day) => day.day_of_week === dayOfWeekToAvailabilityNumber(date));
    if (!dayConfig) {
      return true;
    }

    const dateStr = format(date, "yyyy-MM-dd");
    if (unavailableDateSet.has(dateStr)) {
      return true;
    }

    const hasAnyOpenSlot = dayConfig.time_slots.some(
      (slot) => {
        const slotStart = toMinuteIndex(slot.start_time);
        const slotEnd = toMinuteIndex(slot.end_time);
        const bookedRanges = (onboardingAvailability.booked_slots ?? [])
          .filter((item) => item.date.slice(0, 10) === dateStr)
          .map((item) => ({
            startMinute: toMinuteIndex(item.start_time),
            endMinute: toMinuteIndex(item.end_time),
          }));

        for (
          let candidateStart = slotStart;
          candidateStart + ONBOARDING_DURATION_MINUTES <= slotEnd;
          candidateStart += SLOT_STEP_MINUTES
        ) {
          const candidateEnd = candidateStart + ONBOARDING_DURATION_MINUTES;
          if (!hasOverlap(candidateStart, candidateEnd, bookedRanges)) {
            return true;
          }
        }

        return false;
      },
    );
    if (!hasAnyOpenSlot) {
      return true;
    }

    return false;
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setBookingError(null);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setBookingError(null);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedTime || !validatedEnrollmentId) {
      setBookingError("Please choose a valid date and time.");
      return;
    }

    const slot = availableSlots.find((item) => item.start === selectedTime);
    if (!slot) {
      setBookingError("Selected time slot is no longer available. Please choose another.");
      return;
    }

    try {
      await dispatch(
        createSchedules([
          {
            enrollment_id: validatedEnrollmentId,
            date: format(selectedDate, "yyyy-MM-dd"),
            start_time: normalizeTimeForApi(slot.start),
            end_time: normalizeTimeForApi(slot.end),
          },
        ]),
      ).unwrap();

      setBookedRange({ start: slot.start, end: slot.end });
      setIsBooked(true);
      dispatch(fetchCourseSchedules(courseId));
    } catch {
      setBookingError("Unable to confirm booking right now. Please try again.");
    }

    setIsConfirmOpen(false);
  };

  if (!isCourseIdValid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Invalid Course</h2>
            <p className="text-muted-foreground mb-4">The onboarding link is invalid.</p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (courseStatus === "idle" || courseStatus === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Loading onboarding details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (courseStatus === "failed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Unable to Load Course</h2>
            <p className="text-muted-foreground mb-4">{courseError ?? "Please try again."}</p>
            <Button onClick={() => dispatch(fetchCourseDetail(courseId))}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Course Not Found</h2>
            <p className="text-muted-foreground mb-4">The course you're trying to book doesn't exist.</p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (effectiveTokenValidationStatus === "idle" || effectiveTokenValidationStatus === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Validating onboarding link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Link Expired</h2>
            <p className="text-muted-foreground mb-4">
              {tokenValidationMessage ?? "This booking link has expired or has already been used."}
            </p>
            <Button onClick={() => navigate("/account")}>Go to Account</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isBooked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Meeting Booked!</h2>
            <p className="text-muted-foreground mb-6">
              Your onboarding session has been scheduled successfully.
            </p>

            <div className="bg-accent/50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-foreground mb-3">Meeting Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-primary" />
                  <span className="text-foreground">
                    {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                  <span className="text-foreground">
                    {bookedRange ? `${bookedRange.start} - ${bookedRange.end}` : "Time confirmed"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" />
                  <span className="text-foreground">Zoom (link will be sent via email)</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              A confirmation email with the Zoom link will be sent to your registered email address.
            </p>

            <Button onClick={() => navigate("/account")} className="w-full">
              Go to My Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">EduConnect</h1>
              <p className="text-xs text-muted-foreground">Schedule Your Onboarding</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Book Your Onboarding Session
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Schedule your first one-on-one meeting with your tutor for{" "}
            <span className="font-medium text-foreground">{course.title}</span>
          </p>
          {onboardingAvailabilityStatus === "failed" && (
            <p className="text-sm text-destructive mt-3">
              {onboardingAvailabilityError ?? "Could not load tutor availability."}
            </p>
          )}
        </div>

        {!validatedEnrollmentId && (
          <Card className="mb-6 border-destructive/30">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {tokenValidationMessage ?? "You need a valid enrollment before booking onboarding."}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-primary" />
                Select a Date
              </CardTitle>
              <CardDescription>
                Choose an available date for your onboarding session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                {/* Calendar */}
                <div className="flex-shrink-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={disabledDays}
                    className="rounded-md border pointer-events-auto"
                    modifiers={{
                      available: (date) => !disabledDays(date),
                    }}
                    modifiersClassNames={{
                      available: "font-semibold",
                    }}
                  />
                </div>

                {/* Time Slots */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                      Available Start Times
                    {selectedDate && (
                      <span className="text-sm font-normal text-muted-foreground">
                        for {format(selectedDate, "MMM d")}
                      </span>
                    )}
                  </h3>

                  {!selectedDate ? (
                    <div className="bg-accent/50 rounded-lg p-6 text-center">
                      <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Select a date to see available one-hour start times
                      </p>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="bg-destructive/10 rounded-lg p-6 text-center">
                      <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                      <p className="text-sm text-destructive">
                        No one-hour slots available for this date. Please select another date.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.start}
                          onClick={() => handleTimeSelect(slot.start)}
                          className={cn(
                            "p-3 rounded-lg border text-sm font-medium transition-all text-left",
                            selectedTime === slot.start
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border hover:border-primary hover:bg-accent text-foreground"
                          )}
                        >
                          <span className="block">{slot.start}</span>
                          <span className="block text-xs opacity-80">ends {slot.end}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {bookingError && (
                    <p className="text-sm text-destructive mt-3">{bookingError}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Summary */}
          <Card className="h-fit lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="text-lg">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Course Info */}
              <div className="flex gap-3">
                <img
                  src={course.image_url ?? "/media/defaults/course-default.png"}
                  alt={course.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <h4 className="font-medium text-foreground text-sm">{course.title}</h4>
                  <p className="text-xs text-muted-foreground">Onboarding</p>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                {/* Selected Date */}
                <div className="flex items-start gap-3">
                  <CalendarCheck className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm font-medium text-foreground">
                      {selectedDate
                        ? format(selectedDate, "EEEE, MMMM d, yyyy")
                        : "Not selected"}
                    </p>
                  </div>
                </div>

                {/* Selected Time */}
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="text-sm font-medium text-foreground">
                      {selectedTime
                        ? `${selectedTime} - ${availableSlots.find((s) => s.start === selectedTime)?.end ?? ""}`
                        : "Not selected"}
                    </p>
                  </div>
                </div>

                {/* Meeting Type */}
                <div className="flex items-start gap-3">
                  <Video className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Meeting Type</p>
                    <p className="text-sm font-medium text-foreground">Zoom Video Call</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm font-medium text-foreground">1 hour</p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full mt-4"
                disabled={
                  !selectedDate ||
                  !selectedTime ||
                  !validatedEnrollmentId ||
                  createScheduleStatus === "loading" ||
                  onboardingAvailabilityStatus !== "succeeded"
                }
                onClick={() => setIsConfirmOpen(true)}
              >
                {createScheduleStatus === "loading" ? "Confirming..." : "Confirm Booking"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                You'll receive a confirmation email with the Zoom link
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-accent/30 rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-3">What to expect</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
              <span>30-minute one-on-one session with your dedicated tutor</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
              <span>Introduction to the course structure and learning path</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
              <span>Set your learning goals and schedule future sessions</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
              <span>Get answers to any questions about the course</span>
            </li>
          </ul>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Booking</DialogTitle>
            <DialogDescription>
              Please review the details below before confirming your onboarding session.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-accent/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Course</span>
              <span className="font-medium text-foreground">{course.title}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium text-foreground">
                {selectedDate && format(selectedDate, "MMMM d, yyyy")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium text-foreground">
                {selectedTime} - {availableSlots.find((s) => s.start === selectedTime)?.end}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium text-foreground">1 hour</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmBooking}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OnboardingBookingPage;
