import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Scissors, Settings, Smartphone, Download, Activity, Clock, Shield, BarChart3, ChevronLeft, Menu, X } from 'lucide-react';

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleAppDownload = () => {
    window.location.href = 'https://admin-coiffureticket.vercel.app';
  };

  const features = [
    {
      icon: <Activity className="w-5 h-5 text-amber-500" />,
      title: 'تنظيم طابور متقدم',
      description: 'نظام رقمي ذكي لتنظيم دور زبائنك بدقة ومتابعة المواعيد بدون أخطاء.'
    },
    {
      icon: <Clock className="w-5 h-5 text-amber-500" />,
      title: 'متابعة الوقت الحي',
      description: 'الزبون يعرف دوره بالضبط قبل ما يوصل للصالون ولا حاجة للانتظار الطويل.'
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-amber-500" />,
      title: 'إحصائيات وأداء',
      description: 'احصل على تقارير دورية تظهر أداء صالونك وتحسن من سرعة العمل.'
    },
    {
      icon: <Smartphone className="w-5 h-5 text-amber-500" />,
      title: 'كل شيء من الهاتف',
      description: 'الزبون يحجز من هاتفه ويتتبع دوره بدون الحاجة لتثبيت أي تطبيق إضافي.'
    },
    {
      icon: <Shield className="w-5 h-5 text-amber-500" />,
      title: 'أمان وتشفير عالي',
      description: 'بيانات صالونك وزبائنك محمية بالكامل بتقنيات تشفير متطورة.'
    },
    {
      icon: <Settings className="w-5 h-5 text-amber-500" />,
      title: 'سهولة التحكم والتعديل',
      description: 'لوحة تحكم بسيطة تتيح لك إدارة الخدمات والأسعار من أي مكان.'
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-black text-white selection:bg-amber-500/30 font-sans overflow-x-hidden">

      {/* ─── HEADER ─── */}
      <header className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-xl border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between" dir="rtl">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center">
              <Scissors className="w-5 h-5 text-black" />
            </div>
            <span className="font-black text-xl tracking-tight text-white uppercase font-outfit">Coiffure<span className="text-amber-500">Ticket</span></span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex flex-1 justify-center">
            <ul className="flex flex-row items-center gap-8 text-sm font-semibold text-zinc-300">
              <li><a href="#features" className="hover:text-amber-400 transition-colors">الميزات</a></li>
              <li><a href="#how" className="hover:text-amber-400 transition-colors">آلية العمل</a></li>
              <li><a href="#faq" className="hover:text-amber-400 transition-colors">الأسئلة الشائعة</a></li>
            </ul>
          </nav>

          {/* Action Button */}
          <div className="hidden md:flex items-center gap-4">
            <Button
              onClick={handleAppDownload}
              className="rounded-full bg-amber-600 hover:bg-amber-500 text-black font-black border-none flex items-center gap-2 text-sm px-6 h-11"
            >
              <Download className="w-4 h-4" />
              سجل الآن صالونك
            </Button>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden text-zinc-300 hover:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-zinc-950 border-b border-zinc-900 absolute top-20 left-0 w-full px-4 py-4 flex flex-col gap-4 text-center z-40">
            <a href="#features" className="py-2 text-zinc-300 hover:text-amber-500 font-semibold" onClick={() => setIsMobileMenuOpen(false)}>الميزات</a>
            <a href="#how" className="py-2 text-zinc-300 hover:text-amber-500 font-semibold" onClick={() => setIsMobileMenuOpen(false)}>آلية العمل</a>
            <a href="#faq" className="py-2 text-zinc-300 hover:text-amber-500 font-semibold" onClick={() => setIsMobileMenuOpen(false)}>الأسئلة الشائعة</a>
            <Button
              onClick={() => { handleAppDownload(); setIsMobileMenuOpen(false); }}
              className="rounded-full w-full bg-amber-600 text-black font-black mt-2 h-12"
            >
              سجل صالونك
            </Button>
          </div>
        )}
      </header>

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-24 md:pt-48 md:pb-32 overflow-hidden bg-gradient-to-b from-zinc-900 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-12 md:gap-8" dir="rtl">

            {/* Text Content */}
            <div className="flex-[1.2] space-y-8 text-right">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight text-white">
                الحل الشامل لإدارة <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-400 to-amber-600">
                  صالون حلاقة
                </span> عصري.
              </h1>
              <p className="text-lg md:text-xl text-zinc-400 leading-relaxed max-w-lg">
                نظام حجز وتنظيم طابور رقمي يجعلك تتحكم بمواعيد زبائنك بكل يسر. قل وداعاً للانتظار الطويل والفوضى في صالونك.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg"
                  onClick={handleAppDownload}
                  className="rounded-full h-14 px-8 bg-amber-600 hover:bg-amber-500 text-black font-black text-lg transition-all shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_8px_30px_rgba(245,158,11,0.5)]">
                  ابدأ الاستخدام مجاناً
                  <ChevronLeft className="w-5 h-5 mr-1" />
                </Button>
                <Button variant="outline" size="lg"
                  className="rounded-full h-14 px-8 text-lg border-zinc-700 text-white bg-transparent hover:bg-white/5 hover:text-amber-500 transition-all font-semibold"
                  onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>
                  كيف يعمل النظام؟
                </Button>
              </div>

              {/* Mini Reviews */}
              <div className="pt-6 flex items-center gap-4">
                <div className="flex -space-x-2 -space-x-reverse">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-zinc-800" />
                  ))}
                </div>
                <div className="text-sm">
                  <div className="flex pb-1">
                    {[1, 2, 3, 4, 5].map((s) => <span key={s} className="text-amber-500 text-xs">★</span>)}
                  </div>
                  <span className="font-bold text-white">4.8/5</span> <span className="text-zinc-500">صالونات الحلاقة</span>
                </div>
              </div>
            </div>

            {/* Visual/Image Mockup placeholder */}
            <div className="flex-1 relative w-full max-w-md mx-auto aspect-[4/5] md:aspect-auto md:h-[600px] flex items-center justify-center">

              <div className="absolute inset-x-0 bottom-0 top-1/2 bg-amber-500/10 blur-[100px] rounded-full z-0 pointer-events-none" />

              {/* Premium Phone Placeholder */}
              <div className="relative z-10 w-[280px] h-[580px] bg-zinc-950 rounded-[3rem] border-4 border-zinc-800 shadow-2xl p-2 mx-auto">
                <div className="w-full h-full rounded-[2.5rem] bg-black border border-zinc-800 overflow-hidden relative">
                  {/* App UI Fake Header */}
                  <div className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-end px-6 pb-3">
                    <div className="text-lg font-bold text-white display-flex gap-2"><Scissors className="w-4 inline text-amber-500" /> Coiffure Apps</div>
                  </div>
                  {/* Fake content */}
                  <div className="p-4 space-y-4">
                    <div className="h-32 bg-zinc-900 rounded-2xl p-4 flex flex-col justify-center">
                      <span className="text-xs text-zinc-500">التذكرة الحالية</span>
                      <div className="text-5xl font-black text-amber-500">24</div>
                    </div>
                    <div className="h-16 bg-zinc-900 rounded-xl" />
                    <div className="h-16 bg-zinc-900 rounded-xl" />
                  </div>
                  {/* Fake Fab */}
                  <div className="absolute bottom-6 right-6 w-14 h-14 bg-amber-600 rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 bg-black rounded-sm" />
                  </div>
                </div>
              </div>

              {/* Floating Stat card */}
              <div className="absolute bottom-12 -left-8 md:-left-12 bg-zinc-900/90 backdrop-blur border border-zinc-800 p-4 rounded-2xl shadow-xl z-20 flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500 font-black">72</div>
                <div>
                  <div className="text-white font-bold text-sm">متوسط الخدمة</div>
                  <div className="text-zinc-400 text-xs text-right">أسبوعياً</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── TRUST BAR ─── */}
      <section className="border-y border-zinc-900 bg-zinc-950/50 py-10 relative z-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4" dir="rtl">
          <h3 className="text-zinc-400 font-medium text-lg text-center md:text-right w-full md:w-auto">
            موثوق من قبل أكثر من <span className="font-bold text-white">500+</span> صالون في جميع أنحاء الوطن العربي منذ 2024
          </h3>
          <div className="flex items-center gap-8 text-center md:text-left">
            <div>
              <div className="text-3xl font-black text-white">4.9</div>
              <div className="flex text-amber-500 text-xs my-0.5 justify-center">★★★★★</div>
              <div className="text-xs text-zinc-500">التقييم العام</div>
            </div>
            <div className="w-px h-10 bg-zinc-800" />
            <div>
              <div className="text-3xl font-black text-white">1.5M</div>
              <div className="flex text-amber-500 text-xs my-0.5 justify-center">★★★★★</div>
              <div className="text-xs text-zinc-500">حجز ناجح</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section id="features" className="py-24 bg-black relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" dir="rtl">

          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              رفيقك المثالي لإدارة طابورك
            </h2>
            <p className="text-zinc-400">
              كل ما تحتاجه للارتقاء بصالون الحلاقة في مكان واحد وتصميم بسيط يسهل استخدامه من اليوم الأول.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-x-12 gap-y-12">
            {features.map((feature, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white mb-2">{feature.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── SHOWCASE 1 ─── */}
      <section id="how" className="py-24 bg-zinc-950 border-t border-zinc-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" dir="rtl">
          <div className="flex flex-col md:flex-row items-center gap-16">

            <div className="flex-1 w-full order-2 md:order-1 relative">
              <div className="relative bg-black rounded-3xl border border-zinc-800 p-8 flex items-center justify-center min-h-[400px]">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/5 to-transparent rounded-3xl" />

                <div className="relative z-10 flex gap-4 items-center">
                  {/* Fake device 1 */}
                  <div className="w-32 h-64 bg-zinc-900 rounded-2xl border-4 border-zinc-800 flex items-center justify-center p-2 relative shadow-2xl">
                    <div className="w-16 h-16 rounded-full border-[6px] border-amber-500 flex items-center justify-center text-white font-bold text-xl">
                      28
                    </div>
                  </div>
                  {/* Fake device 2 */}
                  <div className="w-24 h-24 bg-zinc-800 rounded-3xl border border-zinc-700 flex flex-col justify-center items-center shadow-xl -ml-8 mt-16 z-20">
                    <span className="text-xs text-zinc-400">الأرباح</span>
                    <span className="text-amber-500 font-bold">120K</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-8 order-1 md:order-2">
              <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
                تزامن، تتبع، وابقَ على اتصال <br className="hidden lg:block" />
                <span className="text-amber-500">الكل في مكان واحد.</span>
              </h2>
              <p className="text-zinc-400 text-lg">
                وفر وقتك وتتبع أداء صالونك من لوحة معلومات متطورة تقدم لك تحليلاً دقيقاً وتساعدك في توجيه صالونك نحو الأفضل بشكل مستمر.
              </p>

              <ul className="space-y-4">
                {[
                  'خيارات مخصصة للإدارة',
                  'التنبيهات اللحظية عبر النظام',
                  'حجز يومي وأسبوعي'
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-white font-medium">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">✓</div>
                    {item}
                  </li>
                ))}
              </ul>

              <Button className="rounded-full mt-4 bg-white text-black hover:bg-zinc-200 h-12 px-8 font-bold">
                اكتشف المزيد
              </Button>
            </div>

          </div>
        </div>
      </section>

      {/* ─── SHOWCASE 2 ─── */}
      <section className="py-24 bg-black border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" dir="rtl">
          <div className="flex flex-col md:flex-row items-center gap-16">

            <div className="flex-1 space-y-6">
              <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
                أفضل أداء لصالونك<br />
                يبدأ من هنا — <span className="text-amber-500">اختر التفوق.</span>
              </h2>
              <p className="text-zinc-400 text-lg">
                مع تصميم واجهة يليق بمستوى خدماتك، دع الزبون يشعر بالفخامة بدءاً من الحجز وحتى خروجه من الصالون مبتسماً.
              </p>
              <Button className="rounded-full bg-amber-600 text-black hover:bg-amber-500 h-12 px-8 font-black border-none">
                ابدأ الآن مجاناً
              </Button>
            </div>

            <div className="flex-1 w-full relative">
              <div className="bg-zinc-950 rounded-[40px] p-8 border border-zinc-800 min-h-[400px] flex items-center justify-center">
                {/* Tablet mockup placeholder */}
                <div className="w-[85%] aspect-[4/3] bg-zinc-900 border-8 border-black rounded-3xl shadow-2xl relative overflow-hidden flex flex-col">
                  <div className="flex border-b border-zinc-800 h-10 w-full bg-black shrink-0 px-4 items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 p-4 flex gap-4">
                    <div className="w-1/3 bg-zinc-950 rounded-xl flex flex-col gap-2 p-2 relative">
                      <div className="h-8 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-8 bg-zinc-800 rounded animate-pulse w-3/4" />
                    </div>
                    <div className="w-2/3 bg-black rounded-xl p-4 relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center text-7xl font-black text-zinc-900 z-0">10:15</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-24 bg-zinc-950 border-t border-zinc-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center" dir="rtl">
          <h2 className="text-3xl font-black text-white mb-2">إجابات سريعة لاستفساراتك</h2>
          <p className="text-zinc-400 mb-12">كل ما يخص حجزك في Coiffure Ticket</p>

          <div className="space-y-4 text-right">
            {[
              { q: "هل التطبيق مجاني لأصحاب الصالونات؟", a: "نعم! النسخة الأساسية موجهة لإدارة الطابور بالكامل وبشكل مجاني." },
              { q: "كيف يعرف الزبون دوره؟", a: "عبر رابط مباشر يُرسل له، ويمكنه تحديث صفحة التتبع بسهولة من هاتفه." },
              { q: "هل أحتاج لمعدات خاصة؟", a: "فقط هاتفك أو جهاز لوحي لإدارة المواعيد بشكل لحظي." },
              { q: "هل بيانات الصالون محمية؟", a: "نعم، نستخدم أعلى معايير التشفير وقواعد البيانات الآمنة لخصوصية زبائنك." },
            ].map((faq, i) => (
              <div key={i} className="border-b border-zinc-800 pb-4">
                <h4 className="font-bold text-lg text-white mb-2 pb-2">{faq.q}</h4>
                <p className="text-zinc-400 text-sm leading-relaxed pr-4 border-r-2 border-amber-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="pt-20 pb-10 bg-black border-t border-zinc-900 border-t-[3px] border-t-amber-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" dir="rtl">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
                  <Scissors className="w-4 h-4 text-black" />
                </div>
                <span className="font-black text-lg tracking-tight text-white uppercase font-outfit">Coiffure<span className="text-amber-500">Ticket</span></span>
              </div>
              <p className="text-zinc-400 text-sm max-w-sm mb-6 leading-relaxed">
                انضم للمنظومة الذكية الأولى لإدارة الصالونات وحسن تجربة زبائنك معنا فوراً وبدون تعقيدات.
              </p>
              <Button className="rounded-full bg-white hover:bg-zinc-200 text-black font-bold h-10 px-6">
                سجل الصالون
              </Button>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">التصفح</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li><a href="#features" className="hover:text-amber-500">الميزات</a></li>
                <li><a href="#how" className="hover:text-amber-500">آلية العمل</a></li>
                <li><a href="#faq" className="hover:text-amber-500">الأسئلة الشائعة</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">قانوني</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li><a href="#" className="hover:text-amber-500">الشروط والأحكام</a></li>
                <li><a href="#" className="hover:text-amber-500">سياسة الخصوصية</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-900 text-center text-zinc-600 flex flex-col md:flex-row justify-between items-center text-sm">
            <p>© {new Date().getFullYear()} Coiffure Ticket. جميع الحقوق محفوظة.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <span className="hover:text-white cursor-pointer">Twitter</span>
              <span className="hover:text-white cursor-pointer">Instagram</span>
              <span className="hover:text-white cursor-pointer">Facebook</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

