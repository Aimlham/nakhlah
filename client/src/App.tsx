import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/app-layout";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import ProductsPage from "@/pages/products-page";
import ProductDetailPage from "@/pages/product-detail";
import SuppliersPage from "@/pages/suppliers-page";
import SupplierDetailPage from "@/pages/supplier-detail";
import SavedProductsPage from "@/pages/saved-products";
import PricingPage from "@/pages/pricing-page";
import SettingsPage from "@/pages/settings";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import AuthCallbackPage from "@/pages/auth-callback";
import PaymentCallbackPage from "@/pages/payment-callback";
import AdminListingsPage from "@/pages/admin/listings";
import ListingFormPage from "@/pages/admin/listing-form";
import AdminSupplierProductsPage from "@/pages/admin/supplier-products";
import SupplierProductFormPage from "@/pages/admin/supplier-product-form";
import AdminCategoriesPage from "@/pages/admin/categories";
import { Loader2 } from "lucide-react";

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

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

function SubscriptionAwareRoute({ component: Component }: { component: (props: { isSubscribed: boolean }) => JSX.Element }) {
  const { user, isLoading: authLoading } = useAuth();

  const { data: sub, isLoading: subLoading } = useQuery<{ plan: string; status: string }>({
    queryKey: ["/api/payments/subscription"],
    enabled: !!user,
    retry: false,
  });

  if (authLoading || (user && subLoading)) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;

  const isSubscribed = sub?.status === "active";

  return (
    <AppLayout>
      <Component isSubscribed={isSubscribed} />
    </AppLayout>
  );
}

function AdminRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, isLoading: authLoading } = useAuth();

  const { data: roleData, isLoading: roleLoading } = useQuery<{ role: string }>({
    queryKey: ["/api/auth/role"],
    enabled: !!user,
    retry: false,
  });

  if (authLoading || (user && roleLoading)) return <LoadingScreen />;
  if (!user) return <Redirect to="/login" />;
  if (roleData?.role !== "admin") return <Redirect to="/products" />;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function PublicRoute({ component: Component }: { component: () => JSX.Element }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (user) return <Redirect to="/products" />;

  return <Component />;
}

function FactoriesRoute() {
  return (
    <SubscriptionAwareRoute
      component={() => (
        <SuppliersPage
          filterTypes={["مصنع", "تصنيع"]}
          title="المصانع"
          subtitle="تصفح المصانع المحلية المتخصصة في التصنيع"
          emptyTitle="لا يوجد مصانع حالياً"
          emptyDescription="سيتم إضافة مصانع جديدة قريباً"
        />
      )}
    />
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">{() => <Redirect to="/products" />}</Route>
      <Route path="/login">{() => <PublicRoute component={LoginPage} />}</Route>
      <Route path="/signup">{() => <PublicRoute component={SignupPage} />}</Route>
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/auth/callback" component={AuthCallbackPage} />

      <Route path="/payment/callback" component={PaymentCallbackPage} />
      <Route path="/pricing">{() => <ProtectedRoute component={PricingPage} />}</Route>
      <Route path="/settings">{() => <ProtectedRoute component={SettingsPage} />}</Route>

      <Route path="/products">{() => <ProtectedRoute component={ProductsPage} />}</Route>
      <Route path="/products/:id">{() => <SubscriptionAwareRoute component={ProductDetailPage} />}</Route>

      <Route path="/suppliers">{() => <ProtectedRoute component={() => <SuppliersPage />} />}</Route>
      <Route path="/suppliers/:id">{() => <SubscriptionAwareRoute component={SupplierDetailPage} />}</Route>

      <Route path="/factories">{() => <FactoriesRoute />}</Route>

      <Route path="/projects">{() => <Redirect to="/suppliers" />}</Route>
      <Route path="/listings/:id">{(params) => <Redirect to={`/suppliers/${params.id}`} />}</Route>

      <Route path="/saved">{() => <ProtectedRoute component={SavedProductsPage} />}</Route>

      <Route path="/admin/listings/new">{() => <AdminRoute component={ListingFormPage} />}</Route>
      <Route path="/admin/listings/:id/edit">{() => <AdminRoute component={ListingFormPage} />}</Route>
      <Route path="/admin/listings">{() => <AdminRoute component={AdminListingsPage} />}</Route>

      <Route path="/admin/products/new">{() => <AdminRoute component={SupplierProductFormPage} />}</Route>
      <Route path="/admin/products/:id/edit">{() => <AdminRoute component={SupplierProductFormPage} />}</Route>
      <Route path="/admin/products">{() => <AdminRoute component={AdminSupplierProductsPage} />}</Route>

      <Route path="/admin/categories">{() => <AdminRoute component={AdminCategoriesPage} />}</Route>

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
