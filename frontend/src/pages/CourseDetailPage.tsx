import { useParams } from "react-router-dom";
import { useState } from "react";
import { Star, Bookmark, Calendar, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StarRating } from "@/components/StarRating";
import { courses, reviews } from "@/lib/mock-data";
import { useNavigate } from "react-router-dom";

const CourseDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const course = courses.find((c) => c.id === id);
  const [tab, setTab] = useState("details");

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Course not found.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero image */}
        <div className="w-full h-64 md:h-80 overflow-hidden relative">
          <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-6 left-0 right-0 container mx-auto px-4">
            <span className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1 rounded-full">{course.category}</span>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-2">{course.title}</h1>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-muted mb-6">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="schedules">Schedules</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <StarRating rating={course.rating} />
                  <span className="font-semibold text-foreground">{course.rating}</span>
                  <span className="text-sm text-muted-foreground">({course.reviewCount} reviews)</span>
                </div>
                <span className="text-2xl font-bold text-primary">£{course.price}</span>
              </div>

              <p className="text-muted-foreground leading-relaxed max-w-2xl">{course.description}</p>

              {/* Preview reviews */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Student Reviews</h3>
                <div className="space-y-4">
                  {reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="p-4 bg-card border border-border rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {review.initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-card-foreground">{review.name}</p>
                          <div className="flex items-center gap-1">
                            <StarRating rating={review.rating} size={12} />
                            <span className="text-xs text-muted-foreground ml-1">{review.date}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                      {review.tutorReply && (
                        <div className="mt-3 ml-4 pl-3 border-l-2 border-primary/30">
                          <p className="text-xs font-semibold text-primary mb-1">Tutor Reply</p>
                          <p className="text-sm text-muted-foreground">{review.tutorReply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setTab("reviews")} className="mt-3 text-sm text-primary font-medium hover:underline">
                  See more reviews →
                </button>
              </div>

              <div className="flex flex-wrap gap-3 pt-4">
                <Button size="lg" onClick={() => navigate(`/checkout/${course.id}`)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Enroll Now
                </Button>
                <Button size="lg" variant="outline">
                  <Bookmark className="w-4 h-4 mr-2" /> Save for Later
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="schedules">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">You are not enrolled for this course — no schedule.</p>
                <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate(`/checkout/${course.id}`)}>
                  Enroll to See Schedule
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="reviews">
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="p-4 bg-card border border-border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {review.initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-card-foreground">{review.name}</p>
                        <div className="flex items-center gap-1">
                          <StarRating rating={review.rating} size={12} />
                          <span className="text-xs text-muted-foreground ml-1">{review.date}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                    {review.tutorReply && (
                      <div className="mt-3 ml-4 pl-3 border-l-2 border-primary/30">
                        <p className="text-xs font-semibold text-primary mb-1">Tutor Reply</p>
                        <p className="text-sm text-muted-foreground">{review.tutorReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CourseDetailPage;
