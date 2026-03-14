import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Profile, Shop, Ticket } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, LogOut, User, Scissors, XCircle, CheckCircle, ChevronLeft, Plus, Phone, Users } from 'lucide-react';
import { toast } from 'sonner';
import { printThermalTicket } from '@/components/ThermalTicket';

type NextTicketResult = {
  ticket_id: string;
  ticket_number: number;
  ticket_code?: string | null;
  customer_name: string;
  people_count: number;
  barber_name: string | null;
  barber_id: string | null;
};

export default function BarberDashboard() {
  const navigate = useNavigate();
  const { shopSlug } = useParams<{ shopSlug: string }>();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [serving, setServing] = useState<Ticket | null>(null);
  const [waitingAssigned, setWaitingAssigned] = useState<Ticket[]>([]);

  // Manual ticket state
  const [showManualTicket, setShowManualTicket] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualPeople, setManualPeople] = useState(1);
  const [creatingTicket, setCreatingTicket] = useState(false);

  const barberDisplayName = useMemo(() => {
    if (!profile) return '';
    return profile.full_name?.trim() || 'حلاق';
  }, [profile]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/');
        return;
      }

      const { data: p, error: pErr } = await supabase
        .from('profiles')
        .select('id, shop_id, role, full_name, is_active, created_at, updated_at')
        .eq('id', session.user.id)
        .single();

      if (pErr || !p) {
        await supabase.auth.signOut();
        navigate('/');
        return;
      }

      const profileRow = p as Profile;
      if (profileRow.role !== 'barber') {
        await supabase.auth.signOut();
        navigate('/');
        return;
      }

      const { data: s, error: sErr } = await supabase.from('shops').select('*').eq('id', profileRow.shop_id).single();
      if (sErr || !s) {
        toast.error('تعذر تحميل بيانات الصالون');
        return;
      }

      const shopRow = s as Shop;
      setProfile(profileRow);
      setShop(shopRow);

      if (shopSlug && shopRow.slug !== shopSlug) {
        navigate(`/barber/${shopRow.slug}`, { replace: true });
      }
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  }, [navigate, shopSlug]);

  const loadTickets = useCallback(async () => {
    if (!shop?.id || !profile?.id) return;
    const { data: servingData } = await supabase
      .from('tickets')
      .select('*')
      .eq('shop_id', shop.id)
      .eq('status', 'serving')
      .eq('barber_id', profile.id)
      .order('updated_at', { ascending: false })
      .limit(1);
    setServing((servingData?.[0] as Ticket) ?? null);

    const { data: waitingData } = await supabase
      .from('tickets')
      .select('*')
      .eq('shop_id', shop.id)
      .eq('status', 'waiting')
      .eq('barber_id', profile.id)
      .order('created_at', { ascending: true });
    setWaitingAssigned((waitingData as Ticket[]) ?? []);
  }, [profile?.id, shop?.id]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadTickets(); }, [loadTickets]);

  useEffect(() => {
    if (!shop?.id) return;
    let channel = supabase
      .channel(`barber_rt_${shop.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        loadTickets();
      });

    if (profile?.id) {
      channel = channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}` }, (payload) => {
        setProfile(payload.new as Profile);
      });
    }

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadTickets, profile?.id, shop?.id]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const toggleActive = async () => {
    if (!profile) return;
    const next = !profile.is_active;
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: next })
      .eq('id', profile.id);
    if (error) {
      toast.error('فشل تحديث الحالة');
      return;
    }
    setProfile({ ...profile, is_active: next });
    toast.success(next ? 'تم تفعيل الحلاق' : 'تم إيقاف الحلاق');
  };

  const handleNext = async () => {
    if (!shop?.id) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('barber_next_ticket', { p_shop_id: shop.id });
      if (error) {
        toast.info('لا يوجد زبائن في الانتظار');
        return;
      }
      const row = (Array.isArray(data) ? data[0] : data) as NextTicketResult | undefined;
      if (!row?.ticket_id) {
        toast.info('لا يوجد زبائن في الانتظار');
        return;
      }
      toast.success(`تفضل الزبون: ${row.customer_name} — ${row.ticket_code ?? '#' + row.ticket_number}`);
      await loadTickets();
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCallSpecific = async (ticketId: string) => {
    if (!shop?.id) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('barber_call_specific_ticket', { p_shop_id: shop.id, p_ticket_id: ticketId });
      if (error) {
        if (error.message.includes('already_serving')) {
          toast.error('أنت تخدم زبوناً بالفعل. قم بإنهاء أو إلغاء التذكرة الحالية أولاً.');
        } else if (error.message.includes('ticket_not_available')) {
          toast.error('هذه التذكرة غير متاحة للنداء.');
        } else {
          toast.error('حدث خطأ');
        }
        return;
      }

      const row = (Array.isArray(data) ? data[0] : data) as NextTicketResult | undefined;
      if (row?.ticket_id) {
        toast.success(`تفضل الزبون: ${row.customer_name} — ${row.ticket_code ?? '#' + row.ticket_number}`);
        await loadTickets();
      }
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setActionLoading(false);
    }
  };

  const setStatus = async (status: 'completed' | 'canceled') => {
    if (!serving) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', serving.id);
      if (error) {
        toast.error('فشل تحديث التذكرة');
        return;
      }
      toast.success(status === 'completed' ? 'تم إنهاء الخدمة' : 'تم إلغاء التذكرة');
      setServing(null);
      await loadTickets();
    } catch {
      toast.error('حدث خطأ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !profile) return;

    const customerLabel = manualName.trim() || 'زبون غير مسجل';
    if (manualPhone.trim() && !/^0[567]\d{8}$/.test(manualPhone.trim())) {
      toast.error('رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05، 06 أو 07');
      return;
    }

    setCreatingTicket(true);
    try {
      const { data: ticketData, error } = await supabase.rpc('create_ticket', {
        p_shop_id: shop.id,
        p_name: customerLabel,
        p_phone: manualPhone.trim() || '',
        p_people: manualPeople,
        p_session_id: `manual_${Date.now()}`,
        p_barber_id: profile.id,
      });

      if (error) {
        if (error.message.includes('shop_closed')) toast.error('المحل مغلق حالياً');
        else toast.error(error.message || 'فشل في إنشاء التذكرة');
        return;
      }

      const inserted = (Array.isArray(ticketData) ? ticketData[0] : ticketData) as Ticket;
      const ticketCode = inserted.ticket_code ?? `#${inserted.ticket_number}`;
      toast.success(`تم إنشاء التذكرة ${ticketCode}`);

      // Calculate people waiting ahead (before this ticket)
      const peopleAheadCount = waitingAssigned.reduce((acc, t) => acc + (t.people_count || 1), 0);

      printThermalTicket({
        ticketNumber: inserted.ticket_number,
        ticketCode: inserted.ticket_code ?? undefined,
        ticketId: inserted.id,
        customerName: inserted.customer_name || customerLabel,
        barberName: profile.full_name || undefined,
        shopName: shop.name || '',
        shopSlug: shop.slug || '',
        peopleCount: inserted.people_count || manualPeople,
        peopleAhead: peopleAheadCount,
        createdAt: new Date(inserted.created_at || new Date().toISOString()),
      });

      setShowManualTicket(false);
      setManualName('');
      setManualPhone('');
      setManualPeople(1);
      await loadTickets();
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setCreatingTicket(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!shop || !profile) return null;

  return (
    <div className="min-h-[100dvh] bg-black text-white" dir="rtl">
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur border-b border-zinc-900">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Scissors className="w-5 h-5 text-amber-500" />
            </div>
            <div className="leading-tight">
              <div className="font-black text-lg">{barberDisplayName}</div>
              <div className="text-xs text-zinc-500">{shop.name}</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={profile.is_active ? 'text-green-400 text-xs font-bold' : 'text-zinc-500 text-xs font-bold'}>
                {profile.is_active ? 'نشط' : 'غير نشط'}
              </span>
              <Switch checked={profile.is_active} onCheckedChange={toggleActive} />
            </div>

            <button
              onClick={handleSignOut}
              className="w-10 h-10 rounded-xl border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-colors flex items-center justify-center text-zinc-400 hover:text-white"
              title="تسجيل الخروج"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <section className="rounded-[2rem] border border-zinc-900 bg-zinc-950/40 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-zinc-400 font-bold text-sm">
                <User className="w-4 h-4" />
                يخدم الآن
              </div>
              <Button
                variant="ghost"
                onClick={() => navigate(`/barber/${shop.slug}`)}
                className="rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-900"
              >
                <ChevronLeft className="w-4 h-4 ml-1" />
                تحديث
              </Button>
            </div>

            <div className="rounded-[2rem] border border-zinc-900 bg-black p-8 text-center">
              <div className="text-zinc-500 text-xs font-bold mb-3">رقم التذكرة</div>
              <div className="text-8xl sm:text-9xl font-black tracking-tighter leading-none">
                {serving ? (serving.ticket_code ?? `#${serving.ticket_number}`) : '—'}
              </div>
              <div className="mt-4 text-zinc-500 font-semibold">
                {serving ? serving.customer_name : 'لا يوجد زبون حالياً'}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                onClick={handleNext}
                disabled={actionLoading || !profile.is_active}
                className="rounded-2xl h-14 bg-amber-600 hover:bg-amber-500 text-black font-black text-lg disabled:opacity-40"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'الزبون التالي'}
              </Button>

              <Button
                onClick={() => setStatus('completed')}
                disabled={actionLoading || !serving}
                className="rounded-2xl h-14 bg-green-600 hover:bg-green-500 text-black font-black text-lg disabled:opacity-40"
              >
                <CheckCircle className="w-5 h-5 ml-2" />
                إنهاء
              </Button>

              <Button
                onClick={() => setStatus('canceled')}
                disabled={actionLoading || !serving}
                className="rounded-2xl h-14 bg-red-600 hover:bg-red-500 text-white font-black text-lg disabled:opacity-40"
              >
                <XCircle className="w-5 h-5 ml-2" />
                إلغاء/غائب
              </Button>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-zinc-900 bg-zinc-950/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-black text-white">القادمون</div>
              <div className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
                {waitingAssigned.length}
              </div>
            </div>

            {waitingAssigned.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/30 p-10 text-center text-zinc-500 font-semibold">
                لا يوجد زبائن مخصصين لك
              </div>
            ) : (
              <div className="space-y-2">
                {waitingAssigned.slice(0, 12).map((t, idx) => (
                  <div key={t.id} className="rounded-xl border border-zinc-900 bg-black/40 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 font-black">
                        {idx + 1}
                      </div>
                      <div className="leading-tight">
                        <div className="font-black text-white">{t.ticket_code ?? `#${t.ticket_number}`}</div>
                        <div className="text-xs text-zinc-500 truncate max-w-[180px]">{t.customer_name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-zinc-600 font-bold hidden sm:block">
                        {new Date(t.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCallSpecific(t.id)}
                        disabled={actionLoading || !profile?.is_active}
                        className="h-8 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-black font-bold whitespace-nowrap"
                      >
                        استدعاء
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Floating Add Ticket Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Button
          onClick={() => setShowManualTicket(true)}
          disabled={!profile?.is_active || !shop?.is_open}
          className="rounded-2xl h-14 px-8 bg-amber-600 hover:bg-amber-500 text-black font-black text-lg shadow-[0_0_30px_rgba(217,119,6,0.4)] focus-visible:ring-amber-500 disabled:opacity-40"
        >
          <Plus className="w-5 h-5 ml-2" />
          تذكرة يدوية
        </Button>
      </div>

      {/* Manual Ticket Dialog */}
      <Dialog open={showManualTicket} onOpenChange={(open) => !open && setShowManualTicket(false)}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white p-6 rounded-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
              <Scissors className="w-5 h-5 text-amber-500" />
              إضافة تذكرة يدوية
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleManualTicket} className="space-y-4 pt-2">
            {/* Customer name */}
            <div className="space-y-2">
              <Label className="text-zinc-300 font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-amber-500" />
                اسم الزبون (اختياري)
              </Label>
              <Input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="محمد أحمد"
                className="rounded-xl h-12 bg-black border-zinc-700 text-white focus-visible:ring-amber-500 placeholder:text-zinc-600"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="text-zinc-300 font-bold flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-500" />
                رقم الهاتف (اختياري)
              </Label>
              <Input
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                dir="ltr"
                type="tel"
                className="rounded-xl h-12 bg-black border-zinc-700 text-white focus-visible:ring-amber-500 placeholder:text-zinc-600 text-left"
              />
            </div>

            {/* People count */}
            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <Label className="text-zinc-300 font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                عدد الأشخاص
              </Label>
              <div className="flex bg-black rounded-xl border border-zinc-700 overflow-hidden">
                <button type="button" onClick={() => setManualPeople(Math.max(1, manualPeople - 1))} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors font-bold text-lg">-</button>
                <div className="w-10 h-10 flex items-center justify-center font-black text-white border-x border-zinc-700">{manualPeople}</div>
                <button type="button" onClick={() => setManualPeople(manualPeople + 1)} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors font-bold text-lg">+</button>
              </div>
            </div>

            {/* Barber info (read-only) */}
            <div className="rounded-xl bg-black/50 border border-zinc-800 p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Scissors className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <div className="text-xs text-zinc-500">سيتم ربط التذكرة بـ</div>
                <div className="text-white font-black">{profile?.full_name || 'حلاق'}</div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={creatingTicket}
                className="flex-1 rounded-xl h-12 bg-amber-600 hover:bg-amber-500 text-black font-black text-lg"
              >
                {creatingTicket ? <Loader2 className="w-5 h-5 animate-spin" /> : 'إنشاء وطباعة'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowManualTicket(false)}
                className="flex-1 rounded-xl h-12 text-zinc-400 hover:text-white hover:bg-zinc-900 font-bold"
              >
                إلغاء
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

