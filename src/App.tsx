import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import OnboardingPage from '@/pages/OnboardingPage';
import CustomerBookingPage from '@/pages/CustomerBookingPage';
import AdminDashboard from '@/pages/AdminDashboard';
import ArchivePage from '@/pages/ArchivePage';
import AdminSettingsPage from '@/pages/AdminSettingsPage';
import TicketStatusPage from '@/pages/TicketStatusPage';
import AdminInstallPrompt from '@/components/AdminInstallPrompt';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SuperAdminLogin from './pages/SuperAdminLogin';
import CustomerInstallPrompt from '@/components/CustomerInstallPrompt';
import CustomerRootRedirect from '@/components/CustomerRootRedirect';
import BarberLoginPage from '@/pages/BarberLoginPage';
import BarberDashboard from '@/pages/BarberDashboard';
import BarberInstallPrompt from '@/components/BarberInstallPrompt';

function App() {
  const hostname = window.location.hostname;
  const isSuperAdmin = hostname.includes('superadmin');
  const isAdmin = hostname.includes('admin') && !isSuperAdmin;
  const isBarber = hostname.includes('coiffure-coiffureticket') && !isAdmin && !isSuperAdmin;
  const isCustomer = hostname.includes('costumer') || hostname.includes('customer');

  // ---------------------------------------------------------------------------
  // SUPER ADMIN ROUTES
  // ---------------------------------------------------------------------------
  if (isSuperAdmin) {
    return (
      <BrowserRouter>
        <div dir="rtl" className="min-h-[100dvh] bg-background text-foreground">
          <Routes>
            <Route path="/" element={<SuperAdminLogin />} />
            <Route path="/admin" element={<SuperAdminDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-center" richColors />
        </div>
      </BrowserRouter>
    );
  }

  // ---------------------------------------------------------------------------
  // ADMIN ROUTES
  // ---------------------------------------------------------------------------
  if (isAdmin) {
    return (
      <BrowserRouter>
        <div dir="rtl" className="min-h-[100dvh] bg-background text-foreground">
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/archive" element={<ArchivePage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <AdminInstallPrompt />
          <Toaster position="top-center" richColors />
        </div>
      </BrowserRouter>
    );
  }

  // ---------------------------------------------------------------------------
  // BARBER ROUTES
  // ---------------------------------------------------------------------------
  if (isBarber) {
    return (
      <BrowserRouter>
        <div dir="rtl" className="min-h-[100dvh] bg-background text-foreground">
          <Routes>
            <Route path="/" element={<BarberLoginPage />} />
            <Route path="/barber/:shopSlug" element={<BarberDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <BarberInstallPrompt />
          <Toaster position="top-center" richColors />
        </div>
      </BrowserRouter>
    );
  }

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // CUSTOMER ROUTES (customer-coiffureticket.vercel.app)
  // ---------------------------------------------------------------------------
  if (isCustomer) {
    return (
      <BrowserRouter>
        <div dir="rtl" className="min-h-[100dvh] bg-background text-foreground">
          <Routes>
            {/* Customer root redirect */}
            <Route path="/" element={<CustomerRootRedirect />} />

            {/* Shared views */}
            <Route path="/t/:ticketId" element={<TicketStatusPage />} />

            {/* Customer booking */}
            <Route path="/:slug" element={<CustomerBookingPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <CustomerInstallPrompt />
          <Toaster position="top-center" richColors />
        </div>
      </BrowserRouter>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN ROUTE (coiffureticket.vercel.app)
  // ---------------------------------------------------------------------------
  return (
    <BrowserRouter>
      <div dir="rtl" className="min-h-[100dvh] bg-background text-foreground">
        <Routes>
          {/* Main landing */}
          <Route path="/" element={<LandingPage />} />

          {/* Default to landing for any unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-center" richColors />
      </div>
    </BrowserRouter>
  );
}

export default App;
