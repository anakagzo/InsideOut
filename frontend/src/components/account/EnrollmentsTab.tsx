import { useEffect, useMemo, useState } from "react";
import { Search, Eye, Edit, Calendar, User, BookOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDays, format, parseISO } from "date-fns";
import { toast } from "sonner";
import type { Enrollment, PublicAvailabilityConfig } from "@/api/types";
import { availabilityApi, enrollmentsApi, schedulesApi } from "@/api/insideoutApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCourses, fetchEnrollments, fetchUsers } from "@/store/thunks";
import { selectFilteredEnrollmentRows } from "@/store/selectors/accountSelectors";

const SLOT_STEP_MINUTES = 30;
const DATE_WINDOW_DAYS = 90;
const ENROLLMENTS_PAGE_STEP = 50;

type DraftSchedule = {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
};

const normalizeTime = (value: string) => value.slice(0, 5);
const toMinuteIndex = (value: string) => {
  const [hours, minutes] = normalizeTime(value).split(":").map(Number);
  return hours * 60 + minutes;
};

const fromMinuteIndex = (value: number) => {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

const hasOverlap = (
  startMinute: number,
  endMinute: number,
  blockedRanges: Array<{ startMinute: number; endMinute: number }>,
) => blockedRanges.some((range) => startMinute < range.endMinute && endMinute > range.startMinute);

const dayOfWeekToAvailabilityNumber = (date: Date) => (date.getDay() === 0 ? 7 : date.getDay());

const isMonthWithinRange = (month: number, monthStart: number | null, monthEnd: number | null) => {
  if (monthStart === null || monthEnd === null) {
    return true;
  }
  if (monthStart <= monthEnd) {
    return month >= monthStart && month <= monthEnd;
  }
  return month >= monthStart || month <= monthEnd;
};

export const EnrollmentsTab = () => {
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [editStatus, setEditStatus] = useState<"active" | "completed">("active");
  const [draftSchedules, setDraftSchedules] = useState<DraftSchedule[]>([]);
  const [draftCounter, setDraftCounter] = useState(1);
  const [publicAvailability, setPublicAvailability] = useState<PublicAvailabilityConfig | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [enrollmentsPage, setEnrollmentsPage] = useState(1);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [confirmCompleteMessage, setConfirmCompleteMessage] = useState(
    "This enrollment has upcoming classes. Completing now will stop notifications and invalidate meeting links for pending sessions.",
  );

  const enrollmentsStatus = useAppSelector((state) => state.enrollments.requests.list.status);
  const enrollmentsList = useAppSelector((state) => state.enrollments.list);
  const filteredRows = useAppSelector((state) => selectFilteredEnrollmentRows(state, searchQuery));

  const loadedCount = enrollmentsList?.data.length ?? 0;
  const totalCount = enrollmentsList?.pagination.total ?? loadedCount;
  const hasMoreEnrollments = loadedCount < totalCount;

  useEffect(() => {
    const timeout = setTimeout(() => {
      dispatch(
        fetchEnrollments({
          page: enrollmentsPage,
          page_size: ENROLLMENTS_PAGE_STEP,
          search: searchQuery || undefined,
          append: enrollmentsPage > 1,
        }),
      );
    }, 250);

    return () => clearTimeout(timeout);
  }, [dispatch, enrollmentsPage, searchQuery]);

  useEffect(() => {
    setEnrollmentsPage(1);
  }, [searchQuery]);

  useEffect(() => {
    dispatch(fetchUsers({ page: 1, page_size: 100 }));
    dispatch(fetchCourses({ page: 1, page_size: 100 }));
  }, [dispatch]);

  const getRowMeta = (enrollmentId: number) => filteredRows.find((row) => row.enrollment.id === enrollmentId);

  const ensureAtLeastOneDraft = () => {
    setDraftSchedules((current) => {
      if (current.length > 0) {
        return current;
      }
      return [{ id: 1, date: "", start_time: "", end_time: "" }];
    });
  };

  useEffect(() => {
    if (!editModalOpen) {
      return;
    }

    let cancelled = false;

    const loadAvailability = async () => {
      setAvailabilityLoading(true);
      try {
        const data = await availabilityApi.getPublic();
        if (!cancelled) {
          setPublicAvailability(data);
        }
      } catch {
        if (!cancelled) {
          toast.error("Unable to load availability. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setAvailabilityLoading(false);
        }
      }
    };

    void loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [editModalOpen]);

  const blockedRangesForDate = (dateKey: string, draftId?: number) => {
    const bookedRanges = (publicAvailability?.booked_slots ?? [])
      .filter((slot) => slot.date.slice(0, 10) === dateKey)
      .map((slot) => ({
        startMinute: toMinuteIndex(slot.start_time),
        endMinute: toMinuteIndex(slot.end_time),
      }));

    const pendingRanges = draftSchedules
      .filter((draft) => draft.id !== draftId && draft.date === dateKey && draft.start_time && draft.end_time)
      .map((draft) => ({
        startMinute: toMinuteIndex(draft.start_time),
        endMinute: toMinuteIndex(draft.end_time),
      }));

    return [...bookedRanges, ...pendingRanges];
  };

  const getAvailableRangesForDate = (dateKey: string, draftId?: number) => {
    if (!publicAvailability) {
      return [] as Array<{ start: string; end: string }>;
    }

    const selectedDate = parseISO(`${dateKey}T00:00:00`);
    if (Number.isNaN(selectedDate.getTime())) {
      return [] as Array<{ start: string; end: string }>;
    }

    const unavailableDateSet = new Set((publicAvailability.unavailable_dates ?? []).map((item) => item.slice(0, 10)));
    if (unavailableDateSet.has(dateKey)) {
      return [] as Array<{ start: string; end: string }>;
    }

    const dayNumber = dayOfWeekToAvailabilityNumber(selectedDate);
    const dayConfig = (publicAvailability.availability ?? []).find((day) => day.day_of_week === dayNumber);
    if (!dayConfig) {
      return [] as Array<{ start: string; end: string }>;
    }

    const blockedRanges = blockedRangesForDate(dateKey, draftId);
    const optionsMap = new Map<string, { start: string; end: string }>();

    dayConfig.time_slots.forEach((slot) => {
      const slotStart = toMinuteIndex(slot.start_time);
      const slotEnd = toMinuteIndex(slot.end_time);

      for (
        let candidateStart = slotStart;
        candidateStart + SLOT_STEP_MINUTES <= slotEnd;
        candidateStart += SLOT_STEP_MINUTES
      ) {
        for (
          let candidateEnd = candidateStart + SLOT_STEP_MINUTES;
          candidateEnd <= slotEnd;
          candidateEnd += SLOT_STEP_MINUTES
        ) {
          if (hasOverlap(candidateStart, candidateEnd, blockedRanges)) {
            continue;
          }

          const startLabel = fromMinuteIndex(candidateStart);
          const endLabel = fromMinuteIndex(candidateEnd);
          const key = `${startLabel}-${endLabel}`;
          if (!optionsMap.has(key)) {
            optionsMap.set(key, { start: startLabel, end: endLabel });
          }
        }
      }
    });

    return [...optionsMap.values()].sort((left, right) => {
      if (left.start !== right.start) {
        return left.start.localeCompare(right.start);
      }
      return left.end.localeCompare(right.end);
    });
  };

  const availableDates = useMemo(() => {
    if (!publicAvailability) {
      return [] as string[];
    }

    const unavailableDateSet = new Set((publicAvailability.unavailable_dates ?? []).map((item) => item.slice(0, 10)));
    const today = new Date();
    const results: string[] = [];

    for (let offset = 0; offset <= DATE_WINDOW_DAYS; offset += 1) {
      const candidate = addDays(today, offset);
      const month = candidate.getMonth() + 1;
      if (!isMonthWithinRange(month, publicAvailability.month_start, publicAvailability.month_end)) {
        continue;
      }

      const key = format(candidate, "yyyy-MM-dd");
      if (unavailableDateSet.has(key)) {
        continue;
      }

      const dayNumber = dayOfWeekToAvailabilityNumber(candidate);
      const dayConfig = (publicAvailability.availability ?? []).find((day) => day.day_of_week === dayNumber);
      if (!dayConfig || !dayConfig.time_slots?.length) {
        continue;
      }

      if (getAvailableRangesForDate(key).length > 0) {
        results.push(key);
      }
    }

    return results;
  }, [publicAvailability]);

  const resetEditForm = () => {
    setDraftCounter(1);
    setDraftSchedules([{ id: 1, date: "", start_time: "", end_time: "" }]);
    setConfirmCompleteOpen(false);
    setConfirmCompleteMessage(
      "This enrollment has upcoming classes. Completing now will stop notifications and invalidate meeting links for pending sessions.",
    );
  };

  const handleOpenEditModal = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setEditStatus(enrollment.status === "completed" ? "completed" : "active");
    resetEditForm();
    setEditModalOpen(true);
  };

  const handleSaveEnrollment = async (forceComplete = false) => {
    if (!selectedEnrollment) {
      return;
    }

    const now = new Date();
    const selectedEndDate = selectedEnrollment.end_date ? new Date(selectedEnrollment.end_date) : null;
    const isEarlyCompletionAttempt =
      !forceComplete &&
      selectedEnrollment.status !== "completed" &&
      editStatus === "completed" &&
      selectedEndDate !== null &&
      selectedEndDate > now;

    if (isEarlyCompletionAttempt) {
      setConfirmCompleteMessage(
        "This enrollment has upcoming classes. Completing now will stop notifications and invalidate meeting links for pending sessions.",
      );
      setConfirmCompleteOpen(true);
      return;
    }

    const hasAnyScheduleField = draftSchedules.some((draft) => draft.date || draft.start_time || draft.end_time);
    const hasIncompleteScheduleRows = draftSchedules.some(
      (draft) => (draft.date || draft.start_time || draft.end_time) && !(draft.date && draft.start_time && draft.end_time),
    );

    const schedulesToCreate = draftSchedules.filter(
      (draft) => draft.date && draft.start_time && draft.end_time,
    );

    if (hasIncompleteScheduleRows) {
      toast.error("Please complete or remove each schedule row before saving.");
      return;
    }

    if (hasAnyScheduleField && schedulesToCreate.length === 0) {
      toast.error("Please add at least one valid schedule range.");
      return;
    }

    if (editStatus === "completed" && schedulesToCreate.length > 0) {
      toast.error("Set enrollment status to Active before adding a new session.");
      return;
    }

    setSaveLoading(true);
    try {
      if (schedulesToCreate.length > 0) {
        await schedulesApi.createMany(
          schedulesToCreate.map((draft) => ({
            enrollment_id: selectedEnrollment.id,
            date: draft.date,
            start_time: `${draft.start_time}:00`,
            end_time: `${draft.end_time}:00`,
          })),
        );
      }

      await enrollmentsApi.update(selectedEnrollment.id, {
        status: editStatus,
        force_complete: forceComplete,
      });

      setEnrollmentsPage(1);
      await dispatch(fetchEnrollments({ page: 1, page_size: ENROLLMENTS_PAGE_STEP, search: searchQuery || undefined }));
      toast.success("Enrollment updated successfully.");
      setConfirmCompleteOpen(false);
      setEditModalOpen(false);
      resetEditForm();
    } catch (error: unknown) {
      const responseData = (error as { response?: { status?: number; data?: { message?: string; requires_confirmation?: boolean } } })?.response?.data;
      const responseStatus = (error as { response?: { status?: number } })?.response?.status;
      const message = responseData?.message;

      if (responseStatus === 409) {
        setConfirmCompleteMessage(
          message ||
            "This enrollment has upcoming classes. Completing now will stop notifications and invalidate meeting links for pending sessions.",
        );
        setConfirmCompleteOpen(true);
        return;
      }

      toast.error(message || "Unable to update enrollment right now.");
    } finally {
      setSaveLoading(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      enrolled: "bg-success/10 text-success",
      completed: "bg-primary/10 text-primary",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by student or course..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-3">
        {enrollmentsStatus === "loading" && (
          <p className="text-sm text-muted-foreground">Loading enrollments...</p>
        )}

        {filteredRows.map((row) => {
          const enrollment = row.enrollment;
          return (
            <div
              key={enrollment.id}
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {row.userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-card-foreground text-sm">
                  {row.userName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{row.courseTitle}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={enrollment.status} />
                  <span className="text-xs text-muted-foreground">
                    Started: {format(new Date(enrollment.start_date), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setSelectedEnrollment(enrollment);
                    setViewModalOpen(true);
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleOpenEditModal(enrollment)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {filteredRows.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No enrollments found.</p>
          </div>
        )}

        {hasMoreEnrollments && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => setEnrollmentsPage((current) => current + 1)}
              disabled={enrollmentsStatus === "loading"}
            >
              {enrollmentsStatus === "loading" ? "Loading..." : `Load More (${loadedCount}/${totalCount})`}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Enrollment Details</DialogTitle>
          </DialogHeader>
          {selectedEnrollment && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <User className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-card-foreground text-sm">Student</p>
                  {(() => {
                    const rowMeta = getRowMeta(selectedEnrollment.id);
                    return (
                      <>
                  <p className="text-sm text-muted-foreground">
                    {rowMeta?.userName ?? `Student #${selectedEnrollment.student_id}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rowMeta?.userEmail ?? "No email available"}
                  </p>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <BookOpen className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-card-foreground text-sm">Course</p>
                  <p className="text-sm text-muted-foreground">
                    {getRowMeta(selectedEnrollment.id)?.courseTitle ?? `Course #${selectedEnrollment.course_id}`}
                  </p>
                  <StatusBadge status={selectedEnrollment.status} />
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Calendar className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-card-foreground text-sm">Schedule</p>
                  <p className="text-sm text-muted-foreground">
                    Start: {format(new Date(selectedEnrollment.start_date), "MMM d, yyyy")}
                  </p>
                  {selectedEnrollment.end_date && (
                    <p className="text-sm text-muted-foreground">
                      End: {format(new Date(selectedEnrollment.end_date), "MMM d, yyyy")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Open the Schedules tab for associated sessions.
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Edit Enrollment</DialogTitle>
          </DialogHeader>
          {selectedEnrollment && (
            <div className="space-y-4">
              <div>
                <Label>Student</Label>
                <Input
                  disabled
                  value={getRowMeta(selectedEnrollment.id)?.userName ?? `Student #${selectedEnrollment.student_id}`}
                />
              </div>
              <div>
                <Label>Course</Label>
                <Input
                  disabled
                  value={getRowMeta(selectedEnrollment.id)?.courseTitle ?? `Course #${selectedEnrollment.course_id}`}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={(value) => setEditStatus(value as "active" | "completed")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    disabled
                    value={selectedEnrollment.start_date ? format(new Date(selectedEnrollment.start_date), "yyyy-MM-dd") : "Not scheduled yet"}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    disabled
                    value={selectedEnrollment.end_date ? format(new Date(selectedEnrollment.end_date), "yyyy-MM-dd") : "Not scheduled yet"}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Start and end dates are auto-derived from schedule data (first meeting and last meeting).
              </p>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Add Schedules</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const nextId = draftCounter + 1;
                      setDraftCounter(nextId);
                      setDraftSchedules((current) => [...current, { id: nextId, date: "", start_time: "", end_time: "" }]);
                    }}
                    disabled={editStatus === "completed"}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Add one or more sessions before saving. Dates and time ranges only show currently available options.
                </p>
                {availabilityLoading && (
                  <p className="text-xs text-muted-foreground">Loading available slots...</p>
                )}
                {!availabilityLoading && availableDates.length === 0 && (
                  <p className="text-xs text-destructive">No available dates found in the current availability window.</p>
                )}
                <div className="space-y-2">
                  {draftSchedules.map((draft, index) => {
                    const timeRanges = draft.date ? getAvailableRangesForDate(draft.date, draft.id) : [];
                    const selectedRangeKey = draft.start_time && draft.end_time ? `${draft.start_time}-${draft.end_time}` : "";

                    return (
                      <div key={draft.id} className="space-y-1">
                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                          <Select
                            value={draft.date || undefined}
                            onValueChange={(value) => {
                              setDraftSchedules((current) =>
                                current.map((item) =>
                                  item.id === draft.id ? { ...item, date: value, start_time: "", end_time: "" } : item,
                                ),
                              );
                            }}
                            disabled={editStatus === "completed" || availabilityLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={`Date ${index + 1}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {availableDates.map((dateValue) => (
                                <SelectItem key={`${draft.id}-${dateValue}`} value={dateValue}>
                                  {format(parseISO(`${dateValue}T00:00:00`), "EEE, MMM d yyyy")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={selectedRangeKey || undefined}
                            onValueChange={(value) => {
                              const [start, end] = value.split("-");
                              setDraftSchedules((current) =>
                                current.map((item) =>
                                  item.id === draft.id ? { ...item, start_time: start, end_time: end } : item,
                                ),
                              );
                            }}
                            disabled={editStatus === "completed" || !draft.date || timeRanges.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={draft.date ? "Select time range" : "Choose date first"} />
                            </SelectTrigger>
                            <SelectContent>
                              {timeRanges.map((option) => {
                                const optionValue = `${option.start}-${option.end}`;
                                return (
                                  <SelectItem key={`${draft.id}-${optionValue}`} value={optionValue}>
                                    {option.start} - {option.end}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDraftSchedules((current) => {
                                if (current.length <= 1) {
                                  return [{ ...current[0], date: "", start_time: "", end_time: "" }];
                                }
                                return current.filter((item) => item.id !== draft.id);
                              });
                              ensureAtLeastOneDraft();
                            }}
                            disabled={editStatus === "completed"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {draft.date && !availabilityLoading && timeRanges.length === 0 && (
                          <p className="text-xs text-destructive px-1">
                            No available time ranges for this date. Choose another date.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setEditModalOpen(false); resetEditForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveEnrollment()}
              disabled={saveLoading}
            >
              {saveLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmCompleteOpen} onOpenChange={setConfirmCompleteOpen}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Complete Enrollment Early?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{confirmCompleteMessage}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmCompleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleSaveEnrollment(true)}
              disabled={saveLoading}
            >
              {saveLoading ? "Saving..." : "Proceed and Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
