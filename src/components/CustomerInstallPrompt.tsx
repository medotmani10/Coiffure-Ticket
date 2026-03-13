import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DownloadCloud, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: Array<string>;
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export default function CustomerInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        if (isStandalone) {
            setIsInstalled(true);
            return;
        }

        const handleBeforeInstallPrompt = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Optionally, we show the dialog automatically when the event fires, 
            // or we could show it after a delay/on button click.
            setIsOpen(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Also listen for successful installation
        window.addEventListener('appinstalled', () => {
            setIsOpen(false);
            setIsInstalled(true);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the native prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setIsOpen(false);
        }

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
    };

    if (isInstalled || !deferredPrompt) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white p-6" dir="rtl">
                <DialogHeader className="flex flex-col items-center text-center sm:text-center space-y-4 pt-4">
                    <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.2)] mb-2 relative">
                        <Smartphone className="w-10 h-10 text-white" />
                        <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1.5 border-4 border-zinc-950">
                            <DownloadCloud className="w-4 h-4 text-black" />
                        </div>
                    </div>

                    <DialogTitle className="text-2xl font-black">تثبيت تطبيق الحجز</DialogTitle>
                    <DialogDescription className="text-zinc-400 text-base leading-relaxed">
                        قم بتثبيت التطبيق على هاتفك للحصول على تجربة أسرع، للوصول السريع إلى طابور الانتظار ومتابعة دورك بأي وقت.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="flex-col sm:flex-row gap-3 mt-6 sm:space-x-0">
                    <Button
                        onClick={handleInstallClick}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 text-lg rounded-xl"
                    >
                        تثبيت التطبيق الآن
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => setIsOpen(false)}
                        className="w-full text-zinc-500 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 h-12 rounded-xl"
                    >
                        ليس الآن
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
