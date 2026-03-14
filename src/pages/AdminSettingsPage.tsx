import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Profile, Shop } from '@/types/database';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Scissors, MapPin, Upload, ArrowRight, Save, Loader2, Smartphone, Users, UserPlus, Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '@/lib/imageCompression';

export default function AdminSettingsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [shop, setShop] = useState<Shop | null>(null);
    const [barbers, setBarbers] = useState<Profile[]>([]);
    const [barbersLoading, setBarbersLoading] = useState(false);
    const [creatingBarber, setCreatingBarber] = useState(false);
    const [newBarberName, setNewBarberName] = useState('');
    const [newBarberEmail, setNewBarberEmail] = useState('');
    const [newBarberPassword, setNewBarberPassword] = useState('');

    const [shopName, setShopName] = useState('');
    const [mapsUrl, setMapsUrl] = useState('');
    const [shopPhone, setShopPhone] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/');
                return;
            }
            setCurrentUser(session.user);
            await loadShopData(session.user.id);
        } catch {
            toast.error('حدث خطأ أثناء تحميل الحساب');
            setLoading(false);
        }
    };

    const loadShopData = async (userId: string, retries = 3) => {
        try {
            const { data: shopData, error } = await supabase
                .from('shops')
                .select('*')
                .eq('owner_id', userId)
                .single();

            if (error || !shopData) {
                if (retries > 0) {
                    setTimeout(() => loadShopData(userId, retries - 1), 500);
                    return;
                }
                navigate('/onboarding');
                return;
            }

            setShop(shopData as Shop);
            setShopName(shopData.name);
            setMapsUrl(shopData.maps_url || '');
            setShopPhone(shopData.phone || '');
            setLogoPreview(shopData.logo_url);
            loadBarbers(shopData.id);
        } catch {
            toast.error('حدث خطأ أثناء تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const loadBarbers = async (shopId: string) => {
        setBarbersLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, shop_id, role, full_name, is_active, created_at, updated_at')
            .eq('shop_id', shopId)
            .eq('role', 'barber')
            .order('created_at', { ascending: false });
        if (error) {
            toast.error('فشل تحميل قائمة الحلاقين');
            setBarbers([]);
        } else {
            setBarbers((data as Profile[]) || []);
        }
        setBarbersLoading(false);
    };

    const toggleBarberActive = async (barber: Profile) => {
        const next = !barber.is_active;
        const { error } = await supabase
            .from('profiles')
            .update({ is_active: next })
            .eq('id', barber.id);
        if (error) {
            toast.error('فشل تحديث حالة الحلاق');
            return;
        }
        setBarbers((prev) => prev.map((b) => (b.id === barber.id ? { ...b, is_active: next } : b)));
    };

    const createBarber = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shop) return;
        if (!newBarberEmail.trim() || !newBarberPassword.trim()) {
            toast.error('يرجى إدخال البريد الإلكتروني وكلمة المرور');
            return;
        }
        setCreatingBarber(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-barber', {
                body: {
                    shopId: shop.id,
                    email: newBarberEmail.trim(),
                    password: newBarberPassword.trim(),
                    fullName: newBarberName.trim() || null,
                },
            });
            if (error) {
                toast.error('فشل إنشاء حساب الحلاق');
                return;
            }
            if (!data?.success) {
                toast.error('فشل إنشاء حساب الحلاق');
                return;
            }
            toast.success('تم إنشاء حساب الحلاق بنجاح');
            setNewBarberName('');
            setNewBarberEmail('');
            setNewBarberPassword('');
            loadBarbers(shop.id);
        } catch {
            toast.error('حدث خطأ غير متوقع');
        } finally {
            setCreatingBarber(false);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadLogo = async (): Promise<string | null> => {
        if (!logoFile || !currentUser) return null;

        let fileToUpload = logoFile;
        try {
            fileToUpload = await compressImage(logoFile, 0.5, 800);
        } catch (error) {
            console.error('Failed to compress image:', error);
        }

        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('shop-logos')
            .upload(fileName, fileToUpload);

        if (uploadError) {
            toast.error('فشل رفع الشعار');
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('shop-logos')
            .getPublicUrl(fileName);

        return publicUrl;
    };

    const saveShopSettings = async () => {
        if (!shop || !shopName.trim()) {
            toast.error('يرجى إدخال اسم المحطة');
            return;
        }

        setSaving(true);
        try {
            let logoUrl = shop.logo_url;
            if (logoFile) {
                const uploadedUrl = await uploadLogo();
                if (uploadedUrl) logoUrl = uploadedUrl;
            }

            // Generate new slug if name changed
            const slug = shopName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 50);

            const { error } = await supabase
                .from('shops')
                .update({
                    name: shopName.trim(),
                    maps_url: mapsUrl.trim() || null,
                    phone: shopPhone.trim() || null,
                    logo_url: logoUrl,
                    slug: slug !== shop.slug ? slug : shop.slug // only update if different, note: might cause 23505 if slug exists
                })
                .eq('id', shop.id);

            if (error) {
                if (error.code === '23505') {
                    toast.error('اسم المحطة مستخدم بالفعل، يرجى اختيار اسم آخر');
                } else {
                    toast.error('فشل حفظ الإعدادات');
                }
            } else {
                toast.success('تم حفظ إعدادات المحطة بنجاح');
                // Refresh data
                loadData();
            }
        } catch {
            toast.error('حدث خطأ غير متوقع');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                <p className="text-amber-500/80 font-medium">جاري تحميل الإعدادات...</p>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-zinc-950 relative overflow-hidden pb-12">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>

            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-zinc-800 relative mb-8">
                <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="font-black text-2xl text-white">إعدادات <span className="text-amber-500">النظام</span></h1>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/admin')}
                        className="rounded-xl hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors gap-2"
                    >
                        العودة للوحة التحكم
                        <ArrowRight className="w-5 h-5" />
                    </Button>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 relative z-10 space-y-8">
                <Tabs defaultValue="shop" className="w-full">
                    <TabsList className="w-full bg-black/40 border border-zinc-800/80 rounded-2xl p-1 h-12">
                        <TabsTrigger value="shop" className="rounded-xl font-black text-sm data-[state=active]:bg-amber-600 data-[state=active]:text-black">
                            <Scissors className="w-4 h-4" />
                            إعدادات المحطة
                        </TabsTrigger>
                        <TabsTrigger value="barbers" className="rounded-xl font-black text-sm data-[state=active]:bg-amber-600 data-[state=active]:text-black">
                            <Users className="w-4 h-4" />
                            إدارة الحلاقين
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="shop">
                        <Card className="rounded-[2.5rem] border border-zinc-800/80 bg-zinc-950/50 backdrop-blur-xl shadow-2xl overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardHeader className="border-b border-zinc-800/80 pb-6">
                                <CardTitle className="flex items-center gap-3 text-2xl text-white">
                                    <Scissors className="w-7 h-7 text-amber-500" />
                                    معلومات المحطة الأساسية
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8 relative z-10">
                                <div className="flex flex-col sm:flex-row items-center gap-8 bg-black/40 p-6 rounded-3xl border border-zinc-800/50">
                                    <div className="w-32 h-32 rounded-[2rem] border-2 border-dashed border-zinc-700 flex items-center justify-center overflow-hidden bg-zinc-900/50 relative group/logo">
                                        {logoPreview ? (
                                            <>
                                                <img src={logoPreview} alt="Shop Logo" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
                                                    <Upload className="w-8 h-8 text-amber-500" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center text-zinc-500">
                                                <Upload className="w-8 h-8 mb-2 opacity-50" />
                                                <span className="text-xs font-medium">رفع شعار</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-1 text-center sm:text-right">
                                        <h3 className="text-lg font-bold text-white mb-2">شعار المحطة</h3>
                                        <p className="text-zinc-500 text-sm">اختر صورة واضحة ومميزة لمحطتك. يفضل أن تكون بخلفية شفافة (PNG).</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-zinc-300 font-medium text-base ml-2">اسم المحطة</Label>
                                    <Input
                                        value={shopName}
                                        onChange={(e) => setShopName(e.target.value)}
                                        placeholder="اسم المحطة..."
                                        className="rounded-2xl h-14 bg-black/50 border-zinc-800 focus-visible:ring-amber-500 focus-visible:border-amber-500/50 text-white placeholder:text-zinc-700 text-lg transition-all hover:border-zinc-700"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-zinc-300 font-medium text-base ml-2 flex items-center gap-2">
                                        رابط خرائط Google
                                        <MapPin className="w-4 h-4 text-amber-500" />
                                    </Label>
                                    <Input
                                        value={mapsUrl}
                                        onChange={(e) => setMapsUrl(e.target.value)}
                                        placeholder="https://maps.google.com/..."
                                        className="rounded-2xl h-14 bg-black/50 border-zinc-800 focus-visible:ring-amber-500 focus-visible:border-amber-500/50 text-white placeholder:text-zinc-700 text-lg transition-all hover:border-zinc-700 text-left"
                                        dir="ltr"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-zinc-300 font-medium text-base ml-2 flex items-center gap-2">
                                        رقم هاتف المحطة
                                        <Smartphone className="w-4 h-4 text-amber-500" />
                                    </Label>
                                    <Input
                                        value={shopPhone}
                                        onChange={(e) => setShopPhone(e.target.value)}
                                        placeholder="05xxxxxxxx"
                                        className="rounded-2xl h-14 bg-black/50 border-zinc-800 focus-visible:ring-amber-500 focus-visible:border-amber-500/50 text-white placeholder:text-zinc-700 text-lg transition-all hover:border-zinc-700 text-left"
                                        dir="ltr"
                                        type="tel"
                                    />
                                </div>

                                <Button
                                    onClick={saveShopSettings}
                                    disabled={saving}
                                    className="w-full rounded-2xl h-16 bg-amber-500 hover:bg-amber-600 text-white text-lg font-black mt-4 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] border-none"
                                >
                                    {saving ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-6 h-6 mr-3" />
                                            حفظ الإعدادات الأساسية
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="barbers">
                        <Card className="rounded-[2.5rem] border border-zinc-800/80 bg-zinc-950/50 backdrop-blur-xl shadow-2xl overflow-hidden">
                            <CardHeader className="border-b border-zinc-800/80 pb-6">
                                <CardTitle className="flex items-center gap-3 text-2xl text-white">
                                    <Users className="w-7 h-7 text-amber-500" />
                                    إدارة الحلاقين
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 space-y-8">
                                <form onSubmit={createBarber} className="space-y-4 rounded-3xl border border-zinc-800 bg-black/40 p-6">
                                    <div className="flex items-center gap-3 text-white font-black text-lg">
                                        <UserPlus className="w-5 h-5 text-amber-500" />
                                        إضافة حلاق جديد
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-zinc-300 font-bold flex items-center gap-2">
                                                <User className="w-4 h-4 text-amber-500" />
                                                اسم الحلاق
                                            </Label>
                                            <Input
                                                value={newBarberName}
                                                onChange={(e) => setNewBarberName(e.target.value)}
                                                placeholder="مثال: أيوب"
                                                className="rounded-xl h-12 bg-black border-zinc-700 text-white focus-visible:ring-amber-500 placeholder:text-zinc-600"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-zinc-300 font-bold flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-amber-500" />
                                                البريد الإلكتروني
                                            </Label>
                                            <Input
                                                value={newBarberEmail}
                                                onChange={(e) => setNewBarberEmail(e.target.value)}
                                                placeholder="barber@coiffure.com"
                                                className="rounded-xl h-12 bg-black border-zinc-700 text-white focus-visible:ring-amber-500 placeholder:text-zinc-600"
                                                dir="ltr"
                                                type="email"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-zinc-300 font-bold flex items-center gap-2">
                                            <Lock className="w-4 h-4 text-amber-500" />
                                            كلمة المرور
                                        </Label>
                                        <Input
                                            value={newBarberPassword}
                                            onChange={(e) => setNewBarberPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="rounded-xl h-12 bg-black border-zinc-700 text-white focus-visible:ring-amber-500 placeholder:text-zinc-600"
                                            dir="ltr"
                                            type="password"
                                            required
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={creatingBarber}
                                        className="w-full rounded-xl h-14 bg-amber-600 hover:bg-amber-500 text-black font-black text-lg transition-all active:scale-[0.98]"
                                    >
                                        {creatingBarber ? <Loader2 className="w-6 h-6 animate-spin" /> : 'إنشاء حساب الحلاق'}
                                    </Button>
                                </form>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-white font-black text-lg">قائمة الحلاقين</div>
                                        <Button
                                            variant="ghost"
                                            onClick={() => shop && loadBarbers(shop.id)}
                                            className="rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900"
                                            disabled={barbersLoading}
                                        >
                                            {barbersLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'تحديث'}
                                        </Button>
                                    </div>

                                    {barbersLoading ? (
                                        <div className="flex items-center justify-center py-10">
                                            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                                        </div>
                                    ) : barbers.length === 0 ? (
                                        <div className="rounded-3xl border border-dashed border-zinc-800 bg-black/30 p-10 text-center text-zinc-500 font-semibold">
                                            لا يوجد حلاقين بعد
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {barbers.map((b) => (
                                                <div key={b.id} className="rounded-2xl border border-zinc-800 bg-black/40 p-4 flex items-center justify-between">
                                                    <div className="min-w-0">
                                                        <div className="text-white font-black truncate">
                                                            {b.full_name?.trim() || 'حلاق'}
                                                        </div>
                                                        <div className="text-xs text-zinc-500 font-mono truncate">{b.id}</div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={b.is_active ? 'text-green-400 text-xs font-bold' : 'text-zinc-500 text-xs font-bold'}>
                                                            {b.is_active ? 'نشط' : 'غير نشط'}
                                                        </span>
                                                        <Switch checked={b.is_active} onCheckedChange={() => toggleBarberActive(b)} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
