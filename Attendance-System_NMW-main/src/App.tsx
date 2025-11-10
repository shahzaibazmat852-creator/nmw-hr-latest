import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import MobileErrorBoundary from "@/components/MobileErrorBoundary";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import "@/App.css";

// Lazy load pages for better initial load performance
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Attendance = lazy(() => import("@/pages/Attendance"));
const Payroll = lazy(() => import("@/pages/Payroll"));
const Employees = lazy(() => import("@/pages/Employees"));
const Reports = lazy(() => import("@/pages/Reports"));
const EditHistory = lazy(() => import("@/pages/EditHistory"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Login = lazy(() => import("@/pages/Login"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const EmployeeLedger = lazy(() => import("@/pages/EmployeeLedger"));
const LoginHistory = lazy(() => import("@/pages/LoginHistory"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Create a client with optimized caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes - Increased from 5
      gcTime: 1000 * 60 * 30, // 30 minutes garbage collection (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch on mount if data is fresh
      retry: 1,
      structuralSharing: true, // Optimize re-renders by detecting equivalent data
      // Use previous data while fetching new data (optimistic updates)
      placeholderData: (previousData) => previousData,
    },
  },
});

function App() {
  return (
    <ThemeProvider storageKey="nmw-ui-theme">
      <QueryClientProvider client={queryClient}>
        <MobileErrorBoundary>
          <AuthProvider>
            <TooltipProvider>
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/" element={
                      <ProtectedRoute>
                        <Layout>
                          <Dashboard />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    <Route path="/attendance" element={
                      <ProtectedRoute>
                        <Layout>
                          <Attendance />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    <Route path="/payroll" element={
                      <ProtectedRoute>
                        <Layout>
                          <Payroll />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    <Route path="/employees" element={
                      <ProtectedRoute>
                        <Layout>
                          <Employees />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    <Route path="/reports" element={
                      <ProtectedRoute>
                        <Layout>
                          <Reports />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    <Route path="/employee-ledger" element={
                      <ProtectedRoute>
                        <Layout>
                          <EmployeeLedger />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    <Route path="/login-history" element={
                      <ProtectedRoute>
                        <Layout>
                          <LoginHistory />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    <Route path="/edit-history" element={
                      <ProtectedRoute>
                        <Layout>
                          <EditHistory />
                        </Layout>
                      </ProtectedRoute>
                    } />
                    
                    {/* Catch-all route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
              <Toaster />
            </TooltipProvider>
          </AuthProvider>
        </MobileErrorBoundary>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;