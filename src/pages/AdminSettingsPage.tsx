import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Shop } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, MapPin, Upload, ArrowRight, Save, Loader2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '@/lib/imageCompression';

export default function AdminSettingsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [shop, setShop] = useState<Shop | null>(null);

    const [shopName, setShopName] = useState('');
    const [mapsUrl, setMapsUrl] = useState('');
    const [shopPhone, setShopPhone] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const [currentUser, setCurrentUser] = useState<any>(null);

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
        } catch (error) {
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
        } catch (error) {
            toast.error('حدث خطأ أثناء تحميل البيانات');
        } finally {
            setLoading(false);
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
        } catch (error) {
            toast.error('حدث خطأ غير متوقع');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-blue-500/80 font-medium">جاري تحميل الإعدادات...</p>
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
                        <h1 className="font-black text-2xl text-white">إعدادات <span className="text-blue-500">النظام</span></h1>
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
                {/* Shop Settings */}
                <Card className="rounded-[2.5rem] border border-zinc-800/80 bg-zinc-950/50 backdrop-blur-xl shadow-2xl overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="border-b border-zinc-800/80 pb-6">
                        <CardTitle className="flex items-center gap-3 text-2xl text-white">
                            <Store className="w-7 h-7 text-blue-500" />
                            معلومات المحطة الأساسية
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8 relative z-10">
                        {/* Logo Upload */}
                        <div className="flex flex-col sm:flex-row items-center gap-8 bg-black/40 p-6 rounded-3xl border border-zinc-800/50">
                            <div className="w-32 h-32 rounded-[2rem] border-2 border-dashed border-zinc-700 flex items-center justify-center overflow-hidden bg-zinc-900/50 relative group/logo">
                                {logoPreview ? (
                                    <>
                                        <img src={logoPreview} alt="Shop Logo" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
                                            <Upload className="w-8 h-8 text-blue-500" />
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
                                className="rounded-2xl h-14 bg-black/50 border-zinc-800 focus-visible:ring-blue-500 focus-visible:border-blue-500/50 text-white placeholder:text-zinc-700 text-lg transition-all hover:border-zinc-700"
                            />
                        </div>

                        <div className="space-y-4">
                            <Label className="text-zinc-300 font-medium text-base ml-2 flex items-center gap-2">
                                رابط خرائط Google
                                <MapPin className="w-4 h-4 text-blue-500" />
                            </Label>
                            <Input
                                value={mapsUrl}
                                onChange={(e) => setMapsUrl(e.target.value)}
                                placeholder="https://maps.google.com/..."
                                className="rounded-2xl h-14 bg-black/50 border-zinc-800 focus-visible:ring-blue-500 focus-visible:border-blue-500/50 text-white placeholder:text-zinc-700 text-lg transition-all hover:border-zinc-700 text-left"
                                dir="ltr"
                            />
                        </div>

                        <div className="space-y-4">
                            <Label className="text-zinc-300 font-medium text-base ml-2 flex items-center gap-2">
                                رقم هاتف المحطة
                                <Smartphone className="w-4 h-4 text-blue-500" />
                            </Label>
                            <Input
                                value={shopPhone}
                                onChange={(e) => setShopPhone(e.target.value)}
                                placeholder="05xxxxxxxx"
                                className="rounded-2xl h-14 bg-black/50 border-zinc-800 focus-visible:ring-blue-500 focus-visible:border-blue-500/50 text-white placeholder:text-zinc-700 text-lg transition-all hover:border-zinc-700 text-left"
                                dir="ltr"
                                type="tel"
                            />
                        </div>

                        <Button
                            onClick={saveShopSettings}
                            disabled={saving}
                            className="w-full rounded-2xl h-16 bg-blue-500 hover:bg-blue-600 text-white text-lg font-black mt-4 shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] border-none"
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
            </div>
        </div>
    );
}
