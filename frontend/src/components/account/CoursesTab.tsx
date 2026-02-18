import { useEffect, useState } from "react";
import { Search, Plus, Edit, Trash2, ChevronRight, GraduationCap, BookOpen, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/StarRating";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createCourse,
  deleteCourse,
  fetchCourses,
  fetchSavedCourses,
  updateCourse,
} from "@/store/thunks";
import type { CourseSummary } from "@/api/types";
import { toast } from "sonner";
import {
  selectCoursesForAccountTab,
  selectCoursesLoadingForTab,
  selectStatusBadgeByCoursesTab,
} from "@/store/selectors/accountSelectors";

interface CoursesTabProps {
  isAdmin: boolean;
  currentUserId: string;
}

export const CoursesTab = ({ isAdmin, currentUserId }: CoursesTabProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "enrolled" | "completed" | "saved">("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseSummary | null>(null);

  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    price: "",
  });

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    price: "",
  });

  const displayedCourses = useAppSelector((state) => selectCoursesForAccountTab(state, activeTab));
  const isLoading = useAppSelector((state) => selectCoursesLoadingForTab(state, activeTab));
  const activeStatusBadge = useAppSelector((state) => selectStatusBadgeByCoursesTab(state, activeTab));
  const mutationMessage = useAppSelector((state) => state.courses.lastMutationMessage);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (activeTab === "saved") {
        dispatch(fetchSavedCourses({ page: 1, page_size: 50 }));
        return;
      }

      if (!isAdmin && (activeTab === "enrolled" || activeTab === "completed")) {
        dispatch(
          fetchCourses({
            page: 1,
            page_size: 50,
            search: searchQuery || undefined,
            type: activeTab === "enrolled" ? "active" : "completed",
          }),
        );
        return;
      }

      dispatch(
        fetchCourses({
          page: 1,
          page_size: 50,
          search: searchQuery || undefined,
        }),
      );
    }, 250);

    return () => clearTimeout(timeout);
  }, [activeTab, dispatch, isAdmin, searchQuery]);

  useEffect(() => {
    if (mutationMessage) {
      toast.success(mutationMessage);
    }
  }, [mutationMessage]);

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

  const CourseRow = ({ course, showStatus = false }: { course: CourseSummary; showStatus?: boolean }) => (
    <div
      onClick={() => navigate(`/course/${course.id}`)}
      className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg cursor-pointer hover:shadow-card-hover transition-shadow"
    >
      <img
        src={course.image_url || "/media/defaults/course-default.png"}
        alt={course.title}
        className="w-14 h-14 rounded-md object-cover"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-card-foreground text-sm truncate">{course.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <StarRating rating={course.average_rating || 0} />
          {showStatus && activeStatusBadge && <StatusBadge status={activeStatusBadge} />}
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
              setEditForm({
                title: course.title,
                description: course.description,
                price: String(course.price),
              });
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

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
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
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading courses...</p>
          ) : displayedCourses.length > 0 ? (
            displayedCourses.map((course) => <CourseRow key={course.id} course={course} showStatus={!isAdmin} />)
          ) : (
            <EmptyState icon={BookOpen} message="No courses found." />
          )}
        </TabsContent>

        <TabsContent value="enrolled" className="space-y-3 mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading enrolled courses...</p>
          ) : displayedCourses.length > 0 ? (
            displayedCourses.map((course) => <CourseRow key={course.id} course={course} showStatus />)
          ) : (
            <EmptyState icon={GraduationCap} message="No enrolled courses yet." />
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading completed courses...</p>
          ) : displayedCourses.length > 0 ? (
            displayedCourses.map((course) => <CourseRow key={course.id} course={course} showStatus />)
          ) : (
            <EmptyState icon={GraduationCap} message="No completed courses yet." />
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-3 mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading saved courses...</p>
          ) : displayedCourses.length > 0 ? (
            displayedCourses.map((course) => <CourseRow key={course.id} course={course} />)
          ) : (
            <EmptyState icon={Bookmark} message="No saved courses yet." />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Create New Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Course Title</Label>
              <Input
                placeholder="Enter course title"
                value={createForm.title}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div>
              <Label>Price</Label>
              <Input
                type="number"
                placeholder="199"
                value={createForm.price}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, price: event.target.value }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the course..."
                rows={3}
                value={createForm.description}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!createForm.title.trim() || !createForm.description.trim() || !createForm.price.trim()) {
                  toast.error("Title, description, and price are required.");
                  return;
                }

                try {
                  await dispatch(
                    createCourse({
                      title: createForm.title,
                      description: createForm.description,
                      price: createForm.price,
                    }),
                  ).unwrap();

                  setCreateModalOpen(false);
                  setCreateForm({ title: "", description: "", price: "" });
                  dispatch(fetchCourses({ page: 1, page_size: 50, search: searchQuery || undefined }));
                } catch {
                  toast.error("Failed to create course.");
                }
              }}
            >
              Create Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-card-foreground">Edit Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Course Title</Label>
              <Input
                value={editForm.title}
                onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div>
              <Label>Price</Label>
              <Input
                type="number"
                value={editForm.price}
                onChange={(event) => setEditForm((prev) => ({ ...prev, price: event.target.value }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editForm.description}
                rows={3}
                onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!selectedCourse) {
                  return;
                }

                try {
                  await dispatch(
                    updateCourse({
                      courseId: selectedCourse.id,
                      payload: {
                        title: editForm.title,
                        description: editForm.description,
                        price: editForm.price,
                      },
                    }),
                  ).unwrap();

                  setEditModalOpen(false);
                  dispatch(fetchCourses({ page: 1, page_size: 50, search: searchQuery || undefined }));
                } catch {
                  toast.error("Failed to update course.");
                }
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button
              variant="destructive"
              onClick={async () => {
                if (!selectedCourse) {
                  return;
                }

                try {
                  await dispatch(deleteCourse(selectedCourse.id)).unwrap();
                  setDeleteModalOpen(false);
                  dispatch(fetchCourses({ page: 1, page_size: 50, search: searchQuery || undefined }));
                } catch {
                  toast.error("Failed to delete course.");
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
