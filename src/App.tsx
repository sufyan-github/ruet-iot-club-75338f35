import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";

// Lazy-loaded routes for code splitting
const About = lazy(() => import("./pages/About"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const ProjectSubmit = lazy(() => import("./pages/ProjectSubmit"));
const Events = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Partners = lazy(() => import("./pages/Partners"));
const PartnerDetail = lazy(() => import("./pages/PartnerDetail"));
const Opportunities = lazy(() => import("./pages/Opportunities"));
const OpportunityDetail = lazy(() => import("./pages/OpportunityDetail"));
const VerifyOpportunityApplication = lazy(() => import("./pages/VerifyOpportunityApplication"));
const Alumni = lazy(() => import("./pages/Alumni"));
const AlumniApply = lazy(() => import("./pages/AlumniApply"));
const Members = lazy(() => import("./pages/Members"));
const Team = lazy(() => import("./pages/Team"));
const PersonDetail = lazy(() => import("./pages/PersonDetail"));
const Gallery = lazy(() => import("./pages/Gallery"));
const JoinUs = lazy(() => import("./pages/JoinUs"));
const Contact = lazy(() => import("./pages/Contact"));
const Collaborate = lazy(() => import("./pages/Collaborate"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const VerifyEmailChange = lazy(() => import("./pages/VerifyEmailChange"));
const AccountSecurity = lazy(() => import("./pages/AccountSecurity"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MembershipWorkspace = lazy(() => import("./pages/MembershipWorkspace"));
const AdminAccess = lazy(() => import("./pages/AdminAccess"));
const EventRegistration = lazy(() => import("./pages/EventRegistration"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const BlogWrite = lazy(() => import("./pages/BlogWrite"));
const Research = lazy(() => import("./pages/Research"));
const ResearchDetail = lazy(() => import("./pages/ResearchDetail"));
const ResearchSubmit = lazy(() => import("./pages/ResearchSubmit"));
const VerifySubmission = lazy(() => import("./pages/VerifySubmission"));
const TrackSubmission = lazy(() => import("./pages/TrackSubmission"));
const Courses = lazy(() => import("./pages/Courses"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const Certificate = lazy(() => import("./pages/Certificate"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App = () => (
  <>
    <Sonner />
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="min-h-screen" />}>
          <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/submit" element={<ProjectSubmit />} />
              <Route path="/projects/:slug" element={<ProjectDetail />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/register" element={<EventRegistration />} />
              <Route path="/events/:slug" element={<EventDetail />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/partners/:slug" element={<PartnerDetail />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route path="/opportunities/:slug" element={<OpportunityDetail />} />
              <Route path="/verify-opportunity-application" element={<VerifyOpportunityApplication />} />
              <Route path="/alumni" element={<Alumni />} />
              <Route path="/alumni/apply" element={<AlumniApply />} />
              <Route path="/members" element={<Team />} />
              <Route path="/team" element={<Team />} />
              <Route path="/people/:slug" element={<PersonDetail />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/join" element={<JoinUs />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/collaborate" element={<Collaborate />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/verify-email-change" element={<VerifyEmailChange />} />
              <Route path="/account/security" element={<AccountSecurity />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/membership" element={<MembershipWorkspace />} />
              <Route path="/admin" element={<AdminAccess />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:id" element={<BlogPost />} />
              <Route path="/blog/write" element={<BlogWrite />} />
              <Route path="/research" element={<Research />} />
              <Route path="/research/:slug" element={<ResearchDetail />} />
              <Route path="/research/submit" element={<ResearchSubmit />} />
              <Route path="/verify-submission" element={<VerifySubmission />} />
              <Route path="/track-submission" element={<TrackSubmission />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:id" element={<CourseDetail />} />
              <Route path="/certificate/:id" element={<Certificate />} />
              <Route path="/verify" element={<VerifyCertificate />} />
              <Route path="/verify-certificate/:certificateId" element={<VerifyCertificate />} />
              <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </>
);

export default App;
