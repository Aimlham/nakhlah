import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/app-layout";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import DashboardPage from "@/pages/dashboard";
import ProductsPage from "@/pages/products";
import ProductDetailsPage from "@/pages/product-details";
import SavedProductsPage from "@/pages/saved-products";
import PricingPage from "@/pages/pricing-page";
import SettingsPage from "@/pages/settings";
import AdsPage from "@/pages/ads";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import AuthCallbackPage from "@/pages/auth-callback";
import PaymentCallbackPage from "@/pages/payment-callback";
import { Loader2 } from "lucide-react";

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

// Requires authentication only (no subscription needed).
// Used for: pricing, settings, payment callback.
function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

// Requires authentication AND an active subscription.
// Used for: dashboard, products, ads, saved — all paid features.
function SubscribedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, isLoading: authLoading } = useAuth();

  const { data: sub, isLoading: subLoading } = useQuery<{ plan: string; status: string }>({
    queryKey: ["/api/payments/subscription"],
    enabled: !!user,
    retry: false,
  });

  if (authLoading || (user && subLoading)) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;

  const isActive = sub?.status === "active";
  if (!isActive) return <Redirect to="/pricing" />;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

// Public-only: redirect logged-in users away (login, signup).
function PublicRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (user) return <Redirect to="/dashboard" />;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public pages */}
      <Route path="/" component={LandingPage} />
      <Route path="/login">{() => <PublicRoute component={LoginPage} />}</Route>
      <Route path="/signup">{() => <PublicRoute component={SignupPage} />}</Route>
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/auth/callback" component={AuthCallbackPage} />

      {/* Requires login but NOT subscription */}
      <Route path="/payment/callback" component={PaymentCallbackPage} />
      <Route path="/pricing">{() => <ProtectedRoute component={PricingPage} />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={SettingsPage} />}</Route>

      {/* Requires login AND active subscription */}
      <Route path="/dashboard">{() => <SubscribedRoute component={DashboardPage} />}</Route>
      <Route path="/products">{() => <SubscribedRoute component={ProductsPage} />}</Route>
      <Route path="/products/:id">{() => <SubscribedRoute component={ProductDetailsPage} />}</Route>
      <Route path="/ads">{() => <SubscribedRoute component={AdsPage} />}</Route>
      <Route path="/saved">{() => <SubscribedRoute component={SavedProductsPage} />}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
