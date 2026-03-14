import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Scissors, ShieldCheck, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const ADMIN_EMAIL = 'med.otmani5@gmail.com';

export default function SuperAdminLogin() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        // Check if already logged in as super admin
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session && session.user.email === ADMIN_EMAIL) {
                navigate('/admin');
            }
        });
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
            return;
        }

        if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
            toast.error('عذراً، هذا الحساب غير مصرح له بالدخول للوحة الإدارة العامة');
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
            } else if (data.session) {
                toast.success('تم تسجيل الدخول بنجاح');
                navigate('/admin');
            }
        } catch (error) {
            toast.error('حدث خطأ غير متوقع');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-black text-white p-4 relative overflow-hidden flex items-center selection:bg-amber-500/30">
            {/* Background patterns */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 to-yellow-600" />
                <div className="absolute top-10 left-10 w-96 h-96 bg-amber-600/10 rounded-full blur-[100px] opacity-30" />
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] opacity-30" />
            </div>

            <div className="max-w-md mx-auto w-full relative z-10">
                <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(217,119,6,0.3)] mb-6 animate-in zoom-in duration-500">
                        <Scissors className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Coiffure <span className="text-amber-500">Control</span></h1>
                    <p className="text-zinc-500 mt-2 font-medium">نظام المراقبة المركزية</p>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl relative animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                    <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-zinc-400 font-bold mr-1 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-amber-500" />
                                البريد الإلكتروني
                            </Label>
                            <div className="relative group">
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@coiffureticket.com"
                                    className="rounded-2xl h-14 bg-black/50 border-zinc-800 text-white focus-visible:ring-amber-500 focus-visible:border-amber-500 pl-4 pr-4 transition-all"
                                    dir="ltr"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-zinc-400 font-bold mr-1 flex items-center gap-2">
                                <Lock className="w-4 h-4 text-amber-500" />
                                كلمة المرور
                            </Label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="rounded-2xl h-14 bg-black/50 border-zinc-800 text-white focus-visible:ring-amber-500 focus-visible:border-amber-500 px-4 tracking-widest text-lg transition-all"
                                dir="ltr"
                                disabled={loading}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full rounded-2xl h-14 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white text-lg font-black mt-8 shadow-[0_10px_20px_rgba(217,119,6,0.15)] transition-all hover:scale-[1.02] group"
                            disabled={loading || !email || !password}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>جاري التحقق...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span>تسجيل الدخول الدخول</span>
                                    <ArrowRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
                                </div>
                            )}
                        </Button>
                    </form>
                </div>

                <p className="text-center text-zinc-600 text-xs mt-10 font-medium flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    منطقة محظورة: الدخول للمصرح لهم فقط
                </p>
            </div>
        </div>
    );
}
