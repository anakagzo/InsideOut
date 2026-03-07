import { useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "@/pages/Index";
import ScrollToTop from "@/components/ScrollToTop";
import CoursesPage from "@/pages/CoursesPage";
import CourseDetailPage from "@/pages/CourseDetailPage";
import CheckoutPage from "@/pages/CheckoutPage";
import OnboardingBookingPage from "@/pages/OnboardingBookingPage";
import AccountPage from "@/pages/AccountPage";
import NotFound from "@/pages/NotFound";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SeoHead } from "@/components/seo/SeoHead";

const queryClient = new QueryClient();

const RouteSeo = () => {
  const location = useLocation();
  const pathname = location.pathname;

  const siteBaseUrl = (
    (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : "")
  ).replace(/\/+$/, "");

  const homeStructuredData = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Inside Out Programme",
        url: siteBaseUrl || undefined,
        sameAs: [],
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Inside Out Programme",
        url: siteBaseUrl || undefined,
      },
    ],
    [siteBaseUrl],
  );

  if (pathname === "/") {
    return (
      <SeoHead
        title="Inside Out Programme | Emotional Support for Neurodivergent Children"
        description="Inside Out Programme helps parents and professionals understand the emotional needs of neurodivergent children through practical, relationship-centered support."
        path="/"
        structuredData={homeStructuredData}
      />
    );
  }

  if (pathname === "/courses") {
    return (
      <SeoHead
        title="Courses | Inside Out Programme"
        description="Browse Inside Out Programme courses designed to support families and professionals with practical, neuro-affirming strategies."
        path="/courses"
      />
    );
  }

  if (pathname.startsWith("/course/")) {
    return (
      <SeoHead
        title="Course Details | Inside Out Programme"
        description="Explore course details, reviews, and schedules from Inside Out Programme."
        path={pathname}
      />
    );
  }

  if (pathname.startsWith("/account")) {
    return (
      <SeoHead
        title="My Account | Inside Out Programme"
        description="Manage your Inside Out Programme account settings, schedules, and enrollments."
        path={pathname}
        noindex
      />
    );
  }

  if (pathname.startsWith("/checkout/")) {
    return (
      <SeoHead
        title="Checkout | Inside Out Programme"
        description="Secure checkout for Inside Out Programme course enrollment."
        path={pathname}
        noindex
      />
    );
  }

  if (pathname.startsWith("/onboarding/")) {
    return (
      <SeoHead
        title="Onboarding Booking | Inside Out Programme"
        description="Book your onboarding session with your tutor after enrollment."
        path={pathname}
        noindex
      />
    );
  }

  return (
    <SeoHead
      title="Page Not Found | Inside Out Programme"
      description="The requested page could not be found on Inside Out Programme."
      path={pathname}
      noindex
    />
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteSeo />
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/course/:id" element={<CourseDetailPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/account" element={<AccountPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
            <Route path="/checkout/:id" element={<CheckoutPage />} />
            <Route path="/onboarding/:id/:token" element={<OnboardingBookingPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
