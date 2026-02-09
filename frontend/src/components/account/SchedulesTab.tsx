import { useState } from "react";
import { Calendar, Video, Clock, User, BookOpen, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getUserSchedules, getAllSchedules, Schedule } from "@/lib/mock-data";
import { format, isSameDay, parseISO } from "date-fns";

interface SchedulesTabProps {
  isAdmin: boolean;
  currentUserId: string;
}

export const SchedulesTab = ({ isAdmin, currentUserId }: SchedulesTabProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [changeRequestOpen, setChangeRequestOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  const schedules = isAdmin ? getAllSchedules() : getUserSchedules(currentUserId);

  const scheduledDates = schedules.map((s) => parseISO(s.date));

  const eventsForSelectedDate = selectedDate
    ? schedules.filter((s) => isSameDay(parseISO(s.date), selectedDate))
    : [];

  const handleRequestChange = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setChangeRequestOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Calendar */}
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

        {/* Event Details */}
        <div className="flex-1">
          <h3 className="font-semibold text-card-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
          </h3>

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
                      <p className="font-medium text-card-foreground">{event.courseTitle}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-card-foreground">
                        {event.startTime} - {event.endTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Student: <span className="text-card-foreground">{event.studentName}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Tutor: <span className="text-card-foreground">{event.tutorName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Video className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <a
                        href={event.zoomLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Join Zoom Meeting
                      </a>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => handleRequestChange(event)}
                  >
                    <Send className="w-4 h-4 mr-1" /> Request Change
                  </Button>
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

      {/* Request Change Modal */}
      <Dialog open={changeRequestOpen} onOpenChange={setChangeRequestOpen}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Request Schedule Change</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSchedule && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium text-card-foreground">{selectedSchedule.courseTitle}</p>
                <p className="text-muted-foreground">
                  {format(parseISO(selectedSchedule.date), "EEEE, MMM d, yyyy")} •{" "}
                  {selectedSchedule.startTime} - {selectedSchedule.endTime}
                </p>
              </div>
            )}
            <div>
              <Label>Subject</Label>
              <Input placeholder="Reason for change request" />
            </div>
            <div>
              <Label>Comments</Label>
              <Textarea
                placeholder="Provide details about your preferred date/time or any other information..."
                rows={4}
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
            <Button onClick={() => setChangeRequestOpen(false)}>
              <Send className="w-4 h-4 mr-1" /> Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
