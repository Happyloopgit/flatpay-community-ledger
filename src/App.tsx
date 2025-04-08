
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Suspense } from "react";

// Page imports
import Login from "./pages/Login";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Society from "./pages/Society";
import Residents from "./pages/Residents";
import Expenses from "./pages/Expenses";
import Billing from "./pages/Billing";

// Layout imports
import MainLayout from "./components/layout/MainLayout";

const queryClient = new QueryClient();

// Protected route wrapper
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return user ? <Outlet /> : <Navigate to="/login" />;
};

// Public route wrapper - redirects if user is already authenticated
const PublicRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return user ? <Navigate to="/" /> : <Outlet />;
};

// Root component with BrowserRouter and AuthProvider
const Root = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected routes - MainLayout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/society" element={<Society />} />
            <Route path="/residents" element={<Residents />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
        <Root />
      </Suspense>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
