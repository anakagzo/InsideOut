import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Play, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CourseCard } from "@/components/CourseCard";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCourses } from "@/store/thunks";
import heroImage from "@/assets/hero-image.jpg";
import tutorPortrait from "@/assets/tutor-portrait.jpg";

const Index = () => {
  const dispatch = useAppDispatch();
  const scrollRef = useRef<HTMLDivElement>(null);
  const coursesList = useAppSelector((state) => state.courses.list);
  const listStatus = useAppSelector((state) => state.courses.requests.list.status);

  useEffect(() => {
    dispatch(fetchCourses({ page: 1, page_size: 8 }));
  }, [dispatch]);

  const popularCourses = (coursesList?.data ?? []).map((course) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    image: course.image_url,
    category: "Course",
    rating: course.average_rating,
    reviewCount: 0,
    price: Number(course.price),
  }));

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Students learning online" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-foreground/60" />
        </div>
        <div className="relative container mx-auto px-4 py-24 md:py-36">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground leading-tight">
              Learn with Expert
              <span className="block text-gradient">Live Tutoring</span>
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/80 max-w-lg">
              Enroll in professional courses and book personalised face-to-face sessions with expert tutors via Zoom.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8">
                Explore Courses
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-base px-8">
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Courses */}
      <section id="courses" className="py-20 bg-secondary">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex items-end justify-between mb-8"
          >
            <div>
              <h2 className="text-3xl font-bold text-foreground">Popular Courses</h2>
              <p className="text-muted-foreground mt-1">Explore our most sought-after programmes</p>
            </div>
            <div className="hidden sm:flex gap-2">
              <button onClick={() => scroll("left")} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors" aria-label="Scroll left">
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <button onClick={() => scroll("right")} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors" aria-label="Scroll right">
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </motion.div>

          <div ref={scrollRef} className="flex gap-5 overflow-x-auto hide-scrollbar pb-4">
            {popularCourses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <CourseCard course={course} />
              </motion.div>
            ))}
            {(listStatus === "idle" || listStatus === "loading") && (
              <p className="text-muted-foreground py-8">Loading courses...</p>
            )}
            {listStatus === "succeeded" && popularCourses.length === 0 && (
              <p className="text-muted-foreground py-8">No courses available yet.</p>
            )}
          </div>

          <div className="mt-8 text-center">
            <Link to="/courses" className="inline-flex items-center gap-1 text-primary font-semibold hover:underline text-sm">
              See all courses <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="aspect-video bg-muted rounded-xl overflow-hidden relative group cursor-pointer">
                <img src={tutorPortrait} alt="Meet your tutor" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center group-hover:bg-foreground/40 transition-colors">
                  <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                    <Play className="w-6 h-6 text-primary-foreground ml-1" />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold text-foreground">Meet Your Tutor</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                With over 10 years of experience in education and technology, our lead tutor is passionate about making learning accessible and engaging for everyone.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                EduConnect was founded to bridge the gap between online convenience and the personalised attention of face-to-face tutoring. Every student receives tailored guidance through live Zoom sessions.
              </p>

              {/* Certifications */}
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Certifications & Achievements</h3>
                <div className="flex flex-wrap gap-3">
                  {["Certified Educator", "Google Partner", "AWS Certified", "ISO 27001"].map((cert) => (
                    <div key={cert} className="flex items-center gap-2 px-3 py-2 bg-accent rounded-lg">
                      <Award className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-accent-foreground">{cert}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
