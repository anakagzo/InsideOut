import { useState } from "react";
import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AuthModal } from "@/components/AuthModal";
import defaultCourseImage from "@/assets/course-default-img.jpg";
import { useAppSelector } from "@/store/hooks";

const DEFAULT_COURSE_IMAGE = defaultCourseImage;
const DESCRIPTION_PREVIEW_CHAR_LIMIT = 120;

export interface CourseCardData {
  id: number | string;
  title: string;
  image: string | null;
  rating: number;
  reviewCount: number;
  price: number | string;
  description: string;
  category: string;
}

interface CourseCardProps {
  course: CourseCardData;
  variant?: "compact" | "wide";
  descriptionAction?: "dialog" | "navigate";
  descriptionActionLabel?: string;
  showPrice?: boolean;
}

export function CourseCard({
  course,
  variant = "compact",
  descriptionAction = "dialog",
  descriptionActionLabel,
  showPrice = true,
}: CourseCardProps) {
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.users.currentUser);
  const isAuthenticated = useAppSelector((state) => Boolean(state.users.auth.accessToken));
  const canEnroll = currentUser?.role !== "admin";
  const imageSrc = course.image?.trim() ? course.image : DEFAULT_COURSE_IMAGE;
  const numericRating = Number(course.rating);
  const hasRating = Number.isFinite(numericRating) && numericRating > 0;
  const isNewCourse = !hasRating;

  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const ctaLabel = descriptionActionLabel ?? (descriptionAction === "navigate" ? "See more" : "Read more");

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    if (target.src !== DEFAULT_COURSE_IMAGE) {
      target.src = DEFAULT_COURSE_IMAGE;
    }
  };

  const handleEnrollClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    navigate(`/checkout/${course.id}`);
  };

  if (variant === "wide") {
    return (
      <>
        <div
          onClick={() => navigate(`/course/${course.id}`)}
          className="flex flex-col sm:flex-row gap-4 bg-card rounded-lg border border-border shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer overflow-hidden group"
        >
          <div className="sm:w-64 h-48 sm:h-auto overflow-hidden shrink-0">
            <img
              src={imageSrc}
              alt={course.title}
              onError={handleImageError}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-primary bg-accent px-2 py-1 rounded-full">{course.category}</span>
              <h3
                className="text-lg font-bold text-card-foreground mt-2 break-words"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
                title={course.title}
              >
                {course.title}
              </h3>

              <p className="text-sm text-muted-foreground mt-1 line-clamp-2 break-words">{course.description}</p>
              {course.description.length > DESCRIPTION_PREVIEW_CHAR_LIMIT && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline mt-1"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (descriptionAction === "navigate") {
                      navigate(`/course/${course.id}`);
                      return;
                    }
                    setIsDescriptionOpen(true);
                  }}
                >
                  {ctaLabel}
                </button>
              )}

              <div className="flex items-center gap-1 mt-2">
                {isNewCourse ? (
                  <span className="text-xs font-semibold text-primary">New</span>
                ) : (
                  <>
                    <Star className="w-4 h-4 fill-star text-star" />
                    <span className="text-sm font-semibold text-card-foreground">{numericRating.toFixed(1)}</span>
                    {course.reviewCount > 0 && (
                      <span className="text-xs text-muted-foreground">({course.reviewCount})</span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              {showPrice ? <span className="text-xl font-bold text-primary">£{course.price}</span> : <span />}
              {canEnroll && (
                <Button
                  size="sm"
                  onClick={handleEnrollClick}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Enroll Now
                </Button>
              )}
            </div>
          </div>
        </div>

        <AuthModal
          open={isAuthModalOpen}
          onOpenChange={setIsAuthModalOpen}
          onAuthenticated={() => navigate(`/checkout/${course.id}`)}
        />
      </>
    );
  }

  return (
    <div
      onClick={() => navigate(`/course/${course.id}`)}
      className="bg-card rounded-lg border border-border shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer overflow-hidden group min-w-[260px] max-w-[320px] flex-shrink-0"
    >
      <div className="h-44 overflow-hidden">
        <img
          src={imageSrc}
          alt={course.title}
          onError={handleImageError}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      <div className="p-4">
        <span className="text-xs font-medium text-primary bg-accent px-2 py-1 rounded-full">{course.category}</span>
        <h3 className="text-base font-bold text-card-foreground mt-2 line-clamp-2 break-words">{course.title}</h3>

        <div className="flex items-center gap-1 mt-2">
          {isNewCourse ? (
            <span className="text-xs font-semibold text-primary">New</span>
          ) : (
            <>
              <Star className="w-4 h-4 fill-star text-star" />
              <span className="text-sm font-semibold text-card-foreground">{numericRating.toFixed(1)}</span>
              {course.reviewCount > 0 && (
                <span className="text-xs text-muted-foreground">({course.reviewCount})</span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between mt-3">
          {showPrice ? <span className="text-lg font-bold text-primary">£{course.price}</span> : <span />}
          {canEnroll && (
            <Button
              size="sm"
              onClick={handleEnrollClick}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Enroll
            </Button>
          )}
        </div>
      </div>

      {descriptionAction === "dialog" && (
        <Dialog open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
          <DialogContent className="bg-card w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-card-foreground break-words">{course.title}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{course.description}</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDescriptionOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AuthModal
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        onAuthenticated={() => navigate(`/checkout/${course.id}`)}
      />
    </div>
  );
}
