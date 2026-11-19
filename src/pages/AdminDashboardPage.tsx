import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Layers,
  MessageSquare,
  Settings,
  Shield,
  LogOut,
  Download,
  Plus,
  Search,
  Check,
  X,
  Eye,
  RefreshCw,
  Trash2,
  Edit3,
  ExternalLink,
  Activity,
  MousePointerClick,
} from 'lucide-react';
import {
  AdminSettings,
  AdminUser,
  AuditLog,
  CtaEvent,
  Enquiry,
  Member,
  MemberActivityLog,
  PaymentRecord,
  Plan,
} from '../types';
import { api, formatDuration, formatINR, getAdminToken, resolveApiUrl, setAdminToken } from '../lib/api';
import { useToast } from '../components/Toast';
import { FACILITIES, FAQS, TESTIMONIALS, TRAINERS } from '../data/gymContent';

type AdminTab =
  | 'dashboard'
  | 'members'
  | 'activity'
  | 'payments'
  | 'plans'
  | 'enquiries'
  | 'leads'
  | 'website'
  | 'settings'
  | 'staff'
  | 'audit';

interface AdminDashboardPageProps {
  admin: AdminUser;
  onLogout: () => void;
  onPublicDataChanged: () => void;
  onNavigate: (path: string) => void;
}

