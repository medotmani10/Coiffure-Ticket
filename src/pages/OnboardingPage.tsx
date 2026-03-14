import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Store, MapPin, Smartphone, Check, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '@/lib/imageCompression';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/');
      return;
    }
    setCurrentUser(session.user);

    // Check if shop already exists
    const { data: shop } = await supabase
      .from('shops')
      .select('slug')
      .eq('owner_id', session.user.id)
      .single();

    if (shop) {
      navigate('/admin');
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

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
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

  const handleSubmit = async () => {
    if (!shopName.trim()) {
      toast.error('يرجى إدخال اسم المحطة');
      return;
    }
    if (!currentUser) {
      toast.error('يرجى تسجيل الدخول أولاً');
      navigate('/');
      return;
    }

    setLoading(true);

    try {
      // Upload logo if exists
      let logoUrl = null;
      if (logoFile) {
        logoUrl = await uploadLogo();
      }

      // Create shop
      const slug = generateSlug(shopName);
      const { error: shopError } = await supabase
        .from('shops')
        .insert({
          owner_id: currentUser.id,
          slug,
          name: shopName,
          logo_url: logoUrl,
          maps_url: mapsUrl || null,
          phone: shopPhone || null,
          is_open: true,
        });

      if (shopError) {
        if (shopError.code === '23505') {
          toast.error('اسم المحطة مستخدم بالفعل، يرجى اختيار اسم آخر');
        } else {
          toast.error('فشل إنشاء المحطة');
        }
        setLoading(false);
        return;
      }

      toast.success('تم إنشاء المحطة بنجاح!');
      navigate('/admin');
    } catch {
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white p-4 relative overflow-hidden flex items-center selection:bg-amber-500/30">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-amber-600" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-600/10 rounded-full blur-[100px] opacity-50" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-600/5 rounded-full blur-[100px] opacity-30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/40 via-transparent to-transparent opacity-50" />
      </div>

      <div className="max-w-xl mx-auto w-full relative z-10 py-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(217,119,6,0.3)] mb-6 animate-in zoom-in duration-500">
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Coiffure <span className="text-amber-500">Ticket</span></h1>
          <p className="text-zinc-500 mt-2 font-medium">ابدأ رحلة محطتك الرقمية الآن</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] shadow-2xl overflow-hidden relative animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

          <div className="p-8 sm:p-10 space-y-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                معلومات المحطة
              </h2>
              <p className="text-zinc-500 text-sm font-medium">
                أدخل التفاصيل الأساسية لإنشاء هويتك الرقمية
              </p>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-zinc-400 font-bold mr-1">
                <Store className="w-4 h-4 text-amber-500" />
                اسم المحطة
              </Label>
              <Input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="مثال: صالون الحلاقة الأنيق"
                className="rounded-2xl h-14 bg-black/50 border-zinc-800 text-white focus-visible:ring-amber-500 placeholder:text-zinc-600 text-lg"
              />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-zinc-400 font-bold mr-1">
                <MapPin className="w-4 h-4 text-amber-500" />
                رابط خرائط Google (اختياري)
              </Label>
              <Input
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/..."
                className="rounded-2xl h-14 bg-black/50 border-zinc-800 text-white focus-visible:ring-amber-500 placeholder:text-zinc-600 text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-zinc-400 font-bold mr-1">
                <Smartphone className="w-4 h-4 text-amber-500" />
                رقم هاتف المحطة (اختياري)
              </Label>
              <Input
                value={shopPhone}
                onChange={(e) => setShopPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                className="rounded-2xl h-14 bg-black/50 border-zinc-800 text-white focus-visible:ring-amber-500 placeholder:text-zinc-600 text-left"
                dir="ltr"
                type="tel"
              />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-zinc-400 font-bold mr-1">
                <Upload className="w-4 h-4 text-amber-500" />
                شعار المحطة (اختياري)
              </Label>
              <div className="flex items-center gap-4">
                <label className="flex-1 group">
                  <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 text-center cursor-pointer hover:border-amber-500/50 hover:bg-amber-500/5 transition-all bg-black/50">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="w-24 h-24 object-contain mx-auto rounded-xl" />
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-amber-500/10 group-hover:text-amber-500 transition-colors border border-zinc-800 group-hover:border-amber-500/20">
                          <Upload className="w-8 h-8 text-zinc-500 group-hover:text-amber-500 transition-colors" />
                        </div>
                        <span className="text-sm text-zinc-500 font-medium tracking-wide">اضغط لاختيار صورة الشعار</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full rounded-2xl h-16 bg-amber-600 hover:bg-amber-500 text-white text-xl font-black mt-8 shadow-[0_10px_20px_rgba(217,119,6,0.15)] transition-all hover:scale-[1.02]"
              disabled={!shopName.trim() || loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <span className="animate-pulse">جاري التجهيز...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  إنشاء المحطة
                  <Check className="w-6 h-6 mr-1" />
                </div>
              )}
            </Button>
          </div>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-10 font-medium">
          خطوة واحدة تفصلك عن نظام إدارة احترافي 💧
        </p>
      </div>
    </div>
  );
}
