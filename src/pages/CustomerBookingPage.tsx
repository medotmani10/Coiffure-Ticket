import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, getOrCreateSessionId } from '@/lib/supabase';
import type { Shop, Ticket } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, User, Phone, Scissors, AlertCircle, Loader2, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import ActiveTicketCard from '@/components/booking/ActiveTicketCard';
import ShopClosedScreen from '@/components/booking/ShopClosedScreen';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { unlockAudio } from '@/lib/notificationSound';

export default function CustomerBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [shop, setShop] = useState<Shop | null>(null);
  const [queueCount, setQueueCount] = useState<number>(0);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [peopleAhead, setPeopleAhead] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [peopleCount, setPeopleCount] = useState(1);
  const [barberNames, setBarberNames] = useState<string[]>(['']);

  useEffect(() => {
    setBarberNames(prev => {
      const newBarberNames = [...prev];
      if (peopleCount > prev.length) {
        for (let i = prev.length; i < peopleCount; i++) {
          newBarberNames.push('');
        }
      } else if (peopleCount < prev.length) {
        newBarberNames.length = peopleCount;
      }
      return newBarberNames;
    });
  }, [peopleCount]);

  // Notification states and refs
  const { notificationPermission, requestNotificationPermission, triggerSystemNotification } = usePushSubscription(activeTicket?.id ?? null);
  const notifiedTwoAheadRef = useRef(false);
  const notifiedServingRef = useRef(false);

  useEffect(() => { if (slug) loadShopData(); }, [slug]);

  useEffect(() => {
    if (activeTicket) {
      // Set initial ref states so we don't trigger old notifications on page load
      if (activeTicket.status === 'serving') notifiedServingRef.current = true;
      return subscribeToTicketUpdates();
    }
  }, [activeTicket?.id]);

  useEffect(() => {
    if (!shop) return;
    const channel = supabase.channel(`customer_booking_${shop.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `shop_id=eq.${shop.id}` }, async () => {
        // fetch total waiting count
        const { data: waitingTickets } = await supabase.from('tickets').select('people_count').eq('shop_id', shop.id).eq('status', 'waiting');
        const count = (waitingTickets || []).reduce((acc: number, t: any) => acc + (t.people_count || 1), 0);
        setQueueCount(count);
        if (activeTicket) {
          calculatePeopleAhead(activeTicket);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shops', filter: `id=eq.${shop.id}` }, (payload) => {
        setShop(payload.new as Shop);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [shop?.id, activeTicket]);

  const loadShopData = async () => {
    if (!slug) return;
    try {
      const { data: shopData, error: shopError } = await supabase.from('shops').select('*').eq('slug', slug).single();
      if (shopError || !shopData) { toast.error('المحطة غير موجودة'); navigate('/'); return; }
      setShop(shopData as Shop);

      // Save the shop slug to localStorage for smart redirects
      localStorage.setItem('last_visited_shop', shopData.slug);

      // Queue counts
      const { data: waitingTickets } = await supabase.from('tickets').select('people_count').eq('shop_id', shopData.id).eq('status', 'waiting');
      const count = (waitingTickets || []).reduce((acc: number, t: any) => acc + (t.people_count || 1), 0);
      setQueueCount(count);

      // Check for existing active ticket for this session
      const sessionId = getOrCreateSessionId();
      const { data: ticketsData } = await supabase.from('tickets').select('*').eq('shop_id', shopData.id).eq('user_session_id', sessionId).in('status', ['waiting', 'serving']).order('created_at', { ascending: false }).limit(1);
      if (ticketsData && ticketsData.length > 0) {
        const ticket = ticketsData[0] as Ticket;
        setActiveTicket(ticket);
        await calculatePeopleAhead(ticket);
      }
    } catch { toast.error('حدث خطأ في تحميل البيانات'); }
    finally { setLoading(false); }
  };

  const calculatePeopleAhead = async (ticket: Ticket) => {
    const { data, error } = await supabase.rpc('get_people_ahead', {
      p_shop_id: ticket.shop_id,
      p_created_at: ticket.created_at,
    });
    if (!error) {
      const count = data ?? 0;
      setPeopleAhead(count);

      // Notify if exactly 2 people ahead
      if (count === 2 && !notifiedTwoAheadRef.current) {
        unlockAudio(); // Ensure audio context is ready
        triggerSystemNotification(
          "اقترب دورك!",
          "يوجد شخصين فقط أمامك في الانتظار. يرجى التقدم إلى الصالون."
        );
        notifiedTwoAheadRef.current = true;
      }
    }
  };

  const subscribeToTicketUpdates = () => {
    if (!activeTicket) return;
    const subscription = supabase.channel(`ticket_${activeTicket.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `id=eq.${activeTicket.id}` }, (payload) => {
        const updatedTicket = payload.new as Ticket;
        setActiveTicket(updatedTicket);

        unlockAudio(); // Try to unlock audio context on database change

        if (updatedTicket.status === 'serving' && !notifiedServingRef.current) {
          triggerSystemNotification("دورك الآن!", "تفضل، حان دورك للحلاقة!");
          toast.success('🎉 دورك الآن! تفضل بالحلاقة');
          notifiedServingRef.current = true;
        }
        else if (updatedTicket.status === 'completed') {
          triggerSystemNotification("نعيماً", "نعيماً! شكراً لزيارتك.");
          toast.info('تم إنهاء الخدمة، شكراً!');
          setActiveTicket(null);
        }
        else if (updatedTicket.status === 'canceled') {
          toast.error('تم إلغاء التذكرة');
          setActiveTicket(null);
        }
      }).subscribe();
    return () => { supabase.removeChannel(subscription); };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    if (!name.trim() || !phone.trim()) { toast.error('يرجى ملء جميع الحقول'); return; }
    if (!/^0[567]\d{8}$/.test(phone.trim())) { toast.error('رقم الهاتف يجب أن يتكون من 10 أرقام ويبدأ بـ 05، 06 أو 07'); return; }

    const finalBarberName = barberNames.filter(bn => bn.trim() !== '').join('، ');

    setSubmitting(true);
    try {
      const sessionId = getOrCreateSessionId();

      const { data: ticket, error } = await supabase.rpc('create_ticket', {
        p_shop_id: shop.id,
        p_name: name.trim(),
        p_phone: phone.trim(),
        p_people: peopleCount,
        p_session_id: sessionId,
        p_barber_name: finalBarberName || null,
      });

      if (error) {
        if (error.message.includes('shop_closed')) toast.error('عذراً — الصالون مغلق حالياً');
        else if (error.message.includes('duplicate_active_ticket')) toast.error('لديك حجز نشط بالفعل');
        else toast.error('فشل في إنشاء التذكرة');
        setSubmitting(false);
        return;
      }

      // create_ticket returns SETOF tickets — first row is the new ticket
      const newTicket = (Array.isArray(ticket) ? ticket[0] : ticket) as Ticket;
      setActiveTicket(newTicket);
      await calculatePeopleAhead(newTicket);

      // Play a sound when successfully booking a ticket
      unlockAudio();
      triggerSystemNotification("تم الحجز بنجاح", `رقم تذكرتك هو #${newTicket.ticket_number}`);
      toast.success('تم إنشاء التذكرة!');
    } catch { toast.error('حدث خطأ غير متوقع'); }
    finally { setSubmitting(false); }
  };

  const handleCancelTicket = async () => {
    if (!activeTicket) return;
    const confirmed = window.confirm('هل أنت متأكد من إلغاء الحجز؟');
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('tickets').update({ status: 'canceled', updated_at: new Date().toISOString() }).eq('id', activeTicket.id);
      if (error) throw error;
      toast.success('تم إلغاء التذكرة');
      setActiveTicket(null);
    } catch { toast.error('فشل إلغاء التذكرة'); }
  };

  // ─── LOADING ───
  if (loading) return (
    <div className="min-h-[100dvh] bg-black flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
    </div>
  );

  // ─── NOT FOUND ───
  if (!shop) return (
    <div className="min-h-[100dvh] bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-10">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-white mb-3">الصالون غير موجود</h2>
        <p className="text-zinc-400 mb-8">الرابط غير صحيح أو الصالون لم يعد متاحاً</p>
        <Button onClick={() => navigate('/')} className="w-full h-12 bg-blue-500 hover:bg-blue-400 text-white font-black rounded-xl">العودة للرئيسية</Button>
      </div>
    </div>
  );

  // ─── CLOSED ─── (extracted component)
  if (!shop.is_open) return <ShopClosedScreen shopName={shop.name} />;

  // ─── ACTIVE TICKET ─── (extracted component)
  if (activeTicket) return (
    <div className="flex flex-col min-h-[100dvh] bg-black">
      {notificationPermission !== 'granted' && (
        <div className="w-full p-4 pb-0 z-10">
          <button
            onClick={requestNotificationPermission}
            className="w-full bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 active:scale-[0.98] transition-all rounded-2xl p-4 flex items-center justify-between text-right group max-w-sm mx-auto"
            dir="rtl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <BellRing className="w-5 h-5 text-yellow-500 animate-pulse" />
              </div>
              <div>
                <p className="font-bold text-yellow-500 text-sm">تفعيل التنبيهات 🔔</p>
                <p className="text-xs text-zinc-400">لنخبرك عندما يقترب دورك تلقائياً</p>
              </div>
            </div>
          </button>
        </div>
      )}
      <div className="flex-1 -mt-4">
        <ActiveTicketCard
          ticket={activeTicket}
          peopleAhead={peopleAhead}
          onCancel={handleCancelTicket}
        />
      </div>
    </div>
  );

  // ─── BOOKING FORM ───
  return (
    <div className="min-h-[100dvh] bg-black p-4 flex flex-col" dir="rtl">
      <div className="w-full max-w-xl mx-auto pt-6 pb-10 flex-1 flex flex-col">

        {/* Shop Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-5">
          <div className="h-1 bg-blue-500 w-full" />
          <div className="p-6 text-center">
            {shop.logo_url
              ? <img src={shop.logo_url} alt={shop.name} className="w-20 h-20 object-contain rounded-xl border border-zinc-700 mx-auto mb-4 p-2 bg-zinc-800" />
              : <div className="w-20 h-20 bg-amber-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20"><Scissors className="w-10 h-10 text-amber-500" /></div>
            }
            <h1 className="text-2xl font-black text-white mb-3">{shop.name}</h1>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {shop.maps_url && (
                <Button variant="ghost" size="sm" onClick={() => window.open(shop.maps_url!, '_blank')}
                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-xl font-bold text-xs">
                  <MapPin className="w-4 h-4 mr-1" /> الموقع
                </Button>
              )}
              {shop.phone && (
                <Button variant="ghost" size="sm" onClick={() => window.open(`tel:${shop.phone}`, '_self')}
                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-xl font-bold text-xs">
                  <Phone className="w-4 h-4 mr-1" /> {shop.phone}
                </Button>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-800 text-center">
              <p className="text-sm font-bold text-zinc-300">
                عدد الأشخاص في الانتظار: <span className="text-amber-500 mx-1 text-lg">{queueCount}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-xl font-black text-white">احجز مكانك</h2>
            <p className="text-zinc-500 text-sm mt-1">انضم لقائمة الانتظار في الصالون</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-zinc-300 text-sm font-bold">
                <User className="w-4 h-4 text-blue-500" /> الاسم الكامل
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="محمد أحمد"
                className="rounded-xl h-12 bg-black border-zinc-700 focus-visible:ring-blue-500 text-white placeholder:text-zinc-600" required />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-zinc-300 text-sm font-bold">
                <Phone className="w-4 h-4 text-blue-500" /> رقم الهاتف
              </Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx"
                className="rounded-xl h-12 bg-black border-zinc-700 focus-visible:ring-blue-500 text-white placeholder:text-zinc-600 text-left"
                dir="ltr" required type="tel" />
            </div>

            {/* People count */}
            <div className="space-y-2 flex items-center justify-between border-t border-zinc-800 pt-4 mt-2">
              <Label className="flex items-center gap-2 text-zinc-300 text-sm font-bold">
                <User className="w-4 h-4 text-amber-500" /> عدد الأشخاص
              </Label>
              <div className="flex bg-black rounded-lg border border-zinc-700 overflow-hidden">
                <button type="button" onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">-</button>
                <div className="w-10 h-10 flex items-center justify-center font-bold text-white border-x border-zinc-700">{peopleCount}</div>
                <button type="button" onClick={() => setPeopleCount(peopleCount + 1)} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">+</button>
              </div>
            </div>

            {/* Barber Names */}
            {peopleCount > 0 && (
              <div className="space-y-3 border-t border-zinc-800 pt-4 mt-2">
                {barberNames.map((barberName, index) => (
                  <div key={index} className="space-y-2">
                    <Label className="flex items-center gap-2 text-zinc-300 text-sm font-bold">
                      <Scissors className="w-4 h-4 text-amber-500" /> {peopleCount > 1 ? `اسم الحلاق (للشخص ${index + 1})` : 'اسم الحلاق (اختياري)'}
                    </Label>
                    <Input
                      value={barberName}
                      onChange={(e) => {
                        const newBarberNames = [...barberNames];
                        newBarberNames[index] = e.target.value;
                        setBarberNames(newBarberNames);
                      }}
                      placeholder="أي حلاق متاح"
                      className="rounded-xl h-12 bg-black border-zinc-700 focus-visible:ring-amber-500 text-white placeholder:text-zinc-600"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Submit */}
            <Button type="submit"
              className="w-full rounded-xl h-14 bg-amber-500 hover:bg-amber-400 text-black font-black text-lg mt-4 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
              disabled={submitting}>
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد الحجز ✂️'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
