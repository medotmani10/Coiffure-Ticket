import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Ticket, Shop } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Scissors, AlertCircle, Loader2, X, User, ArrowDownToLine, BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { unlockAudio } from '@/lib/notificationSound';

export default function TicketStatusPage() {
    const { ticketId } = useParams<{ ticketId: string }>();
    const navigate = useNavigate();

    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [shop, setShop] = useState<Shop | null>(null);
    const [peopleAhead, setPeopleAhead] = useState(0);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // Refs to track if we've already notified to prevent spam
    const notifiedTwoAheadRef = useRef(false);
    const notifiedServingRef = useRef(false);
    const notifiedCompletedRef = useRef(false);

    const { notificationPermission, requestNotificationPermission, triggerSystemNotification } = usePushSubscription(ticket?.id ?? null);
    const [showIOSPrompt, setShowIOSPrompt] = useState(false);

    useEffect(() => {
        if (ticketId) loadTicket();

        // Detect iOS web browser (not standalone PWA)
        const w = window as Window & typeof globalThis & { MSStream?: unknown };
        const nav = navigator as Navigator & { standalone?: boolean };
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !w.MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
        if (isIOS && !isStandalone) {
            setShowIOSPrompt(true);
        }
    }, [ticketId]);

    useEffect(() => {
        if (ticket && (ticket.status === 'waiting' || ticket.status === 'serving')) {
            return subscribeToUpdates();
        }
    }, [ticket?.id, ticket?.status]);

    const loadTicket = async () => {
        if (!ticketId) return;
        try {
            const { data: ticketData, error } = await supabase
                .from('tickets')
                .select('*')
                .eq('id', ticketId)
                .single();

            if (error || !ticketData) { setNotFound(true); setLoading(false); return; }

            const t = ticketData as Ticket;
            setTicket(t);

            // Set initial ref states so we don't trigger old notifications on page load
            if (t.status === 'serving') notifiedServingRef.current = true;
            if (t.status === 'completed') notifiedCompletedRef.current = true;

            // Load shop
            const { data: shopData } = await supabase.from('shops').select('*').eq('id', t.shop_id).single();
            if (shopData) setShop(shopData as Shop);

            // Calculate people ahead
            if (t.status === 'waiting') {
                calculatePeopleAhead(t);
            }
        } catch {
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    };

    const calculatePeopleAhead = async (t: Ticket) => {
        const barberId = (t as Ticket & { barber_id?: string | null }).barber_id;
        if (!barberId) {
            setPeopleAhead(0);
            return;
        }

        const { data, error } = await supabase
            .from('tickets')
            .select('people_count')
            .eq('shop_id', t.shop_id)
            .eq('status', 'waiting')
            .eq('barber_id', barberId)
            .lt('created_at', t.created_at);

        if (!error) {
            const count = (data ?? []).reduce((acc: number, row: { people_count: number | null }) => acc + (row.people_count ?? 1), 0);
            setPeopleAhead(count);

            if (count === 2 && !notifiedTwoAheadRef.current) {
                unlockAudio();
                triggerSystemNotification(
                    "اقترب دورك!",
                    "يوجد شخصين فقط أمامك في الانتظار. يرجى التقدم إلى الصالون."
                );
                notifiedTwoAheadRef.current = true;
            }
        }
    };

    const subscribeToUpdates = () => {
        if (!ticket) return;
        const sub = supabase
            .channel(`ticket_status_${ticket.id}`)
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'tickets',
                filter: `id=eq.${ticket.id}`,
            }, (payload) => {
                const updated = payload.new as Ticket;
                setTicket(updated);

                unlockAudio(); // Try to unlock audio context on database change

                if (updated.status === 'serving' && !notifiedServingRef.current) {
                    triggerSystemNotification("دورك الآن!", "تفضل، حان دورك للحلاقة!");
                    toast.success('🎉 دورك الآن! تفضل بالحلاقة');
                    notifiedServingRef.current = true;
                } else if (updated.status === 'completed' && !notifiedCompletedRef.current) {
                    triggerSystemNotification("نعيماً!", "تم إنهاء الخدمة. شكراً لزيارتك!");
                    toast.info('✅ نعيماً، شكراً لزيارتك!');
                    notifiedCompletedRef.current = true;
                } else if (updated.status === 'canceled') {
                    toast.error('❌ تم إلغاء تذكرتك');
                } else if (updated.status === 'waiting') {
                    calculatePeopleAhead(updated);
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(sub); };
    };

    const handleCancel = async () => {
        if (!ticket) return;
        try {
            const { error } = await supabase
                .from('tickets')
                .update({ status: 'canceled', updated_at: new Date().toISOString() })
                .eq('id', ticket.id);
            if (error) throw error;
            toast.success('تم إلغاء التذكرة');
        } catch {
            toast.error('فشل إلغاء التذكرة');
        }
    };

    const handleNewTicket = () => {
        if (shop) navigate(`/${shop.slug}`);
    };

    // ─── LOADING ───
    if (loading) return (
        <div className="min-h-[100dvh] bg-black flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        </div>
    );

    // ─── NOT FOUND ───
    if (notFound || !ticket || !shop) return (
        <div className="min-h-[100dvh] bg-black flex items-center justify-center p-4">
            <div className="text-center max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-10">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-white mb-3">التذكرة غير موجودة</h2>
                <p className="text-zinc-400 mb-8 text-sm">الرابط غير صحيح أو انتهت صلاحية التذكرة</p>
                <Button onClick={() => navigate('/')} className="w-full h-12 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl">
                    الصفحة الرئيسية
                </Button>
            </div>
        </div>
    );

    const ticketCode = ticket.ticket_number;
    const isActive = ticket.status === 'waiting' || ticket.status === 'serving';
    const isDone = ticket.status === 'completed' || ticket.status === 'canceled';

    return (
        <div className="min-h-[100dvh] bg-black p-4" dir="rtl">
            <div className="w-full max-w-xl mx-auto pt-6 pb-10">

                {/* Shop mini-header */}
                <div className="flex items-center gap-3 mb-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                    {shop.logo_url
                        ? <img src={shop.logo_url} alt={shop.name} className="w-12 h-12 object-contain rounded-xl border border-zinc-700" />
                        : <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shrink-0"><Scissors className="w-6 h-6 text-black" /></div>
                    }
                    <div className="flex-1">
                        <h2 className="font-black text-white text-lg leading-tight">{shop.name}</h2>
                        <p className="text-xs text-zinc-500">تتبع تذكرتك في الوقت الفعلي</p>
                    </div>
                </div>

                {/* iOS PWA Prompt */}
                {showIOSPrompt && (
                    <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex gap-3 text-right">
                        <ArrowDownToLine className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-amber-400 mb-1">تنبيه لمستخدمي آيفون (iOS)</p>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                لتصلك الإشعارات في الخلفية، يرجى الضغط على زر المشاركة (Share) في الأسفل ثم <span className="font-bold text-white">"إضافة للشاشة الرئيسية" (Add to Home Screen)</span> لفتحنا كتطبيق.
                            </p>
                        </div>
                    </div>
                )}

                {/* Notification Request Button */}
                {isActive && notificationPermission !== 'granted' && (
                    <button
                        onClick={requestNotificationPermission}
                        className="w-full mb-6 bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20 active:scale-[0.98] transition-all rounded-2xl p-4 flex items-center justify-between text-right group"
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
                )}

                {/* ─── COMPLETED / CANCELED ─── */}
                {isDone && (
                    <div className="rounded-2xl border-2 border-zinc-700 overflow-hidden mb-6">
                        <div className="h-2 w-full bg-zinc-700" />
                        <div className="bg-zinc-900 p-8 text-center">
                            <div className="text-7xl font-black text-zinc-500 mb-4 tracking-tighter">#{ticketCode}</div>
                            <div className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-black mb-6 ${ticket.status === 'completed'
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                                }`}>
                                {ticket.status === 'completed' ? '✅ اكتملت الحلاقة' : '❌ تم الإلغاء'}
                            </div>

                            <p className="text-zinc-500 text-sm mb-8">
                                {ticket.status === 'completed' ? 'شكراً لثقتكم بنا! نعيماً.' : 'يمكنك حجز موعد جديد في أي وقت.'}
                            </p>
                            <Button onClick={handleNewTicket}
                                className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl border-none">
                                حجز جديد <Scissors className="w-5 h-5 ml-2 inline-block" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* ─── ACTIVE TICKET ─── */}
                {isActive && (
                    <>
                        <div className={`rounded-2xl border-2 overflow-hidden mb-6 ${ticket.status === 'serving' ? 'border-green-500' : 'border-amber-500'}`}>
                            <div className={`h-2 w-full ${ticket.status === 'serving' ? 'bg-green-500' : 'bg-amber-500'}`} />
                            <div className="bg-zinc-900 p-8 text-center">

                                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">رقم تذكرتك</p>
                                <div className={`text-7xl font-black mb-6 tracking-tighter ${ticket.status === 'serving' ? 'text-green-400' : 'text-amber-500'}`}>
                                    #{ticketCode}
                                </div>

                                <div className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-black mb-6 ${ticket.status === 'serving'
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                                    }`}>
                                    <div className={`w-2 h-2 rounded-full animate-pulse ${ticket.status === 'serving' ? 'bg-green-400' : 'bg-amber-500'}`} />
                                    {ticket.status === 'serving' ? 'تفضل، حان دورك للحلاقة' : 'في قائمة الانتظار'}
                                </div>

                                {ticket.status === 'waiting' && (
                                    <div className="bg-black border border-zinc-800 rounded-xl p-6 mb-6">
                                        <p className="text-zinc-500 text-xs font-bold mb-2">أشخاص قبلك في الانتظار</p>
                                        <p className="text-6xl font-black text-white">{peopleAhead}</p>
                                    </div>
                                )}

                                <div className="space-y-3 text-sm text-right bg-black/50 border border-zinc-800 rounded-xl p-5 mb-6">
                                    {[
                                        { icon: <User className="w-4 h-4 text-amber-500" />, label: 'العميل', value: ticket.customer_name },
                                        ...(ticket.barber_name ? [{ icon: <Scissors className="w-4 h-4 text-amber-500" />, label: 'الحلاق', value: ticket.barber_name }] : []),
                                        { icon: <User className="w-4 h-4 text-amber-500" />, label: 'الأشخاص أمامك', value: `${peopleAhead}` },
                                    ].map((row, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 font-black text-white text-right break-words max-w-[150px] sm:max-w-[200px]">{row.value} {row.icon}</div>
                                            <span className="text-zinc-600 text-xs">{row.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Live indicator */}
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-xl py-3 mb-4">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                            النظام متصل ويتحدث تلقائياً
                        </div>

                        {/* Cancel */}
                        {ticket.status === 'waiting' && (
                            <Button onClick={handleCancel} variant="outline"
                                className="w-full rounded-xl h-12 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-bold">
                                <X className="w-4 h-4 mr-2" /> إلغاء الحجز
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
