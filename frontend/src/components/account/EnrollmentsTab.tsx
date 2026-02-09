import { useState } from "react";
import { Search, Eye, Edit, Calendar, User, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { enrollments, users, courses } from "@/lib/mock-data";
import { format } from "date-fns";

export const EnrollmentsTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<typeof enrollments[0] | null>(null);

  const getUser = (userId: string) => users.find((u) => u.id === userId);
  const getCourse = (courseId: string) => courses.find((c) => c.id === courseId);

  const filteredEnrollments = enrollments.filter((e) => {
    const user = getUser(e.userId);
    const course = getCourse(e.courseId);
    const query = searchQuery.toLowerCase();
    return (
      user?.firstName.toLowerCase().includes(query) ||
      user?.lastName.toLowerCase().includes(query) ||
      course?.title.toLowerCase().includes(query)
    );
  });

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
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by student or course..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Enrollments List */}
      <div className="space-y-3">
        {filteredEnrollments.map((enrollment) => {
          const user = getUser(enrollment.userId);
          const course = getCourse(enrollment.courseId);
          return (
            <div
              key={enrollment.id}
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {user?.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-card-foreground text-sm">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{course?.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={enrollment.status} />
                  <span className="text-xs text-muted-foreground">
                    Started: {format(new Date(enrollment.startDate), "MMM d, yyyy")}
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
                  onClick={() => {
                    setSelectedEnrollment(enrollment);
                    setEditModalOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {filteredEnrollments.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No enrollments found.</p>
          </div>
        )}
      </div>

      {/* View Enrollment Modal */}
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
                  <p className="text-sm text-muted-foreground">
                    {getUser(selectedEnrollment.userId)?.firstName}{" "}
                    {getUser(selectedEnrollment.userId)?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getUser(selectedEnrollment.userId)?.email}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <BookOpen className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-card-foreground text-sm">Course</p>
                  <p className="text-sm text-muted-foreground">
                    {getCourse(selectedEnrollment.courseId)?.title}
                  </p>
                  <StatusBadge status={selectedEnrollment.status} />
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <Calendar className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-card-foreground text-sm">Schedule</p>
                  <p className="text-sm text-muted-foreground">
                    Start: {format(new Date(selectedEnrollment.startDate), "MMM d, yyyy")}
                  </p>
                  {selectedEnrollment.endDate && (
                    <p className="text-sm text-muted-foreground">
                      End: {format(new Date(selectedEnrollment.endDate), "MMM d, yyyy")}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedEnrollment.schedules.length} scheduled session(s)
                  </p>
                </div>
              </div>

              {selectedEnrollment.schedules.length > 0 && (
                <div className="space-y-2">
                  <p className="font-medium text-card-foreground text-sm">Upcoming Sessions</p>
                  {selectedEnrollment.schedules.map((schedule) => (
                    <div key={schedule.id} className="text-sm p-2 bg-secondary rounded">
                      <p className="text-card-foreground">
                        {format(new Date(schedule.date), "EEEE, MMM d, yyyy")}
                      </p>
                      <p className="text-muted-foreground">
                        {schedule.startTime} - {schedule.endTime}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Enrollment Modal */}
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
                  value={`${getUser(selectedEnrollment.userId)?.firstName} ${getUser(selectedEnrollment.userId)?.lastName}`}
                />
              </div>
              <div>
                <Label>Course</Label>
                <Select defaultValue={selectedEnrollment.courseId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select defaultValue={selectedEnrollment.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enrolled">Enrolled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" defaultValue={selectedEnrollment.startDate} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" defaultValue={selectedEnrollment.endDate || ""} />
                </div>
              </div>
              <div>
                <Label>Add Schedule</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Schedules are limited to your available times (Settings → My Availability)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Input type="date" placeholder="Date" />
                  <Input type="time" placeholder="Start" />
                  <Input type="time" placeholder="End" />
                </div>
                <Button variant="outline" size="sm" className="mt-2 w-full">
                  + Add Session
                </Button>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setEditModalOpen(false)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
