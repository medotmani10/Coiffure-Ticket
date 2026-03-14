import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Profile, Shop, Ticket } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, LogOut, Archive, Users, ChevronLeft, X, Loader2, CheckCircle, Settings, Copy, TrendingUp, Printer, Bell, BellOff, ExternalLink, Share2, ListX, Phone, Scissors, User, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { printThermalTicket } from '@/components/ThermalTicket';
import { playTicketSound } from '@/lib/notificationSound';
import { cn, getCustomerBaseUrl } from '@/lib/utils';

/* ─── StatCard ─── */
function StatCard({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border p-5 flex flex-col gap-1 group cursor-default',
      'bg-zinc-950 transition-all duration-300 hover:-translate-y-1',
      color === 'blue' && 'border-amber-500/20 hover:border-amber-500/50 hover:shadow-[0_8px_32px_-4px_rgba(245,158,11,0.25)]',
      color === 'cyan' && 'border-amber-500/20  hover:border-amber-500/50  hover:shadow-[0_8px_32px_-4px_rgba(245,158,11,0.2)]',
      color === 'zinc' && 'border-zinc-700/40   hover:border-zinc-500/40   hover:shadow-[0_8px_32px_-4px_rgba(120,120,120,0.15)]',
    )}>
      {/* glow blob */}
      <div className={cn(
        'absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500',
        color === 'blue' && 'bg-amber-500',
        color === 'cyan' && 'bg-amber-500',
        color === 'zinc' && 'bg-zinc-400',
      )} />
      <p className="text-xs text-zinc-500 font-semibold uppercase tracking-widest">{label}</p>
      <p className={cn(
        'text-5xl font-black tracking-tight',
        color === 'blue' && 'text-amber-500',
        color === 'cyan' && 'text-amber-500',
        color === 'zinc' && 'text-zinc-200',
      )}>{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

/* ─── QuickLinks ─── */
function QuickLinks({ shop }: { shop: Shop }) {
  const customerBase = getCustomerBaseUrl();

  const links = [
    {
      title: 'رابط الزبائن',
      desc: 'للحجز والانضمام للطابور',
      url: `${customerBase}/${shop.slug}`,
      icon: <Users className="w-5 h-5 text-amber-400" />,
      themeClasses: 'hover:border-amber-500/30 hover:shadow-[0_8px_32px_-4px_rgba(245,158,11,0.15)]',
      iconClasses: 'bg-amber-500/10 border-amber-500/20'
    }
  ];

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('تم نسخ الرابط بنجاح ✓');
  };

  const shareLink = async (url: string, title: string, text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        console.log('Error sharing', err);
      }
    } else {
      copyLink(url);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {links.map((link, i) => (
        <div key={i} className={cn(
          'flex items-center justify-between p-4 rounded-2xl border bg-zinc-950 transition-all duration-300 hover:-translate-y-1 group border-zinc-800/80',
          link.themeClasses
        )}>
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border shrink-0', link.iconClasses)}>
              {link.icon}
            </div>
            <div>
              <p className="font-bold text-white text-sm">{link.title}</p>
              <p className="text-xs text-zinc-500">{link.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => shareLink(link.url, link.title, link.desc)} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all" title="مشاركة الرابط">
              <Share2 className="w-4 h-4" />
            </button>
            <button onClick={() => copyLink(link.url)} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all" title="نسخ الرابط">
              <Copy className="w-4 h-4" />
            </button>
            <a href={link.url} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all" title="فتح الرابط">
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [barbers, setBarbers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManualTicketOpen, setIsManualTicketOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualCarCount, setManualCarCount] = useState(1);
  const [manualBarberId, setManualBarberId] = useState<string>('');
  const [selectedTicketDetails, setSelectedTicketDetails] = useState<Ticket | null>(null);
  const [autoPrint, setAutoPrint] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const ticketsRef = useRef(tickets);
  useEffect(() => { ticketsRef.current = tickets; }, [tickets]);

  const autoPrintRef = useRef(autoPrint);
  useEffect(() => { autoPrintRef.current = autoPrint; }, [autoPrint]);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/'); return; }
    loadShopData(session.user.id);
  };

  const loadShopData = async (userId: string, retries = 3) => {
    try {
      const { data: shopData, error } = await supabase.from('shops').select('*').eq('owner_id', userId).single();
      if (error || !shopData) {
        if (retries > 0) {
          setTimeout(() => loadShopData(userId, retries - 1), 500);
          return;
        }
        navigate('/onboarding');
        return;
      }
      setShop(shopData as Shop);
      setLoading(false);
      loadBarbers((shopData as Shop).id);
    } catch {
      toast.error('حدث خطأ في تحميل البيانات');
      setLoading(false);
    }
  };

  const loadBarbers = useCallback(async (shopId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, shop_id, role, full_name, is_active, created_at, updated_at')
      .eq('shop_id', shopId)
      .eq('role', 'barber')
      .order('created_at', { ascending: false });

    if (error) {
      setBarbers([]);
      return;
    }
    setBarbers((data as Profile[]) || []);
  }, []);

  const loadTickets = useCallback(async () => {
    if (!shop?.id) return;
    const { data } = await supabase.from('tickets').select('*').eq('shop_id', shop.id).in('status', ['waiting', 'serving']).order('created_at', { ascending: true });
    setTickets((data as Ticket[]) || []);
  }, [shop?.id]);

  useEffect(() => {
    if (!shop?.id) return;

    const sub = supabase.channel(`admin_shop_rt_${shop.id}`)
      .on('postgres_changes',
        // Relying on RLS to filter to this shop owner's tickets
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTicket = payload.new as Ticket;
            const isManual = newTicket.user_session_id?.startsWith('manual_');
            if (!isManual) {
              if (soundEnabled) playTicketSound();
            }
          }
          loadTickets();
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shops', filter: `id=eq.${shop.id}` },
        (payload) => {
          setShop(payload.new as Shop);
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `shop_id=eq.${shop.id}` },
        () => {
          loadBarbers(shop.id);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Realtime connection issue detected (likely backgrounded).');
          // Removed the scary toast error. The app will attempt to reconnect on visibility change.
        }
      });

    // Handle mobile background/foreground suspend reconnection
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Force a data refresh when returning to the app
        loadTickets();
        loadBarbers(shop.id);

        // If the socket disconnected entirely due to OS background limits, Supabase usually reconnects itself.
        // But doing a manual pull ensures no events were missed.
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Call load tickets when effect runs
    loadTickets();

    // Properly remove channel on unmount or deps change
    return () => {
      supabase.removeChannel(sub);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [shop?.id, soundEnabled, loadTickets, loadBarbers]);

  const toggleShopStatus = async () => {
    if (!shop) return;
    const { error } = await supabase.from('shops').update({ is_open: !shop.is_open }).eq('id', shop.id);
    if (error) toast.error('فشل تحديث حالة المحطة');
    else { setShop({ ...shop, is_open: !shop.is_open }); toast.success(shop.is_open ? 'تم إغلاق المحطة' : 'تم فتح المحطة'); }
  };

  const handleManualTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;

    const customerLabel = manualName.trim() ? manualName.trim() : 'زبون غير مسجل';

    // Validate phone if provided
    if (manualPhone.trim() && !/^0[567]\d{8}$/.test(manualPhone.trim())) {
      toast.error('رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05، 06 أو 07');
      return;
    }

    if (!manualBarberId) {
      toast.error('يرجى اختيار الحلاق');
      return;
    }

    // Use atomic create_ticket RPC to avoid race conditions on ticket_number
    const { data: ticketData, error } = await supabase.rpc('create_ticket', {
      p_shop_id: shop.id,
      p_name: customerLabel,
      p_phone: manualPhone.trim() || '',
      p_people: manualCarCount,
      p_session_id: `manual_${Date.now()}`,
      p_barber_id: manualBarberId,
    });

    if (error) {
      if (error.message.includes('shop_closed')) toast.error('المحطة مغلقة حالياً');
      else if (error.message.includes('invalid_barber')) toast.error('الحلاق المختار غير صالح');
      else toast.error(error.message || 'فشل في إنشاء التذكرة');
      return;
    }

    const insertedTicket = (Array.isArray(ticketData) ? ticketData[0] : ticketData) as Ticket;
    const ticketNumber = insertedTicket.ticket_number;

    toast.success(`تم إنشاء التذكرة #${ticketNumber}`);

    if (autoPrint) {
      // Calculate people ahead for the new ticket (not including this new ticket)
      const peopleAheadCount = tickets
        .filter((t) => t.status === 'waiting' && t.barber_id === manualBarberId)
        .reduce((acc, t) => acc + (t.people_count || 1), 0);
      printThermalTicket({
        ticketNumber: ticketNumber,
        ticketId: insertedTicket.id,
        customerName: insertedTicket.customer_name || customerLabel,
        barberName: insertedTicket.barber_name || undefined,
        shopName: shop.name || '',
        shopSlug: shop.slug || '',
        peopleCount: insertedTicket.people_count || manualCarCount,
        peopleAhead: peopleAheadCount,
        createdAt: new Date(insertedTicket.created_at || new Date().toISOString()),
      });
    }

    setIsManualTicketOpen(false);
    setManualName('');
    setManualPhone('');
    setManualCarCount(1);
    setManualBarberId('');
  };

  const handleNextCustomer = async () => {
    if (!shop) return;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('process_next_customer', { p_shop_id: shop.id });
      if (error) {
        toast.info('لا يوجد زبائن في الانتظار');
      } else if (data && Array.isArray(data) && data.length > 0) {
        const r = data[0] as { customer_name: string; ticket_number: number };
        toast.success(`تفضل الزبون: ${r.customer_name} — #${r.ticket_number}`);
      } else {
        toast.info('لا يوجد زبائن في الانتظار');
      }
    } catch { toast.error('حدث خطأ'); }
    finally { setIsProcessing(false); }
  };

  const cancelTicket = async (id: string) => {
    const { error } = await supabase.from('tickets').update({ status: 'canceled' }).eq('id', id);
    if (error) toast.error('فشل في إلغاء التذكرة'); else toast.success('تم إلغاء التذكرة');
  };

  const finishTicket = async (id: string) => {
    const { error } = await supabase.from('tickets').update({ status: 'completed' }).eq('id', id);
    if (error) toast.error('فشل في إنهاء الخدمة'); else toast.success('تم إنهاء الخدمة ✓');
  };

  const resetQueue = async () => {
    if (!shop) return;
    const { error: ticketsErr } = await supabase
      .from('tickets')
      .update({ status: 'canceled' })
      .eq('shop_id', shop.id)
      .in('status', ['waiting', 'serving']);

    const { error: shopErr } = await supabase
      .from('shops')
      .update({ last_reset_at: new Date().toISOString() })
      .eq('id', shop.id);

    if (ticketsErr || shopErr) {
      toast.error('فشل تصفير الطابور');
    } else {
      toast.success('تم تصفير الطابور بنجاح');
      loadTickets();
    }
  };

  /* ─── Loading ─── */
  if (loading) return (
    <div className="min-h-[100dvh] bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <p className="text-zinc-500 text-sm font-semibold">جاري التحميل…</p>
      </div>
    </div>
  );

  if (!shop) return null;

  const waitingTickets = tickets.filter((t: Ticket) => t.status === 'waiting');
  const servingTickets = tickets.filter((t: Ticket) => t.status === 'serving');

  const waitingCount = waitingTickets.reduce((acc, t) => acc + (t.people_count || 1), 0);
  const servingCount = servingTickets.reduce((acc, t) => acc + (t.people_count || 1), 0);

  const sumPeople = (list: Ticket[]) => list.reduce((acc, t) => acc + (t.people_count || 1), 0);
  const waitingPeopleByBarberId = new Map<string, number>();
  for (const t of waitingTickets) {
    if (!t.barber_id) continue;
    waitingPeopleByBarberId.set(t.barber_id, (waitingPeopleByBarberId.get(t.barber_id) ?? 0) + (t.people_count || 1));
  }

  const barberGroups = barbers.map((b) => {
    const serving = servingTickets.find((t) => t.barber_id === b.id) || null;
    const waiting = waitingTickets.filter((t) => t.barber_id === b.id);
    return { barber: b, serving, waiting };
  });


  /* ─── STATUS GUARD ─── */
  if (shop.status === 'pending') {
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center mb-8 border border-yellow-500/20">
          <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
        </div>
        <h2 className="text-3xl font-black text-white mb-4">حسابك قيد المراجعة</h2>
        <p className="text-zinc-400 text-lg max-w-md leading-relaxed">
          يتم مراجعة حسابك من طرف الإدارة. يرجى الانتظار حتى يتم تفعيل صالونك. سنوافيك بالتحديثات قريباً.
        </p>
        <Button onClick={() => supabase.auth.signOut().then(() => navigate('/'))} variant="ghost" className="mt-8 text-zinc-500 hover:text-white rounded-xl">
          تسجيل الخروج
        </Button>
      </div>
    );
  }

  if (shop.status === 'rejected') {
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-8 border border-red-500/20">
          <XCircle className="w-12 h-12 text-red-500" />
        </div>
        <h2 className="text-3xl font-black text-white mb-4">تم رفض الطلب</h2>
        <p className="text-zinc-400 text-lg max-w-md leading-relaxed">
          عذراً، لقد تم رفض طلبك للانضمام. يرجى التواصل مع الإدارة لمزيد من التفاصيل.
        </p>
        <Button onClick={() => supabase.auth.signOut().then(() => navigate('/'))} variant="ghost" className="mt-8 text-zinc-500 hover:text-white rounded-xl">
          تسجيل الخروج
        </Button>
      </div>
    );
  }

  /* ─── Render ─── */
  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a]" dir="rtl">
      {/* shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-zinc-800/80">
        <div className="w-full px-4 md:px-8 lg:px-12 py-3 flex flex-col md:flex-row justify-between gap-4">

          {/* Top Level: Brand and Mobile Toggle */}
          <div className="flex items-center justify-between w-full md:w-auto">
            {/* Brand */}
            <div className="flex items-center gap-3">
              {shop.logo_url
                ? <img src={shop.logo_url} alt={shop.name} className="w-10 h-10 object-contain rounded-xl border border-zinc-800" />
                : <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_12px_2px_rgba(245,158,11,0.25)]">
                  <Scissors className="w-5 h-5 text-black" />
                </div>
              }
              <div>
                <h1 className="font-black text-white text-base leading-tight truncate max-w-[150px] sm:max-w-[200px]">{shop.name}</h1>
              </div>
            </div>

            {/* Mobile Open/Close Toggle */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={toggleShopStatus}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-black transition-all duration-300',
                  shop.is_open
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full transition-colors shrink-0', shop.is_open ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600')} />
                {shop.is_open ? 'مفتوح' : 'مغلق'}
              </button>
            </div>
          </div>

          {/* Bottom Level / Desktop Actions */}
          <div className="flex items-center justify-between md:justify-end gap-3 border-t border-zinc-800/50 pt-3 md:border-none md:pt-0 w-full md:w-auto">

            {/* Desktop Open/Close Toggle */}
            <button
              onClick={toggleShopStatus}
              className={cn(
                'hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-black transition-all duration-300',
                shop.is_open
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'
              )}
            >
              <span className={cn('w-2 h-2 rounded-full transition-colors shrink-0', shop.is_open ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600')} />
              <span>{shop.is_open ? 'مفتوح' : 'مغلق'}</span>
              <Switch checked={shop.is_open} onCheckedChange={() => { }} onClick={(e) => e.stopPropagation()}
                className="data-[state=checked]:bg-amber-500 scale-75 pointer-events-none" />
            </button>

            {/* Common Action Buttons */}
            <div className="flex items-center justify-center gap-2 flex-1 md:flex-none">

              {/* Sound toggle */}
              <button
                onClick={() => setSoundEnabled(v => !v)}
                title={soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
                className={cn(
                  'w-10 h-10 md:w-9 md:h-9 rounded-xl flex items-center justify-center border transition-all',
                  soundEnabled
                    ? 'border-amber-500/40 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                    : 'border-zinc-800 text-zinc-600 bg-zinc-950 hover:border-zinc-600'
                )}
              >
                {soundEnabled ? <Bell className="w-5 h-5 md:w-4 md:h-4" /> : <BellOff className="w-5 h-5 md:w-4 md:h-4" />}
              </button>

              <button onClick={() => navigate('/admin/settings')}
                className="w-10 h-10 md:w-9 md:h-9 rounded-xl flex items-center justify-center border border-zinc-800 text-zinc-500 hover:text-amber-500 hover:border-zinc-600 transition-all bg-zinc-950 hover:bg-zinc-900">
                <Settings className="w-5 h-5 md:w-4 md:h-4" />
              </button>
              <button onClick={() => navigate('/admin/archive')}
                className="w-10 h-10 md:w-9 md:h-9 rounded-xl flex items-center justify-center border border-zinc-800 text-zinc-500 hover:text-amber-500 hover:border-zinc-600 transition-all bg-zinc-950 hover:bg-zinc-900">
                <Archive className="w-5 h-5 md:w-4 md:h-4" />
              </button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="w-10 h-10 md:w-9 md:h-9 rounded-xl flex items-center justify-center border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/30 transition-all bg-zinc-950 hover:bg-zinc-900"
                    title="تصفير الطابور"
                  >
                    <ListX className="w-5 h-5 md:w-4 h-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-950 border border-zinc-800 text-white rounded-[2rem] w-[90vw] max-w-[400px]" dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-black text-xl text-white text-right flex items-center gap-2">
                      تصفير الطابور <ListX className="w-6 h-6 text-red-500 mr-2" />
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400 text-right mt-2 font-semibold">
                      هل أنت متأكد أنك تريد تصفير الطابور بالكامل؟ سيتم إلغاء جميع التذاكر الحالية وتفريغ الانتظار ولن تتمكن من التراجع عن هذا الإجراء.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row items-center gap-3 mt-4 sm:justify-start">
                    <AlertDialogCancel className="mt-0 flex-1 rounded-xl border-zinc-800 bg-black/50 text-white hover:bg-white/5 hover:text-white font-bold">إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={resetQueue} className="flex-1 rounded-xl bg-red-500 text-white hover:bg-red-600 font-bold border-none shadow-lg shadow-red-500/20">
                      نعم، صفّر الطابور
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="w-10 h-10 md:w-9 md:h-9 rounded-xl flex items-center justify-center border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/30 transition-all bg-zinc-950 hover:bg-zinc-900">
                    <LogOut className="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-950 border border-zinc-800 text-white rounded-[2rem] w-[90vw] max-w-[400px]" dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-black text-xl text-white text-right">تسجيل الخروج</AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-400 text-right mt-2">
                      هل أنت متأكد أنك تريد تسجيل الخروج؟ ستحتاج لتسجيل الدخول مرة أخرى للوصول إلى لوحة التحكم.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row items-center gap-3 mt-4 sm:justify-start">
                    <AlertDialogCancel className="mt-0 flex-1 rounded-xl border-zinc-800 bg-black/50 text-white hover:bg-white/5 hover:text-white">إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={async () => {
                      await supabase.auth.signOut();
                      navigate('/');
                    }} className="flex-1 rounded-xl bg-red-500 text-white hover:bg-red-600 font-bold border-none shadow-lg shadow-red-500/20">
                      تسجيل الخروج
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ─── STATS ─── */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="في الانتظار" value={waitingCount} color="blue" sub={waitingCount > 0 ? 'أشخاص في الانتظار' : 'الطابور فارغ'} />
          <StatCard label="في كرسي الحلاقة" value={servingCount} color="cyan" sub={servingCount > 0 ? 'كراسي حلاقة نشطة' : 'لا يوجد زبائن حالياً'} />
        </div>

        {/* ─── Live indicator ─── */}
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400/80">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>لوحة حية — تتحدث فور كل تغيير</span>
          <span className="flex h-1.5 w-1.5 relative mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
          </span>
        </div>

        {/* ─── QUICK LINKS ─── */}
        <QuickLinks shop={shop} />

        {/* ─── MAIN CONTROLS ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Big call button */}
          <button
            onClick={handleNextCustomer}
            disabled={isProcessing}
            className={cn(
              'w-full rounded-2xl h-14 md:h-[4.5rem] flex items-center justify-center gap-3 font-black text-xl text-white',
              'bg-amber-600 hover:bg-amber-500 active:scale-[0.98]',
              'transition-all duration-150 shadow-[0_4px_24px_-4px_rgba(245,158,11,0.5)]',
              'hover:shadow-[0_10px_36px_-4px_rgba(245,158,11,0.6)]',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
            )}
          >
            {isProcessing
              ? <Loader2 className="w-6 h-6 animate-spin" />
              : <><ChevronLeft className="w-6 h-6" /> نداء للزبون التالي</>
            }
          </button>

          {/* Add Ticket Manual */}
          <Sheet open={isManualTicketOpen} onOpenChange={setIsManualTicketOpen}>
            <SheetTrigger asChild>
              <button
                disabled={!shop.is_open}
                className={cn(
                  'w-full rounded-2xl h-14 md:h-[4.5rem] flex items-center justify-center gap-3 font-black text-xl transition-all duration-150',
                  shop.is_open
                    ? 'text-white bg-amber-600 hover:bg-amber-500 active:scale-[0.98] shadow-[0_4px_24px_-4px_rgba(245,158,11,0.5)] hover:shadow-[0_8px_32px_-4px_rgba(245,158,11,0.6)]'
                    : 'text-zinc-500 bg-zinc-800 cursor-not-allowed opacity-80'
                )}>
                <Plus className="w-6 h-6" />
                {shop.is_open ? 'إضافة زبون يدوياً' : 'المحطة مغلقة'}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-[2rem] h-auto max-h-[92vh] bg-zinc-950 border-zinc-800 p-6" dir="rtl">
              <SheetHeader className="pb-5">
                <SheetTitle className="text-center text-xl font-black text-white flex items-center justify-center gap-2">إضافة زبون للطابور <User className="w-6 h-6 text-amber-500" /></SheetTitle>
              </SheetHeader>
              <form onSubmit={handleManualTicket} className="space-y-4 max-w-md mx-auto">
                <div className="space-y-2">
                  <Label className="text-zinc-300 text-sm font-bold">اسم الزبون</Label>
                  <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="مثال: محمد أحمد"
                    className="rounded-xl h-12 bg-black border-zinc-700 text-white focus-visible:ring-amber-500 placeholder:text-zinc-600" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-300 text-sm font-bold">رقم الهاتف (اختياري)</Label>
                  <Input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="05xxxxxxxx"
                    className="rounded-xl h-12 bg-black border-zinc-700 text-white focus-visible:ring-amber-500 text-left" dir="ltr" />
                </div>
                <div className="space-y-2 flex items-center justify-between border-t border-zinc-800 pt-4 mt-2">
                  <Label className="flex items-center gap-2 text-zinc-300 text-sm font-bold">
                    <User className="w-4 h-4 text-amber-500" /> عدد الأشخاص (إختياري)
                  </Label>
                  <div className="flex bg-black rounded-lg border border-zinc-700 overflow-hidden">
                    <button type="button" onClick={() => setManualCarCount(Math.max(1, manualCarCount - 1))} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer">-</button>
                    <div className="w-10 h-10 flex items-center justify-center font-bold text-white border-x border-zinc-700">{manualCarCount}</div>
                    <button type="button" onClick={() => setManualCarCount(manualCarCount + 1)} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer">+</button>
                  </div>
                </div>

                <div className="space-y-2 border-t border-zinc-800 pt-4 mt-2">
                  <Label className="flex items-center gap-2 text-zinc-300 text-sm font-bold">
                    <Scissors className="w-4 h-4 text-amber-500" /> اختر الحلاق
                  </Label>

                  {barbers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-800 bg-black/30 p-6 text-center text-zinc-500 text-sm font-semibold">
                      لا يوجد حلاقون بعد
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {barbers.map((b) => {
                        const isSelected = manualBarberId === b.id;
                        const waitingPeople = waitingPeopleByBarberId.get(b.id) ?? 0;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setManualBarberId(b.id)}
                            disabled={!b.is_active}
                            className={cn(
                              'rounded-2xl border p-4 text-right transition-all active:scale-[0.99]',
                              !b.is_active ? 'opacity-50 cursor-not-allowed border-zinc-800 bg-black/20' : (isSelected ? 'border-amber-500/50 bg-amber-500/10' : 'border-zinc-800 bg-black/40 hover:border-amber-500/30 hover:bg-zinc-900/40')
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-black text-white truncate">{b.full_name?.trim() || 'حلاق'}</div>
                                <div className="text-xs text-zinc-500 font-semibold mt-1">في الانتظار: {waitingPeople} شخص</div>
                              </div>
                              <div className={cn(
                                'shrink-0 rounded-xl px-3 py-1 text-xs font-black border',
                                isSelected ? 'bg-amber-500 text-black border-amber-400' : 'bg-zinc-900 text-zinc-200 border-zinc-800'
                              )}>
                                {isSelected ? 'محدد' : 'اختيار'}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Print toggle */}
                <button
                  type="button"
                  onClick={() => setAutoPrint(!autoPrint)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200 mt-4',
                    autoPrint
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                      : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'
                  )}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Printer className="w-4 h-4" />
                    طباعة التذكرة تلقائياً
                  </div>
                  <div className={cn(
                    'w-10 h-5 rounded-full transition-all duration-300 relative',
                    autoPrint ? 'bg-amber-500' : 'bg-zinc-700'
                  )}>
                    <div className={cn(
                      'w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all duration-300',
                      autoPrint ? 'left-5' : 'left-0.5'
                    )} />
                  </div>
                </button>

                <button type="submit" className={cn(
                  'w-full rounded-xl h-14 font-black text-lg text-white mt-2',
                  'transition-all duration-150 active:scale-[0.98]',
                  autoPrint
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-[0_4px_16px_-2px_rgba(245,158,11,0.5)]'
                    : 'bg-amber-600 hover:bg-amber-500',
                )}>
                  <span className="flex items-center justify-center gap-2">
                    {autoPrint ? <Printer className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {autoPrint ? 'إضافة وطباعة التذكرة' : 'إضافة التذكرة'}
                  </span>
                </button>
              </form>
            </SheetContent>
          </Sheet>
        </div>

        <div className="space-y-6 pb-20">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h3 className="font-black text-white text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              الطوابير حسب الحلاق
            </h3>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black px-2.5 py-1 rounded-full">
                انتظار: {waitingCount}
              </span>
              <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black px-2.5 py-1 rounded-full">
                في الخدمة: {servingCount}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {barberGroups.map(({ barber, serving, waiting }) => (
              <div key={barber.id} className="rounded-[2rem] border border-zinc-800 bg-black/40 overflow-hidden">
                <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-xl border flex items-center justify-center",
                      barber.is_active ? "bg-green-500/10 border-green-500/20" : "bg-zinc-900 border-zinc-800"
                    )}>
                      <Scissors className={cn("w-5 h-5", barber.is_active ? "text-green-400" : "text-zinc-500")} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-black text-lg truncate">{barber.full_name?.trim() || 'حلاق'}</div>
                      <div className={cn("text-xs font-bold", barber.is_active ? "text-green-400" : "text-zinc-500")}>
                        {barber.is_active ? 'نشط' : 'غير نشط'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-black px-2.5 py-1 rounded-full">
                      انتظار: {sumPeople(waiting)}
                    </span>
                    <span className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-black px-2.5 py-1 rounded-full">
                      في الخدمة: {serving ? sumPeople([serving]) : 0}
                    </span>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-zinc-300 font-black">في الخدمة</div>
                      <div className="text-xs text-zinc-500 font-bold">{serving ? 1 : 0}</div>
                    </div>
                    {!serving ? (
                      <div className="flex flex-col items-center justify-center py-10 border border-zinc-800/50 rounded-2xl bg-zinc-950/40 border-dashed">
                        <User className="w-10 h-10 text-zinc-700 mb-2" />
                        <p className="text-zinc-500 text-sm font-medium">لا يوجد</p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 cursor-pointer" onClick={() => setSelectedTicketDetails(serving)}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-black px-3 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" /> يخدم الآن
                          </div>
                          <p className="text-4xl font-black text-white">#{serving.ticket_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-zinc-300 font-bold text-lg">{serving.customer_name}</p>
                          <p className="text-zinc-500 text-sm">{new Date(serving.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Button
                            onClick={(e) => { e.stopPropagation(); finishTicket(serving.id); }}
                            variant="outline"
                            className="w-full rounded-xl h-11 bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20 font-black"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> إنهاء
                          </Button>
                          <Button
                            onClick={(e) => { e.stopPropagation(); cancelTicket(serving.id); }}
                            variant="outline"
                            className="w-full rounded-xl h-11 bg-red-500/10 text-red-300 border-red-500/20 hover:bg-red-500/20 font-black"
                          >
                            <X className="w-4 h-4 mr-2" /> إلغاء
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-zinc-300 font-black">انتظار</div>
                      <div className="text-xs text-zinc-500 font-bold">{waiting.length}</div>
                    </div>
                    {waiting.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 border border-zinc-800/50 rounded-2xl bg-zinc-950/40 border-dashed">
                        <Users className="w-10 h-10 text-zinc-700 mb-2" />
                        <p className="text-zinc-500 text-sm font-medium">لا يوجد</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {waiting.map((t, i) => (
                          <div key={t.id} onClick={() => setSelectedTicketDetails(t)} className={cn(
                            'flex items-center justify-between p-4 rounded-xl border border-zinc-800',
                            'bg-black hover:bg-zinc-900/80 hover:border-amber-500/30 transition-all duration-200 cursor-pointer group',
                          )}>
                            <div className="flex items-center gap-4">
                              <span className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 font-black text-zinc-500 text-base group-hover:border-amber-500/30 group-hover:text-amber-500 transition-colors shrink-0">
                                {i + 1}
                              </span>
                              <div>
                                <p className="font-black text-white text-lg leading-tight group-hover:text-amber-400 transition-colors">
                                  <span className="text-zinc-600 text-base ml-1">#</span>{t.ticket_number}
                                </p>
                                <p className="text-sm text-zinc-500 truncate max-w-[150px] sm:max-w-[200px]">{t.customer_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); cancelTicket(t.id); }}
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20" title="إلغاء التذكرة">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Contact Dialog */}
      <Dialog open={!!selectedTicketDetails} onOpenChange={(o) => !o && setSelectedTicketDetails(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white rounded-2xl w-[90vw] max-w-sm p-6" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-right text-amber-500">تفاصيل الزبون</DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm text-right mt-1">
              رقم التذكرة: {selectedTicketDetails ? selectedTicketDetails.ticket_number : ''}
            </DialogDescription>
          </DialogHeader>
          {selectedTicketDetails && (
            <div className="space-y-4 mt-2">
              <div className="bg-black/50 p-4 rounded-xl border border-zinc-800/80 items-center justify-between">
                <p className="text-zinc-500 text-xs font-bold mb-1">اسم الزبون</p>
                <p className="text-lg font-black text-white break-words">{selectedTicketDetails.customer_name}</p>
                {selectedTicketDetails.barber_name && (
                  <>
                    <p className="text-zinc-500 text-xs font-bold mt-3 mb-1">الحلاق المطلوب</p>
                    <p className="text-sm font-semibold text-zinc-300">{selectedTicketDetails.barber_name}</p>
                  </>
                )}
                <p className="text-zinc-500 text-xs font-bold mt-3 mb-1">وقت الدخول</p>
                <p className="text-sm font-semibold text-zinc-300">{new Date(selectedTicketDetails.created_at).toLocaleString('fr-FR')}</p>
              </div>

              {selectedTicketDetails.phone_number ? (
                <a
                  href={`tel:${selectedTicketDetails.phone_number}`}
                  className="flex items-center gap-3 w-full bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 p-4 rounded-xl transition-all duration-200 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 pointer-events-none" />
                  </div>
                  <div>
                    <p className="text-xs font-bold opacity-80 mb-0.5 pointer-events-none">رقم الهاتف (انقر للاتصال)</p>
                    <p className="text-lg font-black tracking-wide pointer-events-none" dir="ltr">{selectedTicketDetails.phone_number}</p>
                  </div>
                </a>
              ) : (
                <div className="flex items-center gap-3 w-full bg-zinc-900 border border-zinc-800 text-zinc-500 p-4 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">لا يوجد رقم هاتف</p>
                  </div>
                </div>
              )}
              <Button
                onClick={() => {
                  const index = tickets.findIndex(t => t.id === selectedTicketDetails.id);
                  // Sum people_count for all tickets before this one (including serving)
                  const peopleAheadCount = tickets.slice(0, index).reduce((acc, t) => acc + (t.people_count || 1), 0);
                  printThermalTicket({
                    ticketNumber: selectedTicketDetails.ticket_number,
                    ticketId: selectedTicketDetails.id,
                    customerName: selectedTicketDetails.customer_name || 'عميل',
                    shopName: shop.name || '',
                    shopSlug: shop.slug || '',
                    peopleCount: selectedTicketDetails.people_count,
                    peopleAhead: peopleAheadCount,
                    createdAt: new Date(selectedTicketDetails.created_at)
                  });
                }}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-6 rounded-xl shadow-lg shadow-amber-500/20 mt-2"
              >
                <Printer className="w-5 h-5 ml-2" />
                طباعة التذكرة
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}