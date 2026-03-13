import { Loader2 } from 'lucide-react';

export default function ShopClosedScreen({ shopName }: { shopName: string }) {
    return (
        <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-6 text-center" dir="rtl">
            <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                <Loader2 className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">{shopName}</h2>
            <p className="text-zinc-400">الصالون مغلق حالياً — يرجى المحاولة لاحقاً</p>
        </div>
    );
}
