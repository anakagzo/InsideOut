import { useState } from "react";
import { Search, Plus, Edit, Trash2, ChevronRight, GraduationCap, BookOpen, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { courses, users, enrollments } from "@/lib/mock-data";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/StarRating";

interface CoursesTabProps {
  isAdmin: boolean;
  currentUserId: string;
}

export const CoursesTab = ({ isAdmin, currentUserId }: CoursesTabProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<typeof courses[0] | null>(null);

  const currentUser = users.find((u) => u.id === currentUserId);
  
  const enrolledCourseIds = currentUser?.enrolledCourses
    .filter((ec) => ec.status === "enrolled")
    .map((ec) => ec.courseId) || [];
  
  const completedCourseIds = currentUser?.enrolledCourses
    .filter((ec) => ec.status === "completed")
    .map((ec) => ec.courseId) || [];
  
  const savedCourseIds = currentUser?.savedCourses || [];

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const enrolledCourses = courses.filter((c) => enrolledCourseIds.includes(c.id));
  const completedCourses = courses.filter((c) => completedCourseIds.includes(c.id));
  const savedCourses = courses.filter((c) => savedCourseIds.includes(c.id));

  const getEnrollmentStatus = (courseId: string) => {
    if (completedCourseIds.includes(courseId)) return "completed";
    if (enrolledCourseIds.includes(courseId)) return "enrolled";
    return "not-enrolled";
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      enrolled: "bg-success/10 text-success",
      completed: "bg-primary/10 text-primary",
      "not-enrolled": "bg-muted text-muted-foreground",
    };
    const labels = {
      enrolled: "Enrolled",
      completed: "Completed",
      "not-enrolled": "Not Enrolled",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const CourseRow = ({ course, showStatus = false }: { course: typeof courses[0]; showStatus?: boolean }) => (
    <div
      onClick={() => navigate(`/course/${course.id}`)}
      className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg cursor-pointer hover:shadow-card-hover transition-shadow"
    >
      <img src={course.image} alt={course.title} className="w-14 h-14 rounded-md object-cover" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-card-foreground text-sm truncate">{course.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <StarRating rating={course.rating} />
          <span className="text-xs text-muted-foreground">({course.reviewCount})</span>
          {showStatus && <StatusBadge status={getEnrollmentStatus(course.id)} />}
        </div>
      </div>
      {isAdmin && (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedCourse(course);
              setEditModalOpen(true);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => {
              setSelectedCourse(course);
              setDeleteModalOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </div>
  );

  const EmptyState = ({ icon: Icon, message }: { icon: React.ElementType; message: string }) => (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="w-10 h-10 mx-auto mb-2 opacity-50" />
      <p>{message}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Search and Create */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create Course
          </Button>
        )}
      </div>

      {/* Sub-tabs */}
      <Tabs defaultValue="all">
        <TabsList className="bg-secondary">
          <TabsTrigger value="all" className="gap-1">
            <BookOpen className="w-3.5 h-3.5" /> All
          </TabsTrigger>
          <TabsTrigger value="enrolled" className="gap-1">
            <GraduationCap className="w-3.5 h-3.5" /> Enrolled
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1">
            <GraduationCap className="w-3.5 h-3.5" /> Completed
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-1">
            <Bookmark className="w-3.5 h-3.5" /> Saved
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-4">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course) => (
              <CourseRow key={course.id} course={course} showStatus />
            ))
          ) : (
            <EmptyState icon={BookOpen} message="No courses found." />
          )}
        </TabsContent>

        <TabsContent value="enrolled" className="space-y-3 mt-4">
          {enrolledCourses.length > 0 ? (
            enrolledCourses.map((course) => <CourseRow key={course.id} course={course} />)
          ) : (
            <EmptyState icon={GraduationCap} message="No enrolled courses yet." />
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 mt-4">
          {completedCourses.length > 0 ? (
            completedCourses.map((course) => <CourseRow key={course.id} course={course} />)
          ) : (
            <EmptyState icon={GraduationCap} message="No completed courses yet." />
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-3 mt-4">
          {savedCourses.length > 0 ? (
            savedCourses.map((course) => <CourseRow key={course.id} course={course} />)
          ) : (
            <EmptyState icon={Bookmark} message="No saved courses yet." />
          )}
        </TabsContent>
      </Tabs>

      {/* Create Course Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Create New Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Course Title</Label>
              <Input placeholder="Enter course title" />
            </div>
            <div>
              <Label>Category</Label>
              <Input placeholder="e.g., Development, Design" />
            </div>
            <div>
              <Label>Price ($)</Label>
              <Input type="number" placeholder="199" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Describe the course..." rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={() => setCreateModalOpen(false)}>Create Course</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Course Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Edit Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Course Title</Label>
              <Input defaultValue={selectedCourse?.title} />
            </div>
            <div>
              <Label>Category</Label>
              <Input defaultValue={selectedCourse?.category} />
            </div>
            <div>
              <Label>Price ($)</Label>
              <Input type="number" defaultValue={selectedCourse?.price} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea defaultValue={selectedCourse?.description} rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={() => setEditModalOpen(false)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Delete Course?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{selectedCourse?.title}"? This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" autoFocus onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => setDeleteModalOpen(false)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