export function AdminDashboardPage({
  admin,
  onLogout,
  onPublicDataChanged,
  onNavigate,
}: AdminDashboardPageProps) {
  const { showToast } = useToast();
  const isOwner = admin.role === 'owner';

  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [loading, setLoading] = useState(false);

  // Dashboard state
  const [metrics, setMetrics] = useState({
    totalMembers: 0,
    activeMembers: 0,
    expiredMembers: 0,
    pendingPayments: 0,
    monthlyRevenue: 0,
    expiringSoonCount: 0,
    newEnquiries: 0,
  });
  const [expiringSoon, setExpiringSoon] = useState<any[]>([]);

  // Members state
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('all');
  const [viewingMemberDetail, setViewingMemberDetail] = useState<{
    member: Member & { duration_value?: number; duration_unit?: string };
    payments: PaymentRecord[];
    activityLogs?: MemberActivityLog[];
  } | null>(null);
  const [activityLogs, setActivityLogs] = useState<MemberActivityLog[]>([]);
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [activitySearch, setActivitySearch] = useState('');
  const [quickActivityForm, setQuickActivityForm] = useState({
    memberId: 0,
    activity_type: 'gym_checkin' as 'gym_checkin' | 'note',
    title: '',
    details: '',
  });
  const [modalActivityForm, setModalActivityForm] = useState({
    activity_type: 'gym_checkin' as 'gym_checkin' | 'note',
    title: '',
    details: '',
  });
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberForm, setMemberForm] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'Male',
    dob: '1998-01-01',
    address: 'Durgapur, West Bengal',
    emergency_contact: '',
    fitness_goal: 'Strength & Muscle Gain',
    plan_id: 1,
    start_date: new Date().toISOString().slice(0, 10),
    status: 'active',
  });

  // Payments state
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PaymentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Plans state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    price: 1500,
    duration_value: 1,
    duration_unit: 'months' as 'days' | 'months' | 'years',
    description: '',
    featuresText: '',
    is_popular: false,
    is_active: true,
  });

  // Enquiries state
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [enquirySourceFilter, setEnquirySourceFilter] = useState<'all' | 'free_trial' | 'contact'>('all');

  // CTA Button & Form Leads state
  const [ctaEvents, setCtaEvents] = useState<CtaEvent[]>([]);
  const [ctaCounts, setCtaCounts] = useState<Record<string, number>>({
    join_now: 0,
    start_membership: 0,
    book_free_trial: 0,
    contact_form: 0,
    total: 0,
  });
  const [ctaButtonFilter, setCtaButtonFilter] = useState<string>('all');
  const [ctaSearch, setCtaSearch] = useState('');

  const handleCsvDownload = async (url: string, filename: string) => {
    try {
      const token = getAdminToken();
      const res = await fetch(resolveApiUrl(url), {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Could not export CSV');
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
      showToast(`Downloaded ${filename}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'CSV export failed.', 'error');
    }
  };

  // Settings state (Owner)
  const [settingsForm, setSettingsForm] = useState<AdminSettings | null>(null);

  // Staff & Audit (Owner)
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffForm, setStaffForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'staff' as 'staff' | 'owner',
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const loadDashboard = useCallback(async () => {
    const res = await api.get<{ metrics: typeof metrics; expiringSoon: any[] }>(
      '/api/admin/dashboard'
    );
    setMetrics(res.metrics);
    setExpiringSoon(res.expiringSoon);
  }, []);

  const loadMembers = useCallback(async () => {
    const q = new URLSearchParams();
    if (memberSearch) q.set('search', memberSearch);
    if (memberStatusFilter !== 'all') q.set('status', memberStatusFilter);
    const res = await api.get<{ members: Member[] }>(`/api/admin/members?${q.toString()}`);
    setMembers(res.members);
  }, [memberSearch, memberStatusFilter]);

  const loadPayments = useCallback(async () => {
    const q = paymentFilter !== 'all' ? `?status=${encodeURIComponent(paymentFilter)}` : '';
    const res = await api.get<{ payments: PaymentRecord[] }>(`/api/admin/payments${q}`);
    setPayments(res.payments);
  }, [paymentFilter]);

  const loadPlans = useCallback(async () => {
    const res = await api.get<{ plans: Plan[] }>('/api/admin/plans');
    setPlans(res.plans);
  }, []);

  const loadEnquiries = useCallback(async () => {
    const res = await api.get<{ enquiries: Enquiry[] }>('/api/admin/enquiries');
    setEnquiries(res.enquiries);
  }, []);

  const loadSettings = useCallback(async () => {
    if (!isOwner) return;
    const res = await api.get<{ settings: AdminSettings }>('/api/admin/settings');
    setSettingsForm(res.settings);
  }, [isOwner]);

  const loadStaff = useCallback(async () => {
    if (!isOwner) return;
    const res = await api.get<{ admins: any[] }>('/api/admin/staff');
    setStaffList(res.admins);
  }, [isOwner]);

  const loadAudit = useCallback(async () => {
    if (!isOwner) return;
    const res = await api.get<{ logs: AuditLog[] }>('/api/admin/audit-logs');
    setAuditLogs(res.logs);
  }, [isOwner]);

  const loadMemberActivity = useCallback(async () => {
    const q = new URLSearchParams();
    if (activityTypeFilter !== 'all') q.set('type', activityTypeFilter);
    if (activitySearch.trim()) q.set('search', activitySearch.trim());
    const res = await api.get<{ logs: MemberActivityLog[] }>(
      `/api/admin/member-activity?${q.toString()}`
    );
    setActivityLogs(res.logs);
  }, [activityTypeFilter, activitySearch]);

  const loadCtaEvents = useCallback(async () => {
    const q = new URLSearchParams();
    if (ctaButtonFilter !== 'all') q.set('button', ctaButtonFilter);
    if (ctaSearch.trim()) q.set('search', ctaSearch.trim());
    const res = await api.get<{ events: CtaEvent[]; counts: Record<string, number> }>(
      `/api/admin/cta-events?${q.toString()}`
    );
    setCtaEvents(res.events);
    if (res.counts) setCtaCounts(res.counts);
  }, [ctaButtonFilter, ctaSearch]);

  const refreshActiveTab = useCallback(async () => {
    setLoading(true);
    try {
      await loadPlans();
      if (tab === 'dashboard') await loadDashboard();
      if (tab === 'members') await loadMembers();
      if (tab === 'activity') await Promise.all([loadMemberActivity(), loadMembers()]);
      if (tab === 'payments') await loadPayments();
      if (tab === 'enquiries') await loadEnquiries();
      if (tab === 'leads') await loadCtaEvents();
      if (tab === 'website') {
        await Promise.all([loadPlans(), loadSettings(), loadEnquiries(), loadCtaEvents()]);
      }
      if (tab === 'settings') await loadSettings();
      if (tab === 'staff') await loadStaff();
      if (tab === 'audit') await loadAudit();
    } catch (err: any) {
      if (err.status === 401) {
        setAdminToken(null);
        onLogout();
      } else {
        showToast(err.message || 'Failed to load admin data.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [
    tab,
    loadPlans,
    loadDashboard,
    loadMembers,
    loadMemberActivity,
    loadPayments,
    loadEnquiries,
    loadCtaEvents,
    loadSettings,
    loadStaff,
    loadAudit,
    onLogout,
    showToast,
  ]);

  useEffect(() => {
    refreshActiveTab();
  }, [refreshActiveTab]);

  const handleLogout = async () => {
    await api.post('/api/admin/logout').catch(() => {});
    setAdminToken(null);
    onLogout();
  };

  const handleApprovePayment = async (p: PaymentRecord) => {
    try {
      const res = await api.post<{ expiryDate: string }>(`/api/admin/payments/${p.id}/approve`);
      showToast(`Approved ${p.order_id}. Member active until ${res.expiryDate}.`, 'success');
      await Promise.all([loadPayments(), loadDashboard()]);
    } catch (err: any) {
      showToast(err.message || 'Could not approve payment.', 'error');
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget || !rejectReason.trim()) {
      showToast('Enter a clear rejection reason.', 'error');
      return;
    }
    try {
      await api.post(`/api/admin/payments/${rejectTarget.id}/reject`, {
        reason: rejectReason.trim(),
      });
      showToast(`Rejected ${rejectTarget.order_id}.`, 'info');
      setRejectTarget(null);
      setRejectReason('');
      await Promise.all([loadPayments(), loadDashboard()]);
    } catch (err: any) {
      showToast(err.message || 'Could not reject payment.', 'error');
    }
  };

  const openViewMemberDetail = async (id: number) => {
    try {
      const res = await api.get<{
        member: Member & { duration_value?: number; duration_unit?: string };
        payments: PaymentRecord[];
        activityLogs?: MemberActivityLog[];
      }>(`/api/admin/members/${id}`);
      setViewingMemberDetail(res);
    } catch (err: any) {
      showToast(err.message || 'Could not load full registration details.', 'error');
    }
  };

  const handleLogMemberActivity = async (
    memberId: number,
    payload: { activity_type: 'gym_checkin' | 'note'; title?: string; details?: string }
  ) => {
    if (!memberId) {
      showToast('Please select a member first.', 'error');
      return false;
    }
    try {
      await api.post(`/api/admin/members/${memberId}/activity`, payload);
      showToast(
        payload.activity_type === 'gym_checkin' ? 'Gym check-in logged.' : 'Member note logged.',
        'success'
      );
      if (tab === 'activity') {
        await loadMemberActivity();
      }
      if (viewingMemberDetail && viewingMemberDetail.member.id === memberId) {
        await openViewMemberDetail(memberId);
      }
      return true;
    } catch (err: any) {
      showToast(err.message || 'Could not record activity.', 'error');
      return false;
    }
  };

  const handleQuickActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = quickActivityForm.memberId || members[0]?.id || 0;
    const ok = await handleLogMemberActivity(targetId, {
      activity_type: quickActivityForm.activity_type,
      title: quickActivityForm.title.trim() || undefined,
      details: quickActivityForm.details.trim() || undefined,
    });
    if (ok) {
      setQuickActivityForm((prev) => ({ ...prev, title: '', details: '' }));
    }
  };

  const handleModalActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingMemberDetail) return;
    const ok = await handleLogMemberActivity(viewingMemberDetail.member.id, {
      activity_type: modalActivityForm.activity_type,
      title: modalActivityForm.title.trim() || undefined,
      details: modalActivityForm.details.trim() || undefined,
    });
    if (ok) {
      setModalActivityForm((prev) => ({ ...prev, title: '', details: '' }));
    }
  };

  const openAddMember = () => {
    setEditingMember(null);
    setMemberForm({
      name: '',
      phone: '',
      email: '',
      gender: 'Male',
      dob: '1998-01-01',
      address: 'Durgapur, West Bengal',
      emergency_contact: '',
      fitness_goal: 'Strength & Muscle Gain',
      plan_id: plans[0]?.id || 1,
      start_date: new Date().toISOString().slice(0, 10),
      status: 'active',
    });
    setShowMemberModal(true);
  };

  const openEditMember = (m: Member) => {
    setEditingMember(m);
    setMemberForm({
      name: m.name,
      phone: m.phone,
      email: m.email,
      gender: m.gender,
      dob: m.dob,
      address: m.address,
      emergency_contact: m.emergency_contact,
      fitness_goal: m.fitness_goal,
      plan_id: m.plan_id || plans[0]?.id || 1,
      start_date: m.start_date,
      status: m.status,
    });
    setShowMemberModal(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMember) {
        await api.put(`/api/admin/members/${editingMember.id}`, memberForm);
        showToast('Member updated.', 'success');
      } else {
        await api.post('/api/admin/members', memberForm);
        showToast('New member added.', 'success');
      }
      setShowMemberModal(false);
      await Promise.all([loadMembers(), loadDashboard()]);
    } catch (err: any) {
      showToast(err.message || 'Could not save member.', 'error');
    }
  };

  const handleRenewMember = async (m: Member) => {
    try {
      const res = await api.put<{ expiry_date: string }>(`/api/admin/members/${m.id}`, {
        renew: true,
        plan_id: m.plan_id || plans[0]?.id,
      });
      showToast(`${m.name} renewed until ${res.expiry_date}.`, 'success');
      await Promise.all([loadMembers(), loadDashboard()]);
    } catch (err: any) {
      showToast(err.message || 'Could not renew membership.', 'error');
    }
  };

  const handleDeleteMember = async (m: Member) => {
    try {
      await api.delete(`/api/admin/members/${m.id}`);
      showToast(`Removed ${m.name} (${m.member_code}).`, 'info');
      await Promise.all([loadMembers(), loadDashboard()]);
    } catch (err: any) {
      showToast(err.message || 'Could not delete member.', 'error');
    }
  };

  const openAddPlan = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      price: 1500,
      duration_value: 1,
      duration_unit: 'months',
      description: '',
      featuresText: 'Unlimited floor access\nStarter split guide',
      is_popular: false,
      is_active: true,
    });
    setShowPlanModal(true);
  };

  const openEditPlan = (p: Plan) => {
    setEditingPlan(p);
    setPlanForm({
      name: p.name,
      price: p.price,
      duration_value: p.duration_value,
      duration_unit: p.duration_unit,
      description: p.description,
      featuresText: p.features.join('\n'),
      is_popular: p.is_popular,
      is_active: p.is_active,
    });
    setShowPlanModal(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: planForm.name,
      price: Number(planForm.price),
      duration_value: Number(planForm.duration_value),
      duration_unit: planForm.duration_unit,
      description: planForm.description,
      features: planForm.featuresText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      is_popular: planForm.is_popular,
      is_active: planForm.is_active,
    };

    try {
      if (editingPlan) {
        await api.put(`/api/admin/plans/${editingPlan.id}`, payload);
        showToast('Plan updated.', 'success');
      } else {
        await api.post('/api/admin/plans', payload);
        showToast('Plan created.', 'success');
      }
      setShowPlanModal(false);
      await loadPlans();
      onPublicDataChanged();
    } catch (err: any) {
      showToast(err.message || 'Could not save plan.', 'error');
    }
  };

  const handleTogglePlanActive = async (p: Plan) => {
    try {
      await api.put(`/api/admin/plans/${p.id}`, { is_active: !p.is_active });
      await loadPlans();
      onPublicDataChanged();
    } catch (err: any) {
      showToast(err.message || 'Could not update plan.', 'error');
    }
  };

  const handleDeletePlan = async (p: Plan) => {
    try {
      await api.delete(`/api/admin/plans/${p.id}`);
      showToast('Plan updated/removed.', 'info');
      await loadPlans();
      onPublicDataChanged();
    } catch (err: any) {
      showToast(err.message || 'Could not delete plan.', 'error');
    }
  };

  const handleEnquiryStatus = async (id: number, status: 'new' | 'contacted' | 'closed') => {
    try {
      await api.patch(`/api/admin/enquiries/${id}`, { status });
      await loadEnquiries();
    } catch (err: any) {
      showToast(err.message || 'Could not update enquiry.', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;
    try {
      const res = await api.put<{ settings: AdminSettings }>('/api/admin/settings', settingsForm);
      setSettingsForm(res.settings);
      onPublicDataChanged();
      showToast('Gym & payment settings saved.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not save settings.', 'error');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/staff', staffForm);
      showToast(`Created ${staffForm.role} account: ${staffForm.username}`, 'success');
      setStaffForm({ username: '', email: '', password: '', role: 'staff' });
      await loadStaff();
    } catch (err: any) {
      showToast(err.message || 'Could not create staff account.', 'error');
    }
  };

  const navItems: Array<{ id: AdminTab; label: string; icon: any; ownerOnly?: boolean }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'members', label: 'Members & Forms', icon: Users },
    { id: 'activity', label: 'Member Activity', icon: Activity },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'enquiries', label: 'Enquiries & Trials', icon: MessageSquare },
    { id: 'leads', label: 'Button & Form Data', icon: MousePointerClick },
    { id: 'website', label: 'Website Data', icon: ExternalLink },
    { id: 'plans', label: 'Plans', icon: Layers, ownerOnly: true },
    { id: 'settings', label: 'Settings', icon: Settings, ownerOnly: true },
    { id: 'staff', label: 'Staff Roles', icon: Shield, ownerOnly: true },
    { id: 'audit', label: 'Audit Log', icon: Shield, ownerOnly: true },
  ];

  const visibleNav = navItems.filter((item) => !item.ownerOnly || isOwner);

  const statusTextClass = (s: string) => {
    if (s === 'active' || s === 'approved' || s === 'closed') return 'text-emerald-400';
    if (s === 'pending' || s === 'pending_verification' || s === 'pending_gym_payment' || s === 'contacted')
      return 'text-amber-400';
    if (s === 'expired' || s === 'rejected') return 'text-red-400';
    return 'text-zinc-300';
  };

  const activityTypeLabel = (t: MemberActivityLog['activity_type']) => {
    switch (t) {
      case 'gym_checkin':
        return 'Gym Check-In';
      case 'registration':
        return 'Registration';
      case 'payment_submitted':
        return 'Payment Submitted';
      case 'payment_approved':
        return 'Payment Approved';
      case 'payment_rejected':
        return 'Payment Rejected';
      case 'renewal':
        return 'Renewal';
      case 'profile_updated':
        return 'Profile Update';
      case 'note':
        return 'Desk / Coach Note';
      default:
        return t;
    }
  };

  const activityTypeClass = (t: MemberActivityLog['activity_type']) => {
    if (t === 'gym_checkin' || t === 'payment_approved' || t === 'renewal') return 'text-[#B4F000]';
    if (t === 'payment_rejected') return 'text-red-400';
    if (t === 'payment_submitted') return 'text-amber-400';
    if (t === 'registration') return 'text-emerald-400';
    return 'text-zinc-300';
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#09090B] text-zinc-100 lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full shrink-0 border-b border-white/10 bg-[#0D0D10] lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="font-display text-2xl tracking-wider text-white">MUSCLE ARENA</div>
            <div className="text-xs text-zinc-400">
              {admin.username} · <span className="uppercase text-[#B4F000]">{admin.role}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            title="View public website"
            className="rounded-sm border border-white/10 p-2 text-zinc-400 hover:border-[#B4F000] hover:text-[#B4F000] cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex gap-1 overflow-x-auto p-3 lg:flex-col">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex min-h-[42px] items-center gap-3 rounded-sm px-3.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#B4F000] text-[#09090B] font-bold'
                    : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-[42px] items-center gap-3 rounded-sm px-3.5 text-sm font-medium text-red-400 hover:bg-red-500/10 whitespace-nowrap shrink-0 lg:mt-6 cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-x-hidden">
        <header className="flex items-center justify-between border-b border-white/10 bg-[#09090B] px-6 py-4">
          <div className="text-sm text-zinc-400">
            Admin <span className="mx-1.5">/</span>{' '}
            <span className="font-semibold capitalize text-white">{tab}</span>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                type="button"
                onClick={() =>
                  handleCsvDownload(
                    '/api/admin/backup/json',
                    `build-body-backup-${new Date().toISOString().slice(0, 10)}.json`
                  )
                }
                className="inline-flex min-h-[36px] items-center gap-2 rounded-sm border border-white/15 px-3 text-xs font-medium text-zinc-200 hover:border-[#B4F000] hover:text-[#B4F000] cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Backup Data (JSON)</span>
              </button>
            )}
            <button
              type="button"
              onClick={refreshActiveTab}
              disabled={loading}
              className="inline-flex min-h-[36px] items-center gap-2 rounded-sm border border-white/15 px-3 text-xs font-medium text-zinc-200 hover:border-[#B4F000] cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        <div className="p-6">
          {/* DASHBOARD */}
          {tab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-sm border border-white/10 bg-[#111114] p-5">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">Total Members</div>
                  <div className="mt-2 font-mono-num text-3xl font-bold text-white">
                    {metrics.totalMembers}
                  </div>
                </div>
                <div className="rounded-sm border border-white/10 bg-[#111114] p-5">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">Active</div>
                  <div className="mt-2 font-mono-num text-3xl font-bold text-emerald-400">
                    {metrics.activeMembers}
                  </div>
                </div>
                <div className="rounded-sm border border-white/10 bg-[#111114] p-5">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">Expired</div>
                  <div className="mt-2 font-mono-num text-3xl font-bold text-red-400">
                    {metrics.expiredMembers}
                  </div>
                </div>
                <div className="rounded-sm border border-white/10 bg-[#111114] p-5">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">
                    Pending Payments
                  </div>
                  <div className="mt-2 font-mono-num text-3xl font-bold text-amber-400">
                    {metrics.pendingPayments}
                  </div>
                </div>
                <div className="rounded-sm border border-white/10 bg-[#111114] p-5">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">
                    Monthly Revenue
                  </div>
                  <div className="mt-2 font-mono-num text-3xl font-bold text-[#B4F000]">
                    {formatINR(metrics.monthlyRevenue)}
                  </div>
                </div>
              </div>

              <div className="rounded-sm border border-white/10 bg-[#111114]">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <h2 className="font-display text-2xl tracking-wide text-white">
                    EXPIRING WITHIN 7 DAYS ({expiringSoon.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => setTab('payments')}
                    className="text-xs font-semibold uppercase tracking-wider text-[#B4F000] hover:underline cursor-pointer"
                  >
                    Review Payments ({metrics.pendingPayments})
                  </button>
                </div>
                {expiringSoon.length === 0 ? (
                  <div className="p-6 text-sm text-zinc-400">
                    No active memberships are expiring in the next 7 days.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-white/10 text-xs uppercase text-zinc-400">
                        <tr>
                          <th className="px-5 py-3">Member ID</th>
                          <th className="px-5 py-3">Name</th>
                          <th className="px-5 py-3">Phone</th>
                          <th className="px-5 py-3">Plan</th>
                          <th className="px-5 py-3">Expiry Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {expiringSoon.map((m) => (
                          <tr key={m.id} className="hover:bg-white/[0.02]">
                            <td className="px-5 py-3 font-mono-num text-zinc-300">
                              {m.member_code}
                            </td>
                            <td className="px-5 py-3 font-medium text-white">{m.name}</td>
                            <td className="px-5 py-3 font-mono-num text-zinc-300">{m.phone}</td>
                            <td className="px-5 py-3 text-zinc-300">{m.plan_name}</td>
                            <td className="px-5 py-3 font-mono-num text-amber-400">
                              {m.expiry_date}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MEMBERS */}
          {tab === 'members' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <div className="relative min-w-[220px] flex-1 max-w-sm">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search name, mobile, Member ID..."
                      className="min-h-[40px] w-full rounded-sm border border-white/15 bg-[#111114] pl-9 pr-3 text-sm text-white focus:border-[#B4F000] focus:outline-none"
                    />
                  </div>
                  <select
                    value={memberStatusFilter}
                    onChange={(e) => setMemberStatusFilter(e.target.value)}
                    className="min-h-[40px] rounded-sm border border-white/15 bg-[#111114] px-3 text-sm text-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCsvDownload('/api/admin/members/export/csv', 'build-body-members.csv')
                    }
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-sm border border-white/15 bg-[#111114] px-4 text-xs font-semibold uppercase tracking-wider text-zinc-200 hover:border-[#B4F000] cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export CSV</span>
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={openAddMember}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-sm bg-[#B4F000] px-4 text-xs font-bold uppercase tracking-wider text-[#09090B] hover:bg-[#C9FF24] cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Member</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-sm border border-white/10 bg-[#111114]">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Member ID</th>
                      <th className="px-4 py-3">Name &amp; Goal</th>
                      <th className="px-4 py-3">Mobile</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Start</th>
                      <th className="px-4 py-3">Expiry</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Form &amp; Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-zinc-400">
                          No matching members found.
                        </td>
                      </tr>
                    ) : (
                      members.map((m) => (
                        <tr key={m.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-mono-num text-xs text-zinc-300">
                            {m.member_code}
                          </td>
                          <td className="px-4 py-3 font-medium text-white">
                            <div>{m.name}</div>
                            <div className="text-xs text-zinc-500">
                              {m.email} · {m.fitness_goal}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono-num text-zinc-300">{m.phone}</td>
                          <td className="px-4 py-3 text-zinc-300">{m.plan_name || '-'}</td>
                          <td className="px-4 py-3 font-mono-num text-xs text-zinc-400">
                            {m.start_date}
                          </td>
                          <td className="px-4 py-3 font-mono-num text-xs text-zinc-200">
                            {m.expiry_date || '-'}
                          </td>
                          <td
                            className={`px-4 py-3 text-xs font-bold uppercase ${statusTextClass(
                              m.status
                            )}`}
                          >
                            {m.status}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openViewMemberDetail(m.id)}
                                className="inline-flex items-center gap-1 rounded-sm border border-white/20 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:border-[#B4F000] hover:text-[#B4F000] cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Form</span>
                              </button>
                              {isOwner && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleRenewMember(m)}
                                    className="rounded-sm border border-[#B4F000]/40 px-2.5 py-1 text-xs font-semibold text-[#B4F000] hover:bg-[#B4F000] hover:text-[#09090B] cursor-pointer"
                                  >
                                    Renew
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openEditMember(m)}
                                    aria-label={`Edit ${m.name}`}
                                    className="rounded-sm border border-white/15 p-1.5 text-zinc-300 hover:border-white/40 cursor-pointer"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMember(m)}
                                    aria-label={`Delete ${m.name}`}
                                    className="rounded-sm border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/10 cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MEMBER ACTIVITY LOG */}
          {tab === 'activity' && (
            <div className="space-y-6">
              <form
                onSubmit={handleQuickActivitySubmit}
                className="rounded-sm border border-white/10 bg-[#111114] p-5"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-2xl tracking-wide text-white">
                      RECORD CHECK-IN OR MEMBER NOTE
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Log floor check-ins, workout notes, or front-desk remarks directly into a
                      member&apos;s activity history.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                  <select
                    value={quickActivityForm.memberId || members[0]?.id || ''}
                    onChange={(e) =>
                      setQuickActivityForm((p) => ({ ...p, memberId: Number(e.target.value) }))
                    }
                    className="min-h-[40px] rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white md:col-span-4"
                    aria-label="Select member for activity log"
                  >
                    {members.length === 0 ? (
                      <option value="">No members loaded</option>
                    ) : (
                      members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.member_code} — {m.name} ({m.status})
                        </option>
                      ))
                    )}
                  </select>
                  <select
                    value={quickActivityForm.activity_type}
                    onChange={(e) =>
                      setQuickActivityForm((p) => ({
                        ...p,
                        activity_type: e.target.value as 'gym_checkin' | 'note',
                      }))
                    }
                    className="min-h-[40px] rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white md:col-span-2"
                    aria-label="Activity type"
                  >
                    <option value="gym_checkin">Gym Check-In</option>
                    <option value="note">Coach / Desk Note</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Title (optional)"
                    value={quickActivityForm.title}
                    onChange={(e) =>
                      setQuickActivityForm((p) => ({ ...p, title: e.target.value }))
                    }
                    className="min-h-[40px] rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white md:col-span-2"
                  />
                  <input
                    type="text"
                    placeholder="Session or desk note details..."
                    value={quickActivityForm.details}
                    onChange={(e) =>
                      setQuickActivityForm((p) => ({ ...p, details: e.target.value }))
                    }
                    className="min-h-[40px] rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white md:col-span-3"
                  />
                  <button
                    type="submit"
                    disabled={members.length === 0}
                    className="min-h-[40px] rounded-sm bg-[#B4F000] px-4 text-xs font-bold uppercase tracking-wider text-[#09090B] hover:bg-[#C9FF24] disabled:opacity-50 md:col-span-1 cursor-pointer"
                  >
                    Log
                  </button>
                </div>
              </form>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                  <div className="relative min-w-[220px] flex-1 max-w-sm">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                      placeholder="Search member name, ID, activity..."
                      className="min-h-[40px] w-full rounded-sm border border-white/15 bg-[#111114] pl-9 pr-3 text-sm text-white focus:border-[#B4F000] focus:outline-none"
                    />
                  </div>
                  <select
                    value={activityTypeFilter}
                    onChange={(e) => setActivityTypeFilter(e.target.value)}
                    className="min-h-[40px] rounded-sm border border-white/15 bg-[#111114] px-3 text-sm text-white"
                    aria-label="Filter activity type"
                  >
                    <option value="all">All Activity Types</option>
                    <option value="gym_checkin">Gym Check-Ins</option>
                    <option value="registration">Registrations</option>
                    <option value="payment_submitted">Payments Submitted</option>
                    <option value="payment_approved">Payments Approved</option>
                    <option value="payment_rejected">Payments Rejected</option>
                    <option value="renewal">Renewals</option>
                    <option value="profile_updated">Profile Updates</option>
                    <option value="note">Coach / Desk Notes</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleCsvDownload(
                      '/api/admin/member-activity/export/csv',
                      'build-body-member-activity.csv'
                    )
                  }
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-sm border border-white/15 bg-[#111114] px-4 text-xs font-semibold uppercase tracking-wider text-zinc-200 hover:border-[#B4F000] cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-sm border border-white/10 bg-[#111114]">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Event Type</th>
                      <th className="px-4 py-3">Activity &amp; Details</th>
                      <th className="px-4 py-3">Recorded By</th>
                      <th className="px-4 py-3 text-right">Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {activityLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                          No member activity logs found for this filter.
                        </td>
                      </tr>
                    ) : (
                      activityLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-mono-num text-xs text-zinc-400 whitespace-nowrap">
                            {log.created_at}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">
                              {log.member_name || 'Member'}
                            </div>
                            <div className="font-mono-num text-xs text-zinc-400">
                              {log.member_code}
                            </div>
                          </td>
                          <td
                            className={`px-4 py-3 text-xs font-bold uppercase whitespace-nowrap ${activityTypeClass(
                              log.activity_type
                            )}`}
                          >
                            {activityTypeLabel(log.activity_type)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{log.title}</div>
                            {log.details && (
                              <div className="mt-0.5 text-xs text-zinc-400">{log.details}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono-num text-xs text-zinc-300">
                            {log.actor}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openViewMemberDetail(log.member_id)}
                              className="inline-flex items-center gap-1 rounded-sm border border-white/20 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:border-[#B4F000] hover:text-[#B4F000] cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PAYMENTS */}
          {tab === 'payments' && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'All Payments' },
                  { id: 'pending_verification', label: 'Pending UPI' },
                  { id: 'pending_gym_payment', label: 'Pay at Gym' },
                  { id: 'approved', label: 'Approved' },
                  { id: 'rejected', label: 'Rejected' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPaymentFilter(f.id)}
                    className={`min-h-[38px] rounded-sm px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer ${
                      paymentFilter === f.id
                        ? 'bg-[#B4F000] text-[#09090B]'
                        : 'border border-white/15 bg-[#111114] text-zinc-300 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto rounded-sm border border-white/10 bg-[#111114]">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Plan &amp; Amount</th>
                      <th className="px-4 py-3">UTR / Method</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                          No payment records match this filter.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-mono-num text-xs text-white">
                            {p.order_id}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{p.member_name}</div>
                            <div className="font-mono-num text-xs text-zinc-400">
                              {p.member_code} · {p.phone}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-zinc-200">{p.plan_name}</div>
                            <div className="font-mono-num text-xs font-bold text-[#B4F000]">
                              {formatINR(p.amount)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-mono-num text-xs text-white">
                              {p.utr || (p.payment_method === 'pay_at_gym' ? 'PAY AT GYM' : 'Awaiting UTR')}
                            </div>
                            {p.screenshot_path && (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(p.screenshot_path)}
                                className="mt-1 inline-flex items-center gap-1 text-xs text-[#B4F000] hover:underline cursor-pointer"
                              >
                                <Eye className="h-3 w-3" />
                                <span>View Screenshot</span>
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-bold uppercase ${statusTextClass(p.status)}`}
                            >
                              {p.status.replace(/_/g, ' ')}
                            </span>
                            {p.rejection_reason && (
                              <div className="mt-1 max-w-[200px] text-xs text-red-400">
                                {p.rejection_reason}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {p.status !== 'approved' ? (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleApprovePayment(p)}
                                  className="inline-flex items-center gap-1 rounded-sm bg-emerald-600 px-3 py-1.5 text-xs font-bold uppercase text-white hover:bg-emerald-500 cursor-pointer"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectTarget(p);
                                    setRejectReason('');
                                  }}
                                  className="inline-flex items-center gap-1 rounded-sm border border-red-500/40 px-3 py-1.5 text-xs font-bold uppercase text-red-400 hover:bg-red-500/10 cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-500">
                                By {p.verified_by || 'admin'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PLANS (OWNER) */}
          {tab === 'plans' && isOwner && (
            <div className="space-y-5">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={openAddPlan}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-sm bg-[#B4F000] px-4 text-xs font-bold uppercase tracking-wider text-[#09090B] hover:bg-[#C9FF24] cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Plan</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col justify-between rounded-sm border border-white/10 bg-[#111114] p-6"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          {formatDuration(p.duration_value, p.duration_unit)}
                        </span>
                        <div className="flex items-center gap-3 text-xs font-bold uppercase">
                          {p.is_popular && <span className="text-[#B4F000]">Popular</span>}
                          <span className={p.is_active ? 'text-emerald-400' : 'text-zinc-500'}>
                            {p.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <h3 className="mt-2 font-display text-3xl text-white">{p.name}</h3>
                      <div className="mt-1 font-mono-num text-2xl font-bold text-[#B4F000]">
                        {formatINR(p.price)}
                      </div>
                      <p className="mt-2 text-xs text-zinc-400">{p.description}</p>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                      <button
                        type="button"
                        onClick={() => openEditPlan(p)}
                        className="rounded-sm border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:border-[#B4F000] cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePlanActive(p)}
                        className="rounded-sm border border-white/20 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
                      >
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(p)}
                        className="rounded-sm border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ENQUIRIES */}
          {tab === 'enquiries' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'All Enquiries' },
                    { id: 'free_trial', label: 'Free Trial Bookings' },
                    { id: 'contact', label: 'Visit / Contact Leads' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setEnquirySourceFilter(f.id as any)}
                      className={`min-h-[38px] rounded-sm px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer ${
                        enquirySourceFilter === f.id
                          ? 'bg-[#B4F000] text-[#09090B]'
                          : 'border border-white/15 bg-[#111114] text-zinc-300 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCsvDownload('/api/admin/enquiries/export/csv', 'build-body-enquiries.csv')
                  }
                  className="inline-flex min-h-[38px] items-center gap-2 rounded-sm border border-white/15 bg-[#111114] px-4 text-xs font-semibold uppercase tracking-wider text-zinc-200 hover:border-[#B4F000] cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-sm border border-white/10 bg-[#111114]">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Lead</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Message</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {enquiries
                      .filter(
                        (enq) => enquirySourceFilter === 'all' || enq.source === enquirySourceFilter
                      )
                      .map((enq) => (
                        <tr key={enq.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{enq.name}</div>
                            <div className="font-mono-num text-xs text-zinc-400">
                              {enq.phone} · {enq.email}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold uppercase text-[#B4F000]">
                            {enq.source === 'free_trial' ? 'Free Trial' : 'Visit / Contact'}
                          </td>
                          <td className="px-4 py-3 max-w-md text-zinc-300">{enq.message}</td>
                          <td className="px-4 py-3 font-mono-num text-xs text-zinc-400">
                            {enq.created_at.slice(0, 10)}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={enq.status}
                              onChange={(e) =>
                                handleEnquiryStatus(enq.id, e.target.value as any)
                              }
                              className="rounded-sm border border-white/15 bg-[#09090B] px-2.5 py-1 text-xs text-white"
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="closed">Closed</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* BUTTON & FORM DATA */}
          {tab === 'leads' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-sm border border-white/10 bg-[#111114] p-4">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">Join Now</div>
                  <div className="mt-1.5 font-mono-num text-2xl font-bold text-[#B4F000]">
                    {ctaCounts.join_now || 0}
                  </div>
                </div>
                <div className="rounded-sm border border-white/10 bg-[#111114] p-4">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">
                    Start Your Membership
                  </div>
                  <div className="mt-1.5 font-mono-num text-2xl font-bold text-white">
                    {ctaCounts.start_membership || 0}
                  </div>
                </div>
                <div className="rounded-sm border border-white/10 bg-[#111114] p-4">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">
                    Book Free Trial
                  </div>
                  <div className="mt-1.5 font-mono-num text-2xl font-bold text-emerald-400">
                    {ctaCounts.book_free_trial || 0}
                  </div>
                </div>
                <div className="rounded-sm border border-white/10 bg-[#111114] p-4">
                  <div className="text-xs uppercase tracking-wider text-zinc-400">Contact Form</div>
                  <div className="mt-1.5 font-mono-num text-2xl font-bold text-amber-400">
                    {ctaCounts.contact_form || 0}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'All Sources' },
                    { id: 'join_now', label: 'Join Now' },
                    { id: 'start_membership', label: 'Start Membership' },
                    { id: 'book_free_trial', label: 'Book Free Trial' },
                    { id: 'contact_form', label: 'Contact Form' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setCtaButtonFilter(f.id)}
                      className={`min-h-[38px] rounded-sm px-3.5 text-xs font-semibold uppercase tracking-wider cursor-pointer ${
                        ctaButtonFilter === f.id
                          ? 'bg-[#B4F000] text-[#09090B]'
                          : 'border border-white/15 bg-[#111114] text-zinc-300 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[200px]">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      value={ctaSearch}
                      onChange={(e) => setCtaSearch(e.target.value)}
                      placeholder="Search name, phone, email..."
                      className="min-h-[38px] w-full rounded-sm border border-white/15 bg-[#111114] pl-9 pr-3 text-sm text-white focus:border-[#B4F000] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCsvDownload(
                        '/api/admin/cta-events/export/csv',
                        'build-body-button-form-leads.csv'
                      )
                    }
                    className="inline-flex min-h-[38px] items-center gap-2 rounded-sm border border-white/15 bg-[#111114] px-4 text-xs font-semibold uppercase tracking-wider text-zinc-200 hover:border-[#B4F000] cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-sm border border-white/10 bg-[#111114]">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Button / Form</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Customer Details</th>
                      <th className="px-4 py-3">Page</th>
                      <th className="px-4 py-3">Message / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {ctaEvents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                          No button or form submissions recorded yet for this filter.
                        </td>
                      </tr>
                    ) : (
                      ctaEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-mono-num text-xs text-zinc-400 whitespace-nowrap">
                            {ev.created_at}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs font-bold uppercase text-[#B4F000]">
                              {ev.button_label}
                            </div>
                            <div className="font-mono-num text-[11px] text-zinc-500">
                              {ev.button_name}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-bold uppercase ${
                                ev.status.includes('submitted')
                                  ? 'text-emerald-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {ev.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {ev.customer_name ? (
                              <>
                                <div className="font-medium text-white">{ev.customer_name}</div>
                                <div className="font-mono-num text-xs text-zinc-400">
                                  {ev.customer_phone}
                                  {ev.customer_email ? ` · ${ev.customer_email}` : ''}
                                </div>
                              </>
                            ) : (
                              <span className="text-xs text-zinc-500">Button click / Navigation</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono-num text-xs text-zinc-300">
                            {ev.page_path}
                          </td>
                          <td className="px-4 py-3 max-w-sm text-xs text-zinc-300">
                            {ev.details || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* WEBSITE DATA & CONTENT OVERVIEW */}
          {tab === 'website' && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-white/10 bg-[#111114] p-5">
                <div>
                  <h2 className="font-display text-3xl text-white">WEBSITE DATA OVERVIEW</h2>
                  <p className="text-xs text-zinc-400">
                    All live information currently displayed on the public Muscle Arena website.
                  </p>
                </div>
                {isOwner && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTab('plans')}
                      className="rounded-sm border border-white/20 px-4 py-2 text-xs font-semibold uppercase text-white hover:border-[#B4F000] cursor-pointer"
                    >
                      Manage Plans
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab('settings')}
                      className="rounded-sm bg-[#B4F000] px-4 py-2 text-xs font-bold uppercase text-[#09090B] hover:bg-[#C9FF24] cursor-pointer"
                    >
                      Edit Gym &amp; About Text
                    </button>
                  </div>
                )}
              </div>

              {settingsForm && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-sm border border-white/10 bg-[#111114] p-6 space-y-3 text-sm">
                    <div className="text-xs font-bold uppercase tracking-widest text-[#B4F000]">
                      Gym Business &amp; Timings
                    </div>
                    <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
                      <span className="text-zinc-400">Gym / Owner</span>
                      <span className="text-white">
                        {settingsForm.gym_name} ({settingsForm.owner_name})
                      </span>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
                      <span className="text-zinc-400">Phone / WhatsApp</span>
                      <span className="font-mono-num text-white">{settingsForm.phone}</span>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
                      <span className="text-zinc-400">Email</span>
                      <span className="text-white">{settingsForm.email}</span>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
                      <span className="text-zinc-400">Address</span>
                      <span className="text-right text-zinc-200">{settingsForm.address}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-zinc-400">Hours</span>
                      <span className="text-right text-zinc-200">
                        Mon–Sat {settingsForm.timings_mon_sat} · Sun {settingsForm.timings_sun}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-sm border border-white/10 bg-[#111114] p-6 space-y-3 text-sm">
                    <div className="text-xs font-bold uppercase tracking-widest text-[#B4F000]">
                      Hero &amp; About Copy
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">Hero Headline</div>
                      <div className="font-display text-2xl text-white">
                        {settingsForm.hero_headline}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">About Story</div>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                        {settingsForm.about_story}
                      </p>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">About Mission</div>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                        {settingsForm.about_mission}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-sm border border-white/10 bg-[#111114] p-6">
                  <div className="text-xs font-bold uppercase tracking-widest text-[#B4F000]">
                    Trainers Shown ({TRAINERS.length})
                  </div>
                  <ul className="mt-4 space-y-3 text-sm">
                    {TRAINERS.map((t) => (
                      <li key={t.name} className="border-b border-white/10 pb-2.5 last:border-0">
                        <div className="font-semibold text-white">{t.name}</div>
                        <div className="text-xs text-zinc-400">{t.role}</div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-sm border border-white/10 bg-[#111114] p-6">
                  <div className="text-xs font-bold uppercase tracking-widest text-[#B4F000]">
                    Testimonials Shown ({TESTIMONIALS.length})
                  </div>
                  <ul className="mt-4 space-y-3 text-sm">
                    {TESTIMONIALS.map((t) => (
                      <li key={t.name} className="border-b border-white/10 pb-2.5 last:border-0">
                        <div className="font-semibold text-white">{t.name}</div>
                        <div className="text-xs text-[#B4F000]">{t.outcome}</div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-sm border border-white/10 bg-[#111114] p-6">
                  <div className="text-xs font-bold uppercase tracking-widest text-[#B4F000]">
                    Facilities &amp; FAQs ({FACILITIES.length} / {FAQS.length})
                  </div>
                  <ul className="mt-4 space-y-2 text-xs text-zinc-300">
                    {FACILITIES.map((f) => (
                      <li key={f.title}>• {f.title}</li>
                    ))}
                    <li className="pt-2 text-zinc-400">
                      + {FAQS.length} Frequently Asked Questions active on Home page
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS (OWNER) */}
          {tab === 'settings' && isOwner && settingsForm && (
            <form
              onSubmit={handleSaveSettings}
              className="max-w-4xl space-y-8 rounded-sm border border-white/10 bg-[#111114] p-6"
            >
              <div>
                <h2 className="font-display text-3xl text-white">GYM &amp; PAYMENT SETTINGS</h2>
                <p className="text-xs text-zinc-400">
                  UPI ID and bank transfer details are stored securely and displayed only on the
                  member payment page.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(
                  [
                    ['gym_name', 'Gym Name'],
                    ['owner_name', 'Owner Name'],
                    ['phone', 'Phone / WhatsApp'],
                    ['email', 'Public Email'],
                    ['timings_mon_sat', 'Mon–Sat Timings'],
                    ['timings_sun', 'Sunday Timings'],
                    ['instagram', 'Instagram URL'],
                    ['facebook', 'Facebook URL'],
                    ['youtube', 'YouTube URL'],
                    ['upi_id', 'UPI ID (for QR & Deep Link)'],
                    ['upi_name', 'UPI Payee Name'],
                    ['bank_account_name', 'Bank Account Holder'],
                    ['bank_account_number', 'Bank Account Number'],
                    ['bank_name', 'Bank Name'],
                    ['bank_branch', 'Bank Branch'],
                    ['bank_ifsc', 'Bank IFSC'],
                  ] as Array<[keyof AdminSettings, string]>
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={settingsForm[key] || ''}
                      onChange={(e) =>
                        setSettingsForm((prev) =>
                          prev ? { ...prev, [key]: e.target.value } : prev
                        )
                      }
                      className="min-h-[40px] w-full rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white focus:border-[#B4F000] focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Address
                  </label>
                  <input
                    type="text"
                    value={settingsForm.address}
                    onChange={(e) =>
                      setSettingsForm((prev) =>
                        prev ? { ...prev, address: e.target.value } : prev
                      )
                    }
                    className="min-h-[40px] w-full rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Hero Headline
                  </label>
                  <input
                    type="text"
                    value={settingsForm.hero_headline}
                    onChange={(e) =>
                      setSettingsForm((prev) =>
                        prev ? { ...prev, hero_headline: e.target.value } : prev
                      )
                    }
                    className="min-h-[40px] w-full rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    Hero Subtext
                  </label>
                  <textarea
                    rows={2}
                    value={settingsForm.hero_subtext}
                    onChange={(e) =>
                      setSettingsForm((prev) =>
                        prev ? { ...prev, hero_subtext: e.target.value } : prev
                      )
                    }
                    className="w-full rounded-sm border border-white/15 bg-[#09090B] p-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    About Us Story
                  </label>
                  <textarea
                    rows={3}
                    value={settingsForm.about_story}
                    onChange={(e) =>
                      setSettingsForm((prev) =>
                        prev ? { ...prev, about_story: e.target.value } : prev
                      )
                    }
                    className="w-full rounded-sm border border-white/15 bg-[#09090B] p-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                    About Us Mission
                  </label>
                  <textarea
                    rows={2}
                    value={settingsForm.about_mission}
                    onChange={(e) =>
                      setSettingsForm((prev) =>
                        prev ? { ...prev, about_mission: e.target.value } : prev
                      )
                    }
                    className="w-full rounded-sm border border-white/15 bg-[#09090B] p-3 text-sm text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="min-h-[44px] rounded-sm bg-[#B4F000] px-6 text-xs font-bold uppercase tracking-wider text-[#09090B] hover:bg-[#C9FF24] cursor-pointer"
              >
                Save All Settings
              </button>
            </form>
          )}

          {/* STAFF ROLES (OWNER) */}
          {tab === 'staff' && isOwner && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 overflow-x-auto rounded-sm border border-white/10 bg-[#111114]">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-xs uppercase text-zinc-400">
                    <tr>
                      <th className="px-4 py-3">Username</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {staffList.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-3 font-medium text-white">{s.username}</td>
                        <td className="px-4 py-3 text-zinc-300">{s.email}</td>
                        <td className="px-4 py-3 text-xs font-bold uppercase text-[#B4F000]">
                          {s.role}
                        </td>
                        <td className="px-4 py-3 font-mono-num text-xs text-zinc-400">
                          {s.created_at.slice(0, 10)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form
                onSubmit={handleCreateStaff}
                className="lg:col-span-5 space-y-4 rounded-sm border border-white/10 bg-[#111114] p-6"
              >
                <h3 className="font-display text-2xl text-white">CREATE STAFF / OWNER ACCOUNT</h3>
                <input
                  type="text"
                  required
                  placeholder="Username"
                  value={staffForm.username}
                  onChange={(e) => setStaffForm((p) => ({ ...p, username: e.target.value }))}
                  className="min-h-[40px] w-full rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
                />
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm((p) => ({ ...p, email: e.target.value }))}
                  className="min-h-[40px] w-full rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
                />
                <input
                  type="password"
                  required
                  placeholder="Temporary password (min 8 chars)"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm((p) => ({ ...p, password: e.target.value }))}
                  className="min-h-[40px] w-full rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
                />
                <select
                  value={staffForm.role}
                  onChange={(e) =>
                    setStaffForm((p) => ({ ...p, role: e.target.value as 'staff' | 'owner' }))
                  }
                  className="min-h-[40px] w-full rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
                >
                  <option value="staff">Staff (View Members &amp; Verify Payments Only)</option>
                  <option value="owner">Owner (Full Access)</option>
                </select>
                <button
                  type="submit"
                  className="min-h-[42px] w-full rounded-sm bg-[#B4F000] text-xs font-bold uppercase tracking-wider text-[#09090B] cursor-pointer"
                >
                  Create Account
                </button>
              </form>
            </div>
          )}

          {/* AUDIT LOG (OWNER) */}
          {tab === 'audit' && isOwner && (
            <div className="overflow-x-auto rounded-sm border border-white/10 bg-[#111114]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 uppercase text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Admin</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono-num text-zinc-400">{log.created_at}</td>
                      <td className="px-4 py-3 font-semibold text-white">{log.admin_username}</td>
                      <td className="px-4 py-3 font-mono-num text-[#B4F000]">{log.action}</td>
                      <td className="px-4 py-3 text-zinc-300">
                        {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Screenshot Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="relative max-w-lg rounded-sm border border-white/15 bg-[#111114] p-4">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-3 top-3 rounded-sm bg-black/70 p-1.5 text-white hover:text-[#B4F000]"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={resolveApiUrl(previewImage)}
              alt="Payment confirmation screenshot"
              className="max-h-[75vh] w-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleRejectSubmit}
            className="w-full max-w-md space-y-4 rounded-sm border border-white/15 bg-[#111114] p-6"
          >
            <h3 className="font-display text-2xl text-white">
              REJECT ORDER {rejectTarget.order_id}
            </h3>
            <p className="text-xs text-zinc-400">
              This reason will be displayed to {rejectTarget.member_name} on their payment status
              page.
            </p>
            <textarea
              rows={3}
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. UTR not found in SBI statement for ₹3,200"
              className="w-full rounded-sm border border-white/15 bg-[#09090B] p-3 text-sm text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="rounded-sm border border-white/15 px-4 py-2 text-xs text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-sm bg-red-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-red-500"
              >
                Confirm Reject
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add/Edit Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleSaveMember}
            className="w-full max-w-lg space-y-4 rounded-sm border border-white/15 bg-[#111114] p-6"
          >
            <h3 className="font-display text-2xl text-white">
              {editingMember ? `EDIT ${editingMember.member_code}` : 'ADD NEW MEMBER'}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="text"
                required
                placeholder="Full Name"
                value={memberForm.name}
                onChange={(e) => setMemberForm((p) => ({ ...p, name: e.target.value }))}
                className="min-h-[40px] rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
              />
              <input
                type="tel"
                required
                placeholder="10-digit Phone"
                value={memberForm.phone}
                onChange={(e) => setMemberForm((p) => ({ ...p, phone: e.target.value }))}
                className="min-h-[40px] rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
              />
              <input
                type="email"
                required
                placeholder="Email"
                value={memberForm.email}
                onChange={(e) => setMemberForm((p) => ({ ...p, email: e.target.value }))}
                className="min-h-[40px] rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
              />
              <select
                value={memberForm.plan_id}
                onChange={(e) => setMemberForm((p) => ({ ...p, plan_id: Number(e.target.value) }))}
                className="min-h-[40px] rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
              >
                {plans.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name} ({formatINR(pl.price)})
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={memberForm.start_date}
                onChange={(e) => setMemberForm((p) => ({ ...p, start_date: e.target.value }))}
                className="min-h-[40px] rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
              />
              <select
                value={memberForm.status}
                onChange={(e) => setMemberForm((p) => ({ ...p, status: e.target.value }))}
                className="min-h-[40px] rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Address"
              value={memberForm.address}
              onChange={(e) => setMemberForm((p) => ({ ...p, address: e.target.value }))}
              className="min-h-[40px] w-full rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowMemberModal(false)}
                className="rounded-sm border border-white/15 px-4 py-2 text-xs text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-sm bg-[#B4F000] px-5 py-2 text-xs font-bold uppercase text-[#09090B]"
              >
                Save Member
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add/Edit Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleSavePlan}
            className="w-full max-w-lg space-y-4 rounded-sm border border-white/15 bg-[#111114] p-6"
          >
            <h3 className="font-display text-2xl text-white">
              {editingPlan ? `EDIT ${editingPlan.name}` : 'CREATE MEMBERSHIP PLAN'}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="text"
                required
                placeholder="Plan Name"
                value={planForm.name}
                onChange={(e) => setPlanForm((p) => ({ ...p, name: e.target.value }))}
                className="min-h-[40px] rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
              />
              <input
                type="number"
                required
                min={1}
                placeholder="Price (INR)"
                value={planForm.price}
                onChange={(e) => setPlanForm((p) => ({ ...p, price: Number(e.target.value) }))}
                className="min-h-[40px] rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
              />
              <input
                type="number"
                required
                min={1}
                placeholder="Duration Value"
                value={planForm.duration_value}
                onChange={(e) =>
                  setPlanForm((p) => ({ ...p, duration_value: Number(e.target.value) }))
                }
                className="min-h-[40px] rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
              />
              <select
                value={planForm.duration_unit}
                onChange={(e) =>
                  setPlanForm((p) => ({
                    ...p,
                    duration_unit: e.target.value as 'days' | 'months' | 'years',
                  }))
                }
                className="min-h-[40px] rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
              >
                <option value="days">Days</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Short description"
              value={planForm.description}
              onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))}
              className="min-h-[40px] w-full rounded-sm border border-white/15 bg-[#09090B] px-3 text-sm text-white"
            />
            <textarea
              rows={4}
              placeholder="Features (one per line)"
              value={planForm.featuresText}
              onChange={(e) => setPlanForm((p) => ({ ...p, featuresText: e.target.value }))}
              className="w-full rounded-sm border border-white/15 bg-[#09090B] p-3 text-sm text-white"
            />
            <div className="flex items-center gap-6 text-sm text-zinc-300">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={planForm.is_popular}
                  onChange={(e) => setPlanForm((p) => ({ ...p, is_popular: e.target.checked }))}
                  className="accent-[#B4F000]"
                />
                <span>Most Popular Badge</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={planForm.is_active}
                  onChange={(e) => setPlanForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="accent-[#B4F000]"
                />
                <span>Active on Public Site</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="rounded-sm border border-white/15 px-4 py-2 text-xs text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-sm bg-[#B4F000] px-5 py-2 text-xs font-bold uppercase text-[#09090B]"
              >
                Save Plan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Full Membership Registration Form Details Modal */}
      {viewingMemberDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-sm border border-white/15 bg-[#111114] p-6">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-[#B4F000]">
                  Membership Form Fillup Details
                </div>
                <h3 className="mt-1 font-display text-3xl text-white">
                  {viewingMemberDetail.member.name} ·{' '}
                  <span className="font-mono-num text-xl text-zinc-300">
                    {viewingMemberDetail.member.member_code}
                  </span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingMemberDetail(null)}
                className="rounded-sm border border-white/15 p-1.5 text-zinc-300 hover:text-white cursor-pointer"
                aria-label="Close member form details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-sm border border-white/10 bg-[#09090B] p-3">
                <div className="text-xs uppercase text-zinc-500">Mobile Number</div>
                <div className="mt-1 font-mono-num text-white">
                  +91 {viewingMemberDetail.member.phone}
                </div>
              </div>
              <div className="rounded-sm border border-white/10 bg-[#09090B] p-3">
                <div className="text-xs uppercase text-zinc-500">Email Address</div>
                <div className="mt-1 text-white">{viewingMemberDetail.member.email}</div>
              </div>
              <div className="rounded-sm border border-white/10 bg-[#09090B] p-3">
                <div className="text-xs uppercase text-zinc-500">Gender &amp; Date of Birth</div>
                <div className="mt-1 text-white">
                  {viewingMemberDetail.member.gender} ·{' '}
                  <span className="font-mono-num">{viewingMemberDetail.member.dob}</span>
                </div>
              </div>
              <div className="rounded-sm border border-white/10 bg-[#09090B] p-3">
                <div className="text-xs uppercase text-zinc-500">Emergency Contact</div>
                <div className="mt-1 font-mono-num text-white">
                  +91 {viewingMemberDetail.member.emergency_contact}
                </div>
              </div>
              <div className="rounded-sm border border-white/10 bg-[#09090B] p-3 sm:col-span-2">
                <div className="text-xs uppercase text-zinc-500">Residential Address</div>
                <div className="mt-1 text-white">{viewingMemberDetail.member.address}</div>
              </div>
              <div className="rounded-sm border border-white/10 bg-[#09090B] p-3">
                <div className="text-xs uppercase text-zinc-500">Fitness Goal</div>
                <div className="mt-1 text-white">{viewingMemberDetail.member.fitness_goal}</div>
              </div>
              <div className="rounded-sm border border-white/10 bg-[#09090B] p-3">
                <div className="text-xs uppercase text-zinc-500">Plan &amp; Validity</div>
                <div className="mt-1 text-white">
                  {viewingMemberDetail.member.plan_name || '-'} (
                  <span className="font-mono-num">{viewingMemberDetail.member.start_date}</span> →{' '}
                  <span className="font-mono-num text-[#B4F000]">
                    {viewingMemberDetail.member.expiry_date || 'Pending'}
                  </span>
                  )
                </div>
              </div>
              <div className="rounded-sm border border-white/10 bg-[#09090B] p-3">
                <div className="text-xs uppercase text-zinc-500">Membership Status</div>
                <div
                  className={`mt-1 text-xs font-bold uppercase ${statusTextClass(
                    viewingMemberDetail.member.status
                  )}`}
                >
                  {viewingMemberDetail.member.status}
                </div>
              </div>
              <div className="rounded-sm border border-white/10 bg-[#09090B] p-3">
                <div className="text-xs uppercase text-zinc-500">Registered At &amp; Source</div>
                <div className="mt-1 font-mono-num text-xs text-zinc-300">
                  {viewingMemberDetail.member.created_at}
                  {viewingMemberDetail.member.source_cta
                    ? ` · via ${viewingMemberDetail.member.source_cta.replace(/_/g, ' ')}`
                    : ''}
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Payment Orders ({viewingMemberDetail.payments.length})
              </div>
              {viewingMemberDetail.payments.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-500">
                  No payment orders recorded (added manually by admin).
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {viewingMemberDetail.payments.map((pay) => (
                    <div
                      key={pay.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-white/10 bg-[#09090B] p-3 text-xs"
                    >
                      <div>
                        <div className="font-mono-num font-semibold text-white">
                          {pay.order_id} · {formatINR(pay.amount)}
                        </div>
                        <div className="text-zinc-400">
                          Method: {pay.payment_method.toUpperCase()} · UTR:{' '}
                          <span className="font-mono-num text-zinc-200">{pay.utr || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {pay.screenshot_path && (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(pay.screenshot_path)}
                            className="text-[#B4F000] hover:underline cursor-pointer"
                          >
                            View Screenshot
                          </button>
                        )}
                        <span className={`font-bold uppercase ${statusTextClass(pay.status)}`}>
                          {pay.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="text-xs font-bold uppercase tracking-widest text-[#B4F000]">
                Member Activity Log ({viewingMemberDetail.activityLogs?.length || 0})
              </div>

              <form
                onSubmit={handleModalActivitySubmit}
                className="mt-3 flex flex-wrap items-center gap-2 rounded-sm border border-white/10 bg-[#09090B] p-3"
              >
                <select
                  value={modalActivityForm.activity_type}
                  onChange={(e) =>
                    setModalActivityForm((p) => ({
                      ...p,
                      activity_type: e.target.value as 'gym_checkin' | 'note',
                    }))
                  }
                  className="min-h-[36px] rounded-sm border border-white/15 bg-[#111114] px-2.5 text-xs text-white"
                  aria-label="Member modal activity type"
                >
                  <option value="gym_checkin">Gym Check-In</option>
                  <option value="note">Desk Note</option>
                </select>
                <input
                  type="text"
                  placeholder="Optional title..."
                  value={modalActivityForm.title}
                  onChange={(e) =>
                    setModalActivityForm((p) => ({ ...p, title: e.target.value }))
                  }
                  className="min-h-[36px] flex-1 min-w-[130px] rounded-sm border border-white/15 bg-[#111114] px-2.5 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Session / note details..."
                  value={modalActivityForm.details}
                  onChange={(e) =>
                    setModalActivityForm((p) => ({ ...p, details: e.target.value }))
                  }
                  className="min-h-[36px] flex-1 min-w-[160px] rounded-sm border border-white/15 bg-[#111114] px-2.5 text-xs text-white"
                />
                <button
                  type="submit"
                  className="min-h-[36px] rounded-sm bg-[#B4F000] px-3 text-xs font-bold uppercase text-[#09090B] hover:bg-[#C9FF24] cursor-pointer"
                >
                  Record
                </button>
              </form>

              {!viewingMemberDetail.activityLogs || viewingMemberDetail.activityLogs.length === 0 ? (
                <p className="mt-3 text-xs text-zinc-500">
                  No activity events logged for this member yet.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {viewingMemberDetail.activityLogs.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-sm border border-white/10 bg-[#09090B] p-3 text-xs"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`font-bold uppercase ${activityTypeClass(
                              item.activity_type
                            )}`}
                          >
                            {activityTypeLabel(item.activity_type)}
                          </span>
                          <span className="font-semibold text-white">{item.title}</span>
                        </div>
                        {item.details && (
                          <div className="mt-1 text-zinc-400">{item.details}</div>
                        )}
                      </div>
                      <div className="text-right font-mono-num text-[11px] text-zinc-500">
                        <div>{item.created_at}</div>
                        <div>by {item.actor}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
