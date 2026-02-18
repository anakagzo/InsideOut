import { useEffect, useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CourseCard } from "@/components/CourseCard";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCourses } from "@/store/thunks";

const ITEMS_PER_PAGE = 4;

const CoursesPage = () => {
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const coursesList = useAppSelector((state) => state.courses.list);
  const listStatus = useAppSelector((state) => state.courses.requests.list.status);
  const listError = useAppSelector((state) => state.courses.requests.list.error);

  useEffect(() => {
    dispatch(
      fetchCourses({
        page,
        page_size: ITEMS_PER_PAGE,
        search: search.trim() || undefined,
      }),
    );
  }, [dispatch, page, search]);

  const paginated = useMemo(
    () =>
      (coursesList?.data ?? []).map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        image: course.image_url,
        category: "Course",
        rating: course.average_rating,
        reviewCount: 0,
        price: Number(course.price),
      })),
    [coursesList],
  );

  const totalPages = coursesList?.pagination.total_pages ?? 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-foreground mb-2">All Courses</h1>
        <p className="text-muted-foreground mb-6">Browse our full catalogue of expert-led courses</p>

        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>

        <div className="space-y-5">
          {(listStatus === "idle" || listStatus === "loading") && (
            <p className="text-center text-muted-foreground py-12">Loading courses...</p>
          )}
          {listStatus === "failed" && (
            <div className="text-center py-12 space-y-3">
              <p className="text-muted-foreground">{listError ?? "Unable to load courses right now."}</p>
              <Button
                variant="outline"
                onClick={() => {
                  dispatch(
                    fetchCourses({
                      page,
                      page_size: ITEMS_PER_PAGE,
                      search: search.trim() || undefined,
                    }),
                  );
                }}
              >
                Retry
              </Button>
            </div>
          )}
          {paginated.map((course) => (
            <CourseCard key={course.id} course={course} variant="wide" />
          ))}
          {listStatus === "succeeded" && paginated.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No courses found matching your search.</p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i}
                variant={page === i + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setPage(i + 1)}
                className={page === i + 1 ? "bg-primary text-primary-foreground" : ""}
              >
                {i + 1}
              </Button>
            ))}
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CoursesPage;
