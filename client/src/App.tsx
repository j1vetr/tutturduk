import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/AuthPage";
import HomePage from "@/pages/HomePage";
import WinnersPage from "@/pages/WinnersPage";
import ProfilePage from "@/pages/ProfilePage";
import AdminPage from "@/pages/AdminPage";
import MatchDetailPage from "@/pages/MatchDetailPage";
import LiveMatchesPage from "@/pages/LiveMatchesPage";
import UpcomingMatchesPage from "@/pages/UpcomingMatchesPage";
import { useEffect } from "react";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary">Yükleniyor...</div>;
  
  return user ? <Component {...rest} /> : null;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
        {() => <ProtectedRoute component={HomePage} />}
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
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
