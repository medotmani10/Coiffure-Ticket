import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Scissors, Clock, User, Shield, ChevronLeft, Smartphone, Navigation, CheckCircle, Download } from 'lucide-react';

function useCountUp(end: number, duration: number, start: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, start]);
  return count;
}

export default function LandingPage() {
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleAppDownload = () => {
    window.location.href = 'https://admin-lavageticket.vercel.app';
  };

  const stat1 = useCountUp(500, 2000, statsVisible);
  const stat2 = useCountUp(98, 1800, statsVisible);
  const stat3 = useCountUp(30, 1500, statsVisible);

  const features = [
    {
      icon: <Clock className="w-7 h-7 text-amber-500" />,
      title: 'لا انتظار بلا هدف',
      description: 'زبونك يعرف دوره للحلاقة بالضبط قبل ما يوصل الصالون. لا طوابير طويلة تزعج الزبائن.'
    },
    {
      icon: <User className="w-7 h-7 text-amber-500" />,
      title: 'تنظيم طابور الزبائن',
      description: 'نظم طابور انتظار الزبائن بذكاء وسهولة عبر نظام رقمي.'
    },
    {
      icon: <Smartphone className="w-7 h-7 text-amber-500" />,
      title: 'كل شيء من الهاتف',
      description: 'الزبون يحجز من هاتفه ويتتبع دوره بدون تطبيق. رابط واحد يكفي.'
    },
    {
      icon: <Shield className="w-7 h-7 text-amber-500" />,
      title: 'بياناتك محفوظة',
      description: 'كل شيء مشفر وآمن. معلومات صالونك وزبائنك محمية 24/7.'
    },
    {
      icon: <Navigation className="w-7 h-7 text-amber-500" />,
      title: 'زبائنك يلقونك',
      description: 'أضف موقع الصالون وزبائنك يوصلون بسهولة. لا تفوت أي عميل.'
    },
    {
      icon: <CheckCircle className="w-7 h-7 text-amber-500" />,
      title: 'ابدأ اليوم مجاناً',
      description: 'سجل ودشن صالونك في دقيقتين بدون الحاجة لبطاقة بنكية.'
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-black text-white selection:bg-amber-500/30 font-sans">

      {/* ─── HEADER ─── */}
      <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-[4.5rem] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center">
              <Scissors className="w-5 h-5 text-black" />
            </div>
            <span className="font-black text-xl tracking-tight text-white">Coiffure<span className="text-amber-500">Ticket</span></span>
          </div>

          <Button
            onClick={handleAppDownload}
            className="rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-black border-none flex items-center gap-2 text-sm px-4 h-10"
          >
            <Download className="w-4 h-4" />
            تحميل النظام
          </Button>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative min-h-[100dvh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0 bg-zinc-900 border-b border-zinc-800">
          {/* We'll just keep a gradient or minimal visual since the image might be removed/replaced later */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-950" />
        </div>

        {/* side stripe */}
        <div className="absolute right-0 top-0 w-1 h-full bg-amber-600 z-10" />

        <div className="max-w-6xl mx-auto px-4 pt-24 pb-12 relative z-10 w-full" dir="rtl">
          <div className="max-w-2xl space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-2 text-amber-500 text-sm font-bold">
              <Scissors className="w-4 h-4" />
              Coiffure Ticket — الحل الرقمي لصالونات الحلاقة
            </div>

            <h1 className="text-5xl md:text-7xl font-black leading-[1] tracking-tight">
              ادر صالونك<br />
              <span className="text-amber-500">بدون فوضى.</span>
            </h1>

            <p className="text-lg md:text-xl text-zinc-300 leading-relaxed max-w-lg border-r-2 border-amber-500 pr-5">
              نظام رقمي لقوائم الانتظار — زبائنك يعرفون دورهم للحلاقة من هواتفهم، وأنت تنظم الطابور من شاشة واحدة.
            </p>

            {/* Stats inline */}
            <div className="flex gap-8 pt-2">
              {[
                { label: 'صالون يستخدم المنصة', value: '+500' },
                { label: 'رضا أصحاب الصالونات', value: '98%' },
                { label: 'دقيقة للتسجيل', value: '< 2' },
              ].map((s, i) => (
                <div key={i}>
                  <div className="text-2xl font-black text-amber-500">{s.value}</div>
                  <div className="text-xs text-zinc-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button size="lg"
                onClick={handleAppDownload}
                className="rounded-xl h-14 px-8 bg-amber-600 hover:bg-amber-500 text-black font-black text-lg transition-all hover:scale-105">
                تنزيل النظام
                <ChevronLeft className="w-5 h-5 mr-1" />
              </Button>

              <Button variant="outline" size="lg"
                className="rounded-xl h-14 px-8 text-lg border-zinc-600 text-zinc-200 bg-white/5 hover:bg-white/10 hover:border-zinc-400 transition-all"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                كيف يعمل؟
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── IMAGE / SOCIAL PROOF BAND ─── */}
      <section className="relative overflow-hidden border-y border-zinc-800 bg-zinc-950">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/70 flex items-end">
          <div className="max-w-6xl mx-auto px-4 pb-10 pt-10 w-full" dir="rtl">
            <div ref={statsRef} className="grid grid-cols-3 gap-6 max-w-3xl">
              {[
                { num: stat1, suffix: '+', label: 'صالون نشط' },
                { num: stat2, suffix: '%', label: 'رضا المستخدمين' },
                { num: stat3, suffix: 'ث', label: 'متوسط الاستجابة' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-4xl md:text-5xl font-black text-amber-500">
                    {s.num}{s.suffix}
                  </div>
                  <div className="text-sm text-zinc-300 mt-2 font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-4" dir="rtl">
          <div className="mb-12">
            <p className="text-amber-500 font-bold tracking-widest uppercase text-sm mb-3">آلية العمل</p>
            <h2 className="text-4xl md:text-5xl font-black text-white">3 خطوات <span className="text-amber-500">فقط</span></h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'اشترك الآن', desc: 'اشترك في نظام Coiffure Ticket وأنشئ حساب صالونك في دقيقتين.' },
              { step: '02', title: 'شارك الرابط', desc: 'كل صالون حلاقة يحصل على رابط خاص. يمكن للزبائن مسح الرمز أو الضغط على الرابط.' },
              { step: '03', title: 'نظم الطابور', desc: 'تابع طابور الزبائن، نادِ الحالات التالية بكل سهولة عبر شاشة الإدارة.' },
            ].map((item, i) => (
              <div key={i} className="relative group">
                <div className="p-8 border border-zinc-800 rounded-2xl hover:border-amber-500/50 transition-all duration-300 hover:bg-zinc-900 h-full">
                  <div className="text-6xl font-black text-zinc-800 group-hover:text-amber-500/20 transition-colors select-none mb-4">{item.step}</div>
                  <h3 className="text-xl font-black text-white mb-3">{item.title}</h3>
                  <p className="text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
                {i < 2 && <div className="hidden md:block absolute top-1/2 -left-3 w-6 h-0.5 bg-amber-500 z-10" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-20 bg-black">
        <div className="max-w-6xl mx-auto px-4" dir="rtl">
          <div className="mb-12">
            <p className="text-amber-500 font-bold tracking-widest uppercase text-sm mb-3">المميزات</p>
            <h2 className="text-4xl md:text-5xl font-black text-white">تحكم تام<br /><span className="text-amber-500">في طابور صالونك</span></h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <div key={i} className="group p-7 bg-zinc-950 border border-zinc-800 rounded-2xl hover:border-amber-500/40 hover:bg-zinc-900 transition-all duration-300 cursor-default">
                <div className="w-14 h-14 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-amber-500/20 group-hover:scale-110 transition-all duration-300">
                  {feature.icon}
                </div>
                <h3 className="font-black text-xl text-white mb-3 group-hover:text-amber-400 transition-colors">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="py-20 bg-amber-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-black text-black mb-4">
            صالونك يستاهل الأفضل.
          </h2>
          <p className="text-black/80 text-xl mb-10 max-w-2xl mx-auto font-bold">
            سجل الآن ودشن نظام الانتظار المطور لصالونك، وابدأ بتقديم خدمة متميزة بلا زحام.
          </p>

          <Button size="lg"
            onClick={handleAppDownload}
            className="rounded-xl h-16 px-12 text-xl bg-black text-amber-500 font-black hover:bg-zinc-900 transition-all hover:scale-105 border-none flex items-center gap-3 mx-auto shadow-[0_0_40px_rgba(245,158,11,0.3)]">
            <Download className="w-6 h-6" />
            تحميل النظام
          </Button>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-10 bg-black border-t border-zinc-900 text-center text-zinc-600">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-600 rounded-lg flex items-center justify-center">
              <Scissors className="w-4 h-4 text-black" />
            </div>
            <span className="font-black text-white text-lg">Coiffure Ticket</span>
          </div>
          <p className="text-sm">© 2024 Coiffure Ticket. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
}
