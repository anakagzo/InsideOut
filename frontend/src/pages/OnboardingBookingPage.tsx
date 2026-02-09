import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, addDays, isSameDay, isAfter, startOfDay } from "date-fns";
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
import { courses } from "@/lib/mock-data";

// Mock admin availability - days of week (0=Sun, 6=Sat) and time slots
const adminAvailability = {
  daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
  timeSlots: [
    { start: "09:00", end: "09:30" },
    { start: "10:00", end: "10:30" },
    { start: "11:00", end: "11:30" },
    { start: "14:00", end: "14:30" },
    { start: "15:00", end: "15:30" },
    { start: "16:00", end: "16:30" },
  ],
  // Dates that are already booked (mock data)
  bookedSlots: [
    { date: format(addDays(new Date(), 1), "yyyy-MM-dd"), time: "10:00" },
    { date: format(addDays(new Date(), 2), "yyyy-MM-dd"), time: "14:00" },
    { date: format(addDays(new Date(), 3), "yyyy-MM-dd"), time: "09:00" },
  ],
};

const OnboardingBookingPage = () => {
  const { id, token } = useParams();
  const navigate = useNavigate();
  const course = courses.find((c) => c.id === id);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isBooked, setIsBooked] = useState(false);
  const [isExpired] = useState(false); // Would be checked against backend

  // Get available time slots for selected date
  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];

    const dayOfWeek = selectedDate.getDay();
    if (!adminAvailability.daysOfWeek.includes(dayOfWeek)) return [];

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const bookedTimes = adminAvailability.bookedSlots
      .filter((slot) => slot.date === dateStr)
      .map((slot) => slot.time);

    return adminAvailability.timeSlots.filter(
      (slot) => !bookedTimes.includes(slot.start)
    );
  }, [selectedDate]);

  // Disable dates that are not available
  const disabledDays = (date: Date) => {
    const today = startOfDay(new Date());
    if (!isAfter(date, today)) return true;
    if (!adminAvailability.daysOfWeek.includes(date.getDay())) return true;
    // Disable dates more than 30 days in the future
    if (isAfter(date, addDays(today, 30))) return true;
    return false;
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleConfirmBooking = () => {
    // Mock booking confirmation
    setIsBooked(true);
    setIsConfirmOpen(false);
  };

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

  if (isExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Link Expired</h2>
            <p className="text-muted-foreground mb-4">
              This booking link has expired or has already been used.
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
                    {selectedTime} - {adminAvailability.timeSlots.find(s => s.start === selectedTime)?.end}
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
        </div>

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
                    Available Times
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
                        Select a date to see available time slots
                      </p>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="bg-destructive/10 rounded-lg p-6 text-center">
                      <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                      <p className="text-sm text-destructive">
                        No available slots for this date. Please select another date.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.start}
                          onClick={() => handleTimeSelect(slot.start)}
                          className={cn(
                            "p-3 rounded-lg border text-sm font-medium transition-all",
                            selectedTime === slot.start
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border hover:border-primary hover:bg-accent text-foreground"
                          )}
                        >
                          {slot.start}
                        </button>
                      ))}
                    </div>
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
                  src={course.image}
                  alt={course.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <h4 className="font-medium text-foreground text-sm">{course.title}</h4>
                  <p className="text-xs text-muted-foreground">{course.category}</p>
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
                        ? `${selectedTime} - ${adminAvailability.timeSlots.find(s => s.start === selectedTime)?.end}`
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
              </div>

              <Button
                className="w-full mt-4"
                disabled={!selectedDate || !selectedTime}
                onClick={() => setIsConfirmOpen(true)}
              >
                Confirm Booking
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
                {selectedTime} - {adminAvailability.timeSlots.find(s => s.start === selectedTime)?.end}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium text-foreground">30 minutes</span>
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
