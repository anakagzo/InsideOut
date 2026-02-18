import { useEffect, useState } from "react";
import { Search, Eye, Edit, Calendar, User, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Enrollment } from "@/api/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCourses, fetchEnrollments, fetchUsers } from "@/store/thunks";
import { selectFilteredEnrollmentRows } from "@/store/selectors/accountSelectors";

export const EnrollmentsTab = () => {
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);

  const enrollmentsResponse = useAppSelector((state) => state.enrollments.list);
  const enrollmentsStatus = useAppSelector((state) => state.enrollments.requests.list.status);
  const coursesResponse = useAppSelector((state) => state.courses.list);
  const filteredRows = useAppSelector((state) => selectFilteredEnrollmentRows(state, searchQuery));

  useEffect(() => {
    const timeout = setTimeout(() => {
      dispatch(fetchEnrollments({ page: 1, page_size: 100, search: searchQuery || undefined }));
    }, 250);

    return () => clearTimeout(timeout);
  }, [dispatch, searchQuery]);

  useEffect(() => {
    dispatch(fetchUsers({ page: 1, page_size: 100 }));
    dispatch(fetchCourses({ page: 1, page_size: 100 }));
  }, [dispatch]);

  const getRowMeta = (enrollmentId: number) => filteredRows.find((row) => row.enrollment.id === enrollmentId);

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

        {filteredRows.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No enrollments found.</p>
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
                <Select defaultValue={String(selectedEnrollment.course_id)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(coursesResponse?.data ?? []).map((course) => (
                      <SelectItem key={course.id} value={String(course.id)}>
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" defaultValue={selectedEnrollment.start_date} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" defaultValue={selectedEnrollment.end_date || ""} />
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
            <Button
              onClick={() => {
                toast.info("Enrollment edit endpoint is not available yet.");
                setEditModalOpen(false);
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
