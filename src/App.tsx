import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthPromptProvider } from "@/components/AuthPromptDialog";
import { FavoritesProvider } from "@/hooks/useFavorites";
import Index from "./pages/Index.tsx";
import RequireAuth from "./components/RequireAuth.tsx";
import AuthPromptGate from "./components/AuthPromptGate.tsx";
import IOSInstallHint from "./components/IOSInstallHint.tsx";
import PushPermissionBanner from "./components/PushPermissionBanner.tsx";
import PushOpenTracker from "./components/PushOpenTracker.tsx";
import CookieConsent from "./components/CookieConsent.tsx";
import RouteTracker from "./components/RouteTracker.tsx";

// Retry dynamic imports once and force-reload on stale chunks (after deploys)
function lazyWithRetry<T extends React.ComponentType>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    const KEY = "lovable:chunk-reloaded";
    try {
      return await factory();
    } catch (err) {
      const msg = String((err as Error)?.message || err);
      const isChunkError =
        /dynamically imported module|Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
          msg,
        );
      if (isChunkError && typeof window !== "undefined") {
        if (!sessionStorage.getItem(KEY)) {
          sessionStorage.setItem(KEY, "1");
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw err;
    }
  });
}

const Auth = lazyWithRetry(() => import("./pages/Auth.tsx"));
const AuthCallback = lazyWithRetry(() => import("./pages/AuthCallback.tsx"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard.tsx"));
const Profile = lazyWithRetry(() => import("./pages/Profile.tsx"));
const PublishListing = lazyWithRetry(() => import("./pages/PublishListing.tsx"));
const ListingDetail = lazyWithRetry(() => import("./pages/ListingDetail.tsx"));
const ListingsPage = lazyWithRetry(() => import("./pages/ListingsPage.tsx"));
const Admin = lazyWithRetry(() => import("./pages/Admin.tsx"));
const AdminLogin = lazyWithRetry(() => import("./pages/AdminLogin.tsx"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword.tsx"));
const Cart = lazyWithRetry(() => import("./pages/Cart.tsx"));
const OrderConfirmation = lazyWithRetry(() => import("./pages/OrderConfirmation.tsx"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound.tsx"));
const Installer = lazyWithRetry(() => import("./pages/Installer.tsx"));
const ModerationCase = lazyWithRetry(() => import("./pages/ModerationCase.tsx"));
const Pricing = lazyWithRetry(() => import("./pages/Pricing.tsx"));
const NotificationsCenter = lazyWithRetry(() => import("./pages/NotificationsCenter.tsx"));
const About = lazyWithRetry(() => import("./pages/About.tsx"));
const TopSellers = lazyWithRetry(() => import("./pages/TopSellers.tsx"));

const queryClient = new QueryClient();

const Fallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuthPromptProvider>
          <FavoritesProvider>
          <Suspense fallback={<Fallback />}>
            <PushOpenTracker />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profil" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/mon-compte" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/publier" element={<AuthPromptGate title="Publier une annonce" message="Connectez-vous pour publier votre annonce gratuitement."><PublishListing /></AuthPromptGate>} />
              <Route path="/annonces" element={<ListingsPage />} />
              <Route path="/annonce/:id" element={<ListingDetail />} />
              <Route path="/annonce/:slug/:id" element={<ListingDetail />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/panier" element={<AuthPromptGate title="Finaliser votre commande" message="Connectez-vous pour accéder à votre panier et finaliser le paiement."><Cart /></AuthPromptGate>} />
              <Route path="/commande/confirmation" element={<OrderConfirmation />} />
              <Route path="/installer" element={<Installer />} />
              <Route path="/moderation/:caseId" element={<RequireAuth><ModerationCase /></RequireAuth>} />
              <Route path="/tarifs" element={<Pricing />} />
              <Route path="/notifications" element={<RequireAuth><NotificationsCenter /></RequireAuth>} />
              <Route path="/qui-sommes-nous" element={<About />} />
              <Route path="/about" element={<About />} />
              <Route path="/top-vendeurs" element={<TopSellers />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <IOSInstallHint />
          <PushPermissionBanner />
          </FavoritesProvider>
          </AuthPromptProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
