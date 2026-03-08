import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import About from "./pages/About";
import Projects from "./pages/Projects";
import Events from "./pages/Events";
import Alumni from "./pages/Alumni";
import Team from "./pages/Team";
import Gallery from "./pages/Gallery";
import JoinUs from "./pages/JoinUs";
import Contact from "./pages/Contact";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import EventRegistration from "./pages/EventRegistration";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import BlogWrite from "./pages/BlogWrite";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/events" element={<Events />} />
            <Route path="/alumni" element={<Alumni />} />
            <Route path="/team" element={<Team />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/events/register" element={<EventRegistration />} />
            <Route path="/join" element={<JoinUs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<BlogPost />} />
            <Route path="/blog/write" element={<BlogWrite />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
