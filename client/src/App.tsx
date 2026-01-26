import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import PredictionsPage from "@/pages/PredictionsPage";
import WinnersPage from "@/pages/WinnersPage";
import ProfilePage from "@/pages/ProfilePage";
import AdminPage from "@/pages/AdminPage";
import MatchDetailPage from "@/pages/MatchDetailPage";
import LiveMatchesPage from "@/pages/LiveMatchesPage";
import UpcomingMatchesPage from "@/pages/UpcomingMatchesPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import { useEffect } from "react";

function ScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      // If trying to access admin page without auth, redirect to admin login
      if (rest.path === "/admin") {
         setLocation("/admin-login");
      } else {
         setLocation("/auth");
      }
    }
  }, [user, isLoading, setLocation, rest.path]);

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary">Yükleniyor...</div>;
  
  return user ? <Component {...rest} /> : null;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/admin-login" component={AdminLoginPage} />
      <Route path="/">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route path="/predictions">
        {() => <ProtectedRoute component={PredictionsPage} />}
      </Route>
      <Route path="/match/:id">
        {() => <ProtectedRoute component={MatchDetailPage} />}
      </Route>
      <Route path="/winners">
        {() => <ProtectedRoute component={WinnersPage} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={ProfilePage} />}
      </Route>
      <Route path="/live">
        {() => <ProtectedRoute component={LiveMatchesPage} />}
      </Route>
      <Route path="/upcoming">
        {() => <ProtectedRoute component={UpcomingMatchesPage} />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminPage} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ScrollToTop />
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
