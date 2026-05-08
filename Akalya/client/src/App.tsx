import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StudentDashboardLayout } from "@/components/StudentDashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Contact from "./pages/Contact";
import CareerGatewayHub from "./pages/CareerGatewayHub";
import Scholarships from "./pages/Scholarships";
import EntranceExams from "./pages/EntranceExams";
import { EntranceExamDetail } from "./pages/EntranceExams";
import Jobs from "./pages/Jobs";
import PreparationResources from "./pages/PreparationResources";
import CareerRoadmap from "./pages/CareerRoadmap";
import Practice from "./pages/Practice";
import TestSeries from "./pages/TestSeries";
import TestSeriesAttempt from "./pages/TestSeriesAttempt";
import Locker from "./pages/Locker";
import Certifications from "./pages/Certifications";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              {/* Student dashboard: layout + nested routes. Career Gateway and all sub-modules require student auth. */}
              <Route
                path="/dashboard/student"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <StudentDashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<StudentDashboard />} />
                <Route path="career-gateway" element={<CareerGatewayHub />} />
                <Route path="career-gateway/scholarships" element={<Scholarships embedded />} />
                <Route path="career-gateway/entrance-exams" element={<EntranceExams embedded />} />
                <Route path="career-gateway/entrance-exams/:slug" element={<EntranceExamDetail embedded />} />
                <Route path="career-gateway/jobs-after-10th" element={<Jobs embedded defaultTab="10th" />} />
                <Route path="career-gateway/jobs-after-12th" element={<Jobs embedded defaultTab="12th" />} />
                <Route path="career-gateway/certifications" element={<Certifications embedded />} />
                <Route path="career-gateway/practice" element={<Practice embedded />} />
                <Route path="career-gateway/test-series" element={<TestSeries embedded />} />
                <Route path="career-gateway/test-series/:id" element={<TestSeriesAttempt />} />
                <Route path="career-gateway/career-roadmap" element={<CareerRoadmap embedded />} />
                <Route path="career-gateway/preparation-resources" element={<PreparationResources embedded />} />
                <Route path="career-gateway/locker" element={<Locker embedded />} />
              </Route>

              <Route
                path="/dashboard/teacher"
                element={
                  <ProtectedRoute allowedRoles={["teacher"]}>
                    <TeacherDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Redirect old public module URLs to login (no direct access; use dashboard) */}
              <Route path="/scholarships" element={<Navigate to="/auth" replace />} />
              <Route path="/entrance-exams" element={<Navigate to="/auth" replace />} />
              <Route path="/entrance-exams/:slug" element={<Navigate to="/auth" replace />} />
              <Route path="/jobs" element={<Navigate to="/auth" replace />} />
              <Route path="/preparation-resources" element={<Navigate to="/auth" replace />} />
              <Route path="/career-roadmap" element={<Navigate to="/auth" replace />} />
              <Route path="/practice" element={<Navigate to="/auth" replace />} />
              <Route path="/test-series" element={<Navigate to="/auth" replace />} />
              <Route path="/test-series/:id" element={<Navigate to="/auth" replace />} />
              <Route path="/locker" element={<Navigate to="/auth" replace />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
