import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const DEFAULT_COURSE_IMAGE = "/media/defaults/course-default.png";

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
}

export function CourseCard({ course, variant = "compact" }: CourseCardProps) {
  const navigate = useNavigate();
  const imageSrc = course.image || DEFAULT_COURSE_IMAGE;

  if (variant === "wide") {
    return (
      <div
        onClick={() => navigate(`/course/${course.id}`)}
        className="flex flex-col sm:flex-row gap-4 bg-card rounded-lg border border-border shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer overflow-hidden group"
      >
        <div className="sm:w-64 h-48 sm:h-auto overflow-hidden shrink-0">
          <img src={imageSrc} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
        <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-primary bg-accent px-2 py-1 rounded-full">{course.category}</span>
            <h3 className="text-lg font-bold text-card-foreground mt-2">{course.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{course.description}</p>
            <div className="flex items-center gap-1 mt-2">
              <Star className="w-4 h-4 fill-star text-star" />
              <span className="text-sm font-semibold text-card-foreground">{course.rating}</span>
              <span className="text-xs text-muted-foreground">({course.reviewCount})</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className="text-xl font-bold text-primary">£{course.price}</span>
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); navigate(`/checkout/${course.id}`); }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Enroll Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => navigate(`/course/${course.id}`)}
      className="bg-card rounded-lg border border-border shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer overflow-hidden group min-w-[260px] max-w-[320px] flex-shrink-0"
    >
      <div className="h-44 overflow-hidden">
        <img src={imageSrc} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="p-4">
        <span className="text-xs font-medium text-primary bg-accent px-2 py-1 rounded-full">{course.category}</span>
        <h3 className="text-base font-bold text-card-foreground mt-2 line-clamp-1">{course.title}</h3>
        <div className="flex items-center gap-1 mt-2">
          <Star className="w-4 h-4 fill-star text-star" />
          <span className="text-sm font-semibold text-card-foreground">{course.rating}</span>
          <span className="text-xs text-muted-foreground">({course.reviewCount})</span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-bold text-primary">£{course.price}</span>
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); navigate(`/checkout/${course.id}`); }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Enroll
          </Button>
        </div>
      </div>
    </div>
  );
}
