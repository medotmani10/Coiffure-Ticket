import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Store, LogOut } from 'lucide-react';
import { toast } from 'sonner';

const ADMIN_EMAIL = 'med.otmani5@gmail.com';

interface Shop {
    id: string;
    name: string;
    owner_id: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate('/');
            return;
        }

        if (session.user.email !== ADMIN_EMAIL) {
            toast.error('غير مسموح لك بالدخول لهذه الصفحة');
            await supabase.auth.signOut();
            navigate('/');
            return;
        }

        setUserEmail(session.user.email);
        loadShops();
    };

    const loadShops = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('shops')
            .select('id, name, owner_id, status, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('حدث خطأ في تحميل البيانات');
        } else {
            setShops(data as Shop[]);
        }
        setLoading(false);
    };

    const updateShopStatus = async (shopId: string, newStatus: 'approved' | 'rejected') => {
        const { error } = await supabase
            .from('shops')
            .update({ status: newStatus })
            .eq('id', shopId);

        if (error) {
            toast.error('فشل تحديث حالة المحطة');
        } else {
            toast.success(newStatus === 'approved' ? 'تم قبول المحطة بنجاح' : 'تم رفض المحطة');
            setShops(shops.map(s => s.id === shopId ? { ...s, status: newStatus } : s));
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-8 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                    <div>
                        <h1 className="text-3xl font-black flex items-center gap-3">
                            <Store className="text-blue-500" /> لوحة تحكم الإدارة
                        </h1>
                        <p className="text-zinc-500 mt-1">مرحباً بك: {userEmail}</p>
                    </div>
                    <Button onClick={handleLogout} variant="destructive" className="rounded-xl gap-2">
                        <LogOut className="w-4 h-4" /> تسجيل الخروج
                    </Button>
                </header>

                <div className="bg-black border border-zinc-800 rounded-2xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 text-sm">
                                <th className="p-4 font-bold">اسم المحطة</th>
                                <th className="p-4 font-bold">معرف المالك</th>
                                <th className="p-4 font-bold text-center">الحالة الحالية</th>
                                <th className="p-4 font-bold text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shops.map((shop) => (
                                <tr key={shop.id} className="border-b border-zinc-900 hover:bg-zinc-900/30 transition-colors">
                                    <td className="p-4 font-bold">{shop.name}</td>
                                    <td className="p-4 text-xs text-zinc-500 font-mono">{shop.owner_id}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${shop.status === 'approved' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                shop.status === 'rejected' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                    'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                            }`}>
                                            {shop.status === 'approved' ? 'مقبول' :
                                                shop.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => updateShopStatus(shop.id, 'approved')}
                                                disabled={shop.status === 'approved'}
                                                className="bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg"
                                            >
                                                <CheckCircle className="w-4 h-4" /> قبول
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => updateShopStatus(shop.id, 'rejected')}
                                                disabled={shop.status === 'rejected'}
                                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg"
                                            >
                                                <XCircle className="w-4 h-4" /> رفض
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {shops.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-zinc-500">لا توجد طلبات انضمام حالياً</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
