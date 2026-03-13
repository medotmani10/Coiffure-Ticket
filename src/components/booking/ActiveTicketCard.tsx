import type { Ticket } from '@/types/database';
import { Button } from '@/components/ui/button';
import { CheckCircle, X } from 'lucide-react';

interface Props {
    ticket: Ticket;
    peopleAhead: number;
    onCancel: () => void;
}

export default function ActiveTicketCard({ ticket, peopleAhead, onCancel }: Props) {
    const isServing = ticket.status === 'serving';

    return (
        <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-6" dir="rtl">
            <div className={`w-full max-w-sm rounded-3xl border p-8 flex flex-col items-center gap-6 text-center shadow-2xl transition-all ${isServing
                ? 'border-green-500/50 bg-green-950/20 shadow-green-500/10'
                : 'border-amber-500/30 bg-zinc-950 shadow-amber-500/5'
                }`}>
                {/* Status badge */}
                <div className={`px-4 py-1.5 rounded-full text-sm font-black border ${isServing
                    ? 'bg-green-400/10 text-green-400 border-green-400/20 animate-pulse'
                    : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                    }`}>
                    {isServing ? '🎉 دورك الآن!' : 'في انتظار دورك'}
                </div>

                {/* Ticket code */}
                <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">رقم تذكرتك</p>
                    <p className={`text-7xl font-black tracking-tight ${isServing ? 'text-green-400' : 'text-amber-400'}`}>
                        {ticket.ticket_number}
                    </p>
                </div>

                {/* Info */}
                <div className="w-full border-t border-zinc-800 pt-5 space-y-3 text-sm">
                    <div className="flex justify-between text-zinc-400">
                        <span>الأشخاص أمامك</span>
                        <span className="text-white font-bold">
                            {isServing
                                ? <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> جاهز</span>
                                : peopleAhead}
                        </span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                        <span>اسمك</span>
                        <span className="text-white font-bold">{ticket.customer_name}</span>
                    </div>
                    {ticket.barber_name && (
                        <div className="flex justify-between text-zinc-400">
                            <span>الحلاق</span>
                            <span className="text-amber-500 font-bold text-right break-words max-w-[150px]">{ticket.barber_name}</span>
                        </div>
                    )}
                </div>

                {/* Cancel */}
                {!isServing && (
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        className="w-full text-zinc-600 hover:text-red-400 hover:border-red-500/30 border border-transparent rounded-xl h-11 transition-all text-sm"
                    >
                        <X className="w-4 h-4 ml-2" />
                        إلغاء الحجز
                    </Button>
                )}
            </div>
        </div>
    );
}
