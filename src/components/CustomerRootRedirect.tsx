import { Navigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';

export default function CustomerRootRedirect() {
  const lastVisitedShop = localStorage.getItem('last_visited_shop');

  if (lastVisitedShop) {
    return <Navigate to={`/${lastVisitedShop}`} replace />;
  }

  return (
    <div className="min-h-[100dvh] bg-black flex items-center justify-center p-4" dir="rtl">
      <div className="text-center max-w-sm w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-10">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <QrCode className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-xl font-black text-white mb-3">مرحباً بك</h2>
        <p className="text-zinc-400">يرجى مسح رمز او اعادة الضغط على الرابط المرسل اليكم QR  للبدء </p>
      </div>
    </div>
  );
}
