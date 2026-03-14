import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scissors, Loader2, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            checkShopExists(session.user.id);
        }
    };

    const checkShopExists = async (userId: string) => {
        const { data: shop } = await supabase.from('shops').select('slug').eq('owner_id', userId).single();
        if (shop) navigate('/admin');
        else navigate('/onboarding');
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (isLogin) {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                if (error.message === 'Invalid login credentials') {
                    toast.error('البريد أو كلمة المرور غير صحيحة');
                } else toast.error(error.message);
            } else {
                toast.success('تم تسجيل الدخول');
                // onAuthStateChange in App or here will handle redirect
                const { data: { user } } = await supabase.auth.getUser();
                if (user) checkShopExists(user.id);
            }
        } else {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
            if (signUpError) {
                if (signUpError.message.toLowerCase().includes('rate') || signUpError.status === 429) {
                    toast.error('تم تجاوز حد التسجيل المسموح به مؤقتاً. انتظر بضع دقائق وحاول مجدداً.');
                } else {
                    toast.error(signUpError.message);
                }
            } else if (signUpData.user) {
                // Auto sign-in after sign-up (email confirmation disabled in Supabase)
                const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) {
                    toast.error('تم إنشاء الحساب. ' + signInError.message);
                } else if (signInData.user) {
                    toast.success('تم إنشاء الحساب وتسجيل الدخول بنجاح');
                    checkShopExists(signInData.user.id);
                }
            }
        }
        setLoading(false);
    };

    return (
        <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-600" />
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-600/5 rounded-full blur-3xl" />

            <div className="w-full max-w-md space-y-8 relative z-10">
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center">
                            <Scissors className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-white">Coiffure <span className="text-amber-500">Station</span></h1>
                    </div>
                    <p className="text-zinc-500 mt-2 font-medium">نظام إدارة صالونات الحلاقة</p>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 p-8 rounded-[2rem] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex gap-1 p-1 bg-black/50 rounded-xl border border-zinc-800 mb-8">
                        <button
                            type="button"
                            onClick={() => setIsLogin(true)}
                            className={`flex-1 h-10 rounded-lg text-sm font-black transition-all ${isLogin ? 'bg-amber-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            تسجيل الدخول
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsLogin(false)}
                            className={`flex-1 h-10 rounded-lg text-sm font-black transition-all ${!isLogin ? 'bg-amber-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            حساب جديد
                        </button>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-zinc-300 text-sm font-bold mr-1">البريد الإلكتروني</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@coiffure.com"
                                className="rounded-xl h-14 bg-black/50 border-zinc-800 focus-visible:ring-amber-500 text-white placeholder:text-zinc-600 text-lg"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-300 text-sm font-bold mr-1">كلمة المرور</Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="rounded-xl h-14 bg-black/50 border-zinc-800 focus-visible:ring-amber-500 text-white text-lg"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl h-14 bg-amber-600 hover:bg-amber-500 text-white font-black text-lg transition-all hover:scale-[1.02] shadow-[0_10px_20px_rgba(217,119,6,0.15)] mt-4"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    {isLogin ? 'دخول للنظام' : 'إنشاء الحساب الآن'}
                                    <ChevronLeft className="w-5 h-5 mr-1" />
                                </div>
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-zinc-600 text-sm mt-8">
                        {isLogin ? 'ليس لديك حساب؟ ' : 'لديك حساب؟ '}
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-amber-500 font-bold hover:text-amber-400 transition-colors"
                        >
                            {isLogin ? 'سجل الآن' : 'سجل الدخول'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
