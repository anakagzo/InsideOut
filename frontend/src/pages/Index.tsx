import { useEffect, useRef, useState } from "react";
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
  const [showProgramme, setShowProgramme] = useState(false);
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
          <img
            src={heroImage}
            alt="Students learning online"
            className="w-full h-full  object-cover "
          />
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
              Behaviour Is Communication
              <span className="block text-gradient my-6">Let’s Listen Differently.</span>
            </h1>
            <p className="mt-6 text-lg text-primary-foreground/80 max-w-lg">
              The Inside Out Programme helps families and professionals understand the emotional world of neurodivergent children, fostering connection, shared responsibility, and meaningful, lasting support.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {/*  
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8">
                Explore Courses
              </Button>
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-base px-8">
                Learn More
              </Button>
              */}
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
              <div className="aspect-video bg-muted rounded-xl overflow-hidden relative group ">
                <img src={tutorPortrait} alt="Meet your tutor" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center group-hover:bg-foreground/40 transition-colors">
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
              I am Freda McWen, a certified professional with over 10 years of experience in education and technology. Having a neurodivergent child personally inspired my passion to support children and families through understanding, connection, and tailored guidance.
            </p>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Inside Out Programme was founded to combine the convenience of online learning with the personalised care of one-to-one tutoring. Every student benefits from live Zoom sessions designed to meet their unique learning needs, ensuring support that is both effective and empathetic.
            </p>

              {/* Certifications */}
              <div className="mt-8">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Certifications & Achievements</h3>
                <div className="flex flex-wrap gap-3">
                  {["Certified Educator", "CPD Certified"].map((cert) => (
                    <div key={cert} className="flex items-center gap-2 px-3 py-2 bg-accent rounded-lg">
                      <Award className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-accent-foreground">{cert}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowProgramme(!showProgramme)}
                className="mt-8 text-primary font-semibold hover:underline text-sm inline-flex items-center gap-1"
              >
                Read More <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About the Programme */}
      {showProgramme && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full bg-secondary py-20"
        >
          <div className="w-full px-2">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-foreground mb-6">About the Programme</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  The Inside Out Programme works from the inside out — prioritising emotional safety, regulation, and relationships before focusing on behaviour.        
                  Our approach integrates trauma-informed and neuro-affirming practice, systemic thinking, and practical strategies grounded in real-life care settings. By supporting the entire system around the child — families, schools, and professionals — we create aligned, sustainable change rather than isolated interventions.
                </p>
                <p>
                  Family Group Conferencing (FGC) is a cornerstone of the programme, offering a structured and professionally facilitated space where families and professionals collaborate to design clear, strengths-based, child-centred plans that endure.
                </p>
                <p>
                  Inside Out offers professionally delivered one-to-one courses, hosted live via Zoom and available for enrolment directly through our homepage. These scheduled, paid courses provide personalised guidance, practical regulation tools, and deep insight into communication, connection, and collaborative care — equipping you with clarity and confidence from the outset.
                </p>
                <p>
                  We provide a respectful, reflective, and non-judgemental space where families are empowered, professionals work in genuine partnership, and children’s voices remain central. If you are ready to strengthen understanding, reduce conflict, and build shared, confident care, we invite you to enrol and begin your journey with Inside Out.
                </p>
              </div>
              <button
                onClick={() => setShowProgramme(false)}
                className="mt-8 text-primary font-semibold hover:underline text-sm"
              >
                Show Less
              </button>
            </div>
          </div>
        </motion.section>
      )}

      <Footer />
    </div>
  );
};

export default Index;
