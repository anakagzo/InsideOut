import { useEffect, useState } from "react";
import { Calendar, Video, Clock, User, BookOpen, Send, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format, isSameDay, parseISO } from "date-fns";
import { toast } from "sonner";
import type { Schedule } from "@/api/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchEnrollmentGroupedSchedules,
  fetchSchedules,
  refreshEnrollmentZoomLink,
  requestScheduleChange,
} from "@/store/thunks";
import { selectAccountScheduleEvents } from "@/store/selectors/accountSelectors";

interface SchedulesTabProps {
  isAdmin: boolean;
  currentUserId: string;
}

export const SchedulesTab = ({ isAdmin, currentUserId }: SchedulesTabProps) => {
  const dispatch = useAppDispatch();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [changeRequestOpen, setChangeRequestOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [refreshingEnrollmentId, setRefreshingEnrollmentId] = useState<number | null>(null);
  const [changeSubject, setChangeSubject] = useState("");
  const [changeComments, setChangeComments] = useState("");

  const schedulesList = useAppSelector((state) => state.schedules.list);
  const schedulesStatus = useAppSelector((state) => state.schedules.requests.list.status);
  const changeRequestStatus = useAppSelector((state) => state.schedules.requests.requestChange.status);
  const groupedStatus = useAppSelector((state) => state.enrollments.requests.groupedSchedules.status);
  const schedules = useAppSelector((state) => selectAccountScheduleEvents(state, isAdmin));

  useEffect(() => {
    if (isAdmin) {
      dispatch(fetchEnrollmentGroupedSchedules());
      return;
    }
    dispatch(fetchSchedules());
  }, [dispatch, isAdmin, currentUserId]);

  const scheduledDates = schedules.map((s) => parseISO(s.date));

  const eventsForSelectedDate = selectedDate
    ? schedules.filter((schedule) => {
        try {
          return isSameDay(parseISO(String(schedule.date)), selectedDate);
        } catch {
          return false;
        }
      })
    : [];

  const handleRequestChange = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setChangeSubject("");
    setChangeComments("");
    setChangeRequestOpen(true);
  };

  const handleRefreshZoomLink = async (enrollmentId: number) => {
    try {
      setRefreshingEnrollmentId(enrollmentId);
      const result = await dispatch(refreshEnrollmentZoomLink(enrollmentId)).unwrap();
      toast.success(`Meeting link refreshed for enrollment #${result.enrollment_id}.`);
      if (isAdmin) {
        dispatch(fetchEnrollmentGroupedSchedules());
      } else {
        dispatch(fetchSchedules());
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to refresh meeting link.";
      toast.error(message);
    } finally {
      setRefreshingEnrollmentId(null);
    }
  };

  const handleSendScheduleChangeRequest = async () => {
    if (!selectedSchedule) {
      return;
    }

    const subject = changeSubject.trim();
    if (!subject) {
      toast.error("Please add a subject for your request.");
      return;
    }

    try {
      const result = await dispatch(
        requestScheduleChange({
          scheduleId: selectedSchedule.id,
          payload: {
            subject,
            comments: changeComments.trim(),
          },
        }),
      ).unwrap();

      toast.success(`Request sent. ${result.queued_count} admin notification(s) queued.`);
      setChangeRequestOpen(false);
      setSelectedSchedule(null);
      setChangeSubject("");
      setChangeComments("");

      if (isAdmin) {
        dispatch(fetchEnrollmentGroupedSchedules());
      } else {
        dispatch(fetchSchedules());
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send schedule change request.";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{
              scheduled: scheduledDates,
            }}
            modifiersStyles={{
              scheduled: {
                backgroundColor: "hsl(var(--primary) / 0.15)",
                color: "hsl(var(--primary))",
                fontWeight: "bold",
              },
            }}
            className="rounded-md"
          />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-card-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
          </h3>

          {(isAdmin ? groupedStatus : schedulesStatus) === "loading" && (
            <p className="text-sm text-muted-foreground mb-3">Loading schedules...</p>
          )}

          {eventsForSelectedDate.length > 0 ? (
            <div className="space-y-3">
              {eventsForSelectedDate.map((event) => (
                <div
                  key={event.id}
                  className="bg-card border border-border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-card-foreground">Enrollment #{event.enrollment_id}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-card-foreground">
                        {event.start_time} - {event.end_time}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Status: <span className="text-card-foreground capitalize">{event.status}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Video className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      {event.zoom_link ? (
                        <a
                          href={event.zoom_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Join Zoom Meeting
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground">No meeting link yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={refreshingEnrollmentId === event.enrollment_id}
                        onClick={() => handleRefreshZoomLink(event.enrollment_id)}
                      >
                        <RefreshCcw className="w-4 h-4 mr-1" />
                        {refreshingEnrollmentId === event.enrollment_id ? "Refreshing Link..." : "Refresh Link"}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="w-full" onClick={() => handleRequestChange(event)}>
                      <Send className="w-4 h-4 mr-1" /> Request Change
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-lg">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No scheduled sessions on this date.</p>
              <p className="text-sm mt-1">Click on a highlighted date to view sessions.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={changeRequestOpen} onOpenChange={setChangeRequestOpen}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Request Schedule Change</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSchedule && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium text-card-foreground">Enrollment #{selectedSchedule.enrollment_id}</p>
                <p className="text-muted-foreground">
                  {format(parseISO(String(selectedSchedule.date)), "EEEE, MMM d, yyyy")} •{" "}
                  {selectedSchedule.start_time} - {selectedSchedule.end_time}
                </p>
              </div>
            )}
            <div>
              <Label>Subject</Label>
              <Input
                placeholder="Reason for change request"
                value={changeSubject}
                onChange={(event) => setChangeSubject(event.target.value)}
              />
            </div>
            <div>
              <Label>Comments</Label>
              <Textarea
                placeholder="Provide details about your preferred date/time or any other information..."
                rows={4}
                value={changeComments}
                onChange={(event) => setChangeComments(event.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              An email will be sent to the tutor with your request. You will receive a confirmation
              once the change is processed.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setChangeRequestOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={changeRequestStatus === "loading" || !selectedSchedule || !changeSubject.trim()}
              onClick={handleSendScheduleChangeRequest}
            >
              <Send className="w-4 h-4 mr-1" />
              {changeRequestStatus === "loading" ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
