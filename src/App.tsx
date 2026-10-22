import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { IntroProvider, useIntro } from "@/contexts/IntroContext";
import IntroSplash from "@/components/intro/IntroSplash";
import Index from "./pages/Index";
import About from "./pages/About";
import Projects from "./pages/Projects";
import Events from "./pages/Events";
import Alumni from "./pages/Alumni";
import Team from "./pages/Team";
import Gallery from "./pages/Gallery";
import JoinUs from "./pages/JoinUs";
import Contact from "./pages/Contact";
import Research from "./pages/Research";
import Courses from "./pages/Courses";
import Blog from "./pages/Blog";

// Lazy-loaded secondary & admin routes
const EventRegistration = lazy(() => import("./pages/EventRegistration"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const BlogWrite = lazy(() => import("./pages/BlogWrite"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const Certificate = lazy(() => import("./pages/Certificate"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Smoothly scrolls window to top on tab/route navigation
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
};

// Subtle cyber top-line fallback for lazy admin routes (never flashing black screen)
const PageFallback = () => (
  <div className="min-h-screen flex flex-col circuit-pattern bg-[#050b14] relative">
    <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2de2c9] via-[#00d2ff] to-[#3b9bff] animate-pulse z-50 shadow-[0_0_12px_#2de2c9]" />
  </div>
);

const AppContent = () => {
  return (
    <TooltipProvider>
      <ScrollToTop />
      <Toaster />
      <Sonner />
      {/* Intro splash plain backdrop — z-30 */}
      <IntroSplash />
      <AuthProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/events" element={<Events />} />
            <Route path="/alumni" element={<Alumni />} />
            <Route path="/members" element={<Team />} />
            <Route path="/team" element={<Team />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/events/register" element={<EventRegistration />} />
            <Route path="/join" element={<JoinUs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<BlogPost />} />
            <Route path="/blog/write" element={<BlogWrite />} />
            <Route path="/research" element={<Research />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/certificate/:id" element={<Certificate />} />
            <Route path="/verify" element={<VerifyCertificate />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </TooltipProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <IntroProvider>
          <AppContent />
        </IntroProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
