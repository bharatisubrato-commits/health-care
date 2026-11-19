import React, { useCallback, useEffect, useState } from 'react';
import { AdminUser, Plan, PublicSettings } from './types';
import { api } from './lib/api';
import { ToastProvider } from './components/Toast';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { WhatsAppButton } from './components/WhatsAppButton';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { PlansJoinPage } from './pages/PlansJoinPage';
import { PaymentPage } from './pages/PaymentPage';
import { LegalPage } from './pages/LegalPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { OrderLookupPage } from './pages/OrderLookupPage';

const DEFAULT_SETTINGS: PublicSettings = {
  gym_name: 'Muscle Arena',
  owner_name: 'Subrato Bharati',
  address: 'Near Gopalmath Water Tank, Durgapur, West Bengal, 713217',
  phone: '8388922869',
  email: 'info@buildbody-demo.com',
  timings_mon_sat: '5:30 AM - 10:00 PM',
  timings_sun: '6:00 AM - 12:00 PM',
  instagram: 'https://instagram.com/buildbody.demo',
  facebook: 'https://facebook.com/buildbody.demo',
  youtube: 'https://youtube.com/@buildbodydemo',
  hero_headline: 'BUILD STRENGTH. TRAIN HARDER.',
  hero_subtext:
    'Calibrated barbells, structured hypertrophy coaching, and high-energy conditioning near Gopalmath Water Tank, Durgapur.',
  about_story:
    'Founded by Subrato Bharati in Gopalmath, Durgapur, Muscle Arena was built to replace crowded rooms with a disciplined strength and conditioning floor.',
  about_mission:
    'Our mission is to make serious strength coaching, safe barbell mechanics, and honest nutrition guidance accessible across Durgapur.',
};

function AppRouter() {
  const [locationUrl, setLocationUrl] = useState(
    () => window.location.pathname + window.location.search
  );
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_SETTINGS);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  const loadPublicBootstrap = useCallback(async () => {
    try {
      const res = await api.get<{ settings: PublicSettings; plans: Plan[] }>(
        '/api/public/bootstrap'
      );
      if (res.settings) setSettings((prev) => ({ ...prev, ...res.settings }));
      if (res.plans) setPlans(res.plans);
    } catch {
      // Keep fallback defaults if server is briefly restarting
    }
  }, []);

  useEffect(() => {
    loadPublicBootstrap();
  }, [loadPublicBootstrap]);

  useEffect(() => {
    const onPopState = () => {
      setLocationUrl(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setLocationUrl(path);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const [pathname, search] = locationUrl.split('?');
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/backend');

  useEffect(() => {
    if (!isAdminRoute) return;
    let active = true;
    setCheckingAdmin(true);
    api
      .get<{ admin: AdminUser }>('/api/admin/me')
      .then((res) => {
        if (active) setAdminUser(res.admin);
      })
      .catch(() => {
        if (active) setAdminUser(null);
      })
      .finally(() => {
        if (active) setCheckingAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [isAdminRoute]);

  if (isAdminRoute) {
    if (checkingAdmin && !adminUser) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#09090B] text-sm text-zinc-400">
          Verifying admin session...
        </div>
      );
    }

    if (!adminUser || adminUser.mustChangePassword) {
      return (
        <AdminLoginPage
          pendingPasswordChangeUser={adminUser?.mustChangePassword ? adminUser : null}
          onAuthenticated={(user) => setAdminUser(user)}
          onNavigate={navigate}
        />
      );
    }

    return (
      <AdminDashboardPage
        admin={adminUser}
        onLogout={() => setAdminUser(null)}
        onPublicDataChanged={loadPublicBootstrap}
        onNavigate={navigate}
      />
    );
  }

  const searchParams = new URLSearchParams(search || '');
  const planIdParam = searchParams.get('plan') ? Number(searchParams.get('plan')) : null;
  const sourceCtaParam = searchParams.get('source') || 'direct';
  const paymentMatch = pathname.match(/^\/payment\/([^/]+)$/);

  return (
    <div className="flex min-h-screen flex-col bg-[#09090B]">
      <Navbar currentPath={pathname} onNavigate={navigate} gymName={settings.gym_name} />

      <div className="flex-1">
        {pathname === '/' && (
          <HomePage settings={settings} plans={plans} onNavigate={navigate} />
        )}
        {pathname === '/about' && <AboutPage settings={settings} onNavigate={navigate} />}
        {(pathname === '/plans' || pathname === '/join') && (
          <PlansJoinPage
            plans={plans}
            initialPlanId={planIdParam}
            initialSourceCta={sourceCtaParam}
            mode={pathname === '/plans' ? 'plans' : 'join'}
            onNavigate={navigate}
          />
        )}
        {paymentMatch && (
          <PaymentPage
            orderId={decodeURIComponent(paymentMatch[1])}
            settings={settings}
            onNavigate={navigate}
          />
        )}
        {pathname === '/status' && <OrderLookupPage onNavigate={navigate} />}
        {pathname === '/privacy' && (
          <LegalPage type="privacy" settings={settings} onNavigate={navigate} />
        )}
        {pathname === '/terms' && (
          <LegalPage type="terms" settings={settings} onNavigate={navigate} />
        )}
        {pathname === '/refund' && (
          <LegalPage type="refund" settings={settings} onNavigate={navigate} />
        )}
        {pathname !== '/' &&
          pathname !== '/about' &&
          pathname !== '/plans' &&
          pathname !== '/join' &&
          pathname !== '/status' &&
          !paymentMatch &&
          pathname !== '/privacy' &&
          pathname !== '/terms' &&
          pathname !== '/refund' && (
            <HomePage settings={settings} plans={plans} onNavigate={navigate} />
          )}
      </div>

      <Footer settings={settings} onNavigate={navigate} />
      <WhatsAppButton phone={settings.phone} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  );
}
