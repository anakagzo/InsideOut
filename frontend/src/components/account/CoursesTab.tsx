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
import defaultCourseImage from "@/assets/course-default-img.jpg";

interface CoursesTabProps {
  isAdmin: boolean;
  currentUserId: string;
}


const DEFAULT_COURSE_IMAGE = defaultCourseImage;
const DESCRIPTION_PREVIEW_CHAR_LIMIT = 120;

export const CoursesTab = ({ isAdmin, currentUserId }: CoursesTabProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "enrolled" | "completed" | "saved">("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseSummary | null>(null);
  const [descriptionCourse, setDescriptionCourse] = useState<CourseSummary | null>(null);

  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

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

  useEffect(
    () => () => {
      if (createImagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(createImagePreview);
      }
    },
    [createImagePreview],
  );

  useEffect(
    () => () => {
      if (editImagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(editImagePreview);
      }
    },
    [editImagePreview],
  );

  const isValidJpg = (file: File) => {
    const isJpegMime = file.type === "image/jpeg" || file.type === "image/jpg";
    const hasJpegExtension = /\.(jpe?g)$/i.test(file.name);
    return isJpegMime || hasJpegExtension;
  };

  const onSelectCreateImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      if (createImagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(createImagePreview);
      }
      setCreateImageFile(null);
      setCreateImagePreview(null);
      return;
    }

    if (!isValidJpg(file)) {
      toast.error("Please upload a JPG image (.jpg or .jpeg).");
      event.target.value = "";
      return;
    }

    if (createImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(createImagePreview);
    }

    setCreateImageFile(file);
    setCreateImagePreview(URL.createObjectURL(file));
  };

  const onSelectEditImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      if (editImagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(editImagePreview);
      }
      setEditImageFile(null);
      setEditImagePreview(null);
      return;
    }

    if (!isValidJpg(file)) {
      toast.error("Please upload a JPG image (.jpg or .jpeg).");
      event.target.value = "";
      return;
    }

    if (editImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(editImagePreview);
    }

    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
  };

  const resetCreateMediaState = () => {
    if (createImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(createImagePreview);
    }
    setCreateImageFile(null);
    setCreateImagePreview(null);
  };

  const resetEditMediaState = () => {
    if (editImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(editImagePreview);
    }
    setEditImageFile(null);
    setEditImagePreview(null);
  };

  const handleCourseImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    if (target.src !== DEFAULT_COURSE_IMAGE) {
      target.src = DEFAULT_COURSE_IMAGE;
    }
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

  const CourseRow = ({ course, showStatus = false }: { course: CourseSummary; showStatus?: boolean }) => (
    <div
      onClick={() => navigate(`/course/${course.id}`)}
      className="flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-card border border-border rounded-lg cursor-pointer hover:shadow-card-hover transition-shadow"
    >
      <img
        src={course.image_url || DEFAULT_COURSE_IMAGE}
        alt={course.title}
        onError={handleCourseImageError}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-md object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0 space-y-1">
        <p
          className="font-medium text-card-foreground text-sm overflow-hidden break-words"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 1,
            WebkitBoxOrient: "vertical",
          }}
          title={course.title}
        >
          {course.title}
        </p>
        <p
          className="text-xs text-muted-foreground overflow-hidden break-words"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {course.description}
        </p>
        {course.description.length > DESCRIPTION_PREVIEW_CHAR_LIMIT && (
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={(event) => {
              event.stopPropagation();
              setDescriptionCourse(course);
            }}
          >
            Read more
          </button>
        )}
        <div className="flex items-center gap-2 mt-1">
          <StarRating rating={course.average_rating || 0} />
          {showStatus && activeStatusBadge && <StatusBadge status={activeStatusBadge} />}
        </div>
      </div>
      {isAdmin && (
        <div className="flex items-center gap-1 self-start sm:self-center" onClick={(e) => e.stopPropagation()}>
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
              resetEditMediaState();
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
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 self-center" />
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
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
          <Button className="w-full sm:w-auto" onClick={() => setCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create Course
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="bg-secondary w-full justify-start overflow-x-auto whitespace-nowrap">
          <TabsTrigger value="all" className="gap-1 shrink-0">
            <BookOpen className="w-3.5 h-3.5" /> All
          </TabsTrigger>
          <TabsTrigger value="enrolled" className="gap-1 shrink-0">
            <GraduationCap className="w-3.5 h-3.5" /> Enrolled
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1 shrink-0">
            <GraduationCap className="w-3.5 h-3.5" /> Completed
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-1 shrink-0">
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

      <Dialog
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) {
            resetCreateMediaState();
          }
        }}
      >
        <DialogContent className="bg-card w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
            <div>
              <Label htmlFor="create-course-image">Course Image (JPG)</Label>
              <Input
                id="create-course-image"
                type="file"
                accept=".jpg,.jpeg,image/jpeg"
                onChange={onSelectCreateImage}
              />
              <div className="mt-2 flex items-center gap-3 rounded-md border border-border p-2">
                <img
                  src={createImagePreview || DEFAULT_COURSE_IMAGE}
                  alt="Course preview"
                  onError={handleCourseImageError}
                  className="w-16 h-16 rounded-md object-cover"
                />
                <p className="text-xs text-muted-foreground break-all">
                  {createImageFile?.name ?? "No image selected. A default course image will be used."}
                </p>
              </div>
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
                      media: createImageFile,
                    }),
                  ).unwrap();

                  setCreateModalOpen(false);
                  setCreateForm({ title: "", description: "", price: "" });
                  resetCreateMediaState();
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

      <Dialog
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            resetEditMediaState();
          }
        }}
      >
        <DialogContent className="bg-card w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
            <div>
              <Label htmlFor="edit-course-image">Course Image (JPG)</Label>
              <Input
                id="edit-course-image"
                type="file"
                accept=".jpg,.jpeg,image/jpeg"
                onChange={onSelectEditImage}
              />
              <div className="mt-2 flex items-center gap-3 rounded-md border border-border p-2">
                <img
                  src={editImagePreview || selectedCourse?.image_url || DEFAULT_COURSE_IMAGE}
                  alt="Course preview"
                  onError={handleCourseImageError}
                  className="w-16 h-16 rounded-md object-cover"
                />
                <p className="text-xs text-muted-foreground break-all">
                  {editImageFile?.name ?? "Keep current image or upload a JPG to replace it."}
                </p>
              </div>
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
                        media: editImageFile,
                      },
                    }),
                  ).unwrap();

                  setEditModalOpen(false);
                  resetEditMediaState();
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

      <Dialog open={Boolean(descriptionCourse)} onOpenChange={(open) => !open && setDescriptionCourse(null)}>
        <DialogContent className="bg-card w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-card-foreground break-words">{descriptionCourse?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{descriptionCourse?.description}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDescriptionCourse(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
