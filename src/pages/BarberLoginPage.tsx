import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Profile } from '@/types/database';
import { Loader2, Lock, Mail, Scissors } from 'lucide-react';
import { toast } from 'sonner';

export default function BarberLoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, shop_id, role, full_name, is_active, created_at, updated_at')
        .eq('id', session.user.id)
        .single();
      if (error || !profile) return;
      if ((profile as Profile).role !== 'barber') return;

      const { data: shop } = await supabase.from('shops').select('slug').eq('id', (profile as Profile).shop_id).single();
      if (shop?.slug) navigate(`/barber/${shop.slug}`);
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        return;
      }

      const userId = data.session.user.id;
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, shop_id, role, full_name, is_active, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        toast.error('هذا الحساب غير مُهيأ كحلاق');
        return;
      }

      if ((profile as Profile).role !== 'barber') {
        await supabase.auth.signOut();
        toast.error('هذا الحساب ليس حلاقاً');
        return;
      }

      const { data: shop, error: shopError } = await supabase.from('shops').select('slug').eq('id', (profile as Profile).shop_id).single();
      if (shopError || !shop?.slug) {
        await supabase.auth.signOut();
        toast.error('تعذر تحميل بيانات الصالون');
        return;
      }

      toast.success('تم تسجيل الدخول بنجاح');
      navigate(`/barber/${shop.slug}`);
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
            <Scissors className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">تسجيل دخول الحلاق</h1>
          <p className="text-zinc-500 mt-2 font-medium">واجهة الحلاق للتحكم في التذاكر</p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-[2rem] p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-zinc-300 font-bold mr-1 flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-500" />
                البريد الإلكتروني
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="barber@coiffure.com"
                className="rounded-xl h-14 bg-black/50 border-zinc-800 text-white focus-visible:ring-amber-500 placeholder:text-zinc-600"
                dir="ltr"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300 font-bold mr-1 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                كلمة المرور
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-xl h-14 bg-black/50 border-zinc-800 text-white focus-visible:ring-amber-500 placeholder:text-zinc-600"
                dir="ltr"
                disabled={loading}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl h-14 bg-amber-600 hover:bg-amber-500 text-black font-black text-lg transition-all active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'دخول'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

