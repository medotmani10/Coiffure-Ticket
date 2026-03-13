import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { playTicketSound, unlockAudio } from '@/lib/notificationSound';

export function usePushSubscription(ticketId: string | null) {
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
    const pushSubscribedRef = useRef(false);

    useEffect(() => {
        if (ticketId && notificationPermission === 'granted' && !pushSubscribedRef.current) {
            pushSubscribedRef.current = true;
            subscribeToWebPush();
        }
    }, [ticketId, notificationPermission]);

    const subscribeToWebPush = async () => {
        if (!ticketId) return;
        try {
            // 1. Get or Register Service Worker
            let registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                registration = await navigator.serviceWorker.register('/sw.js');
            }
            await navigator.serviceWorker.ready;

            // 2. Automatically Fetch VAPID Public Key from Supabase
            const { data: vapidKey, error: keyError } = await supabase.rpc('get_vapid_public_key');
            if (keyError || !vapidKey) throw new Error('Could not get VAPID public key');

            // Convert Base64 string to Uint8Array for PushManager
            const padding = '='.repeat((4 - vapidKey.length % 4) % 4);
            const base64 = (vapidKey + padding).replace(/\-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }

            // 3. Subscribe to Web Push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: outputArray
            });

            // 4. Send subscription to Supabase
            const { error: dbError } = await supabase
                .from('push_subscriptions')
                .insert([{
                    ticket_id: ticketId,
                    subscription: JSON.parse(JSON.stringify(subscription))
                }]);

            // Ignore unique constraint errors if already subscribed
            if (dbError && dbError.code !== '23505') {
                console.error('Save sync error:', dbError);
                // Don't show an error toast if it's an auto-subscription running in the background, to avoid annoying the user.
                return;
            }
        } catch (error) {
            console.error('Push notification setup failed:', error);
            // Don't show an error toast if it's an auto-subscription running in the background, to avoid annoying the user.
        }
    };

    const requestNotificationPermission = async () => {
        // Unlock audio context on user interaction
        unlockAudio();

        if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const permission = await Notification.requestPermission();
                setNotificationPermission(permission);

                if (permission === 'granted') {
                    await subscribeToWebPush();
                    toast.success('تم تفعيل الإشعارات بنجاح! 🔔 ستصلك تنبيهات في الخلفية.');

                    // Play a tiny confirmation sound to show it works
                    playTicketSound();
                } else if (permission === 'denied') {
                    toast.error('تم رفض الإشعارات. لتفعيلها، قم بتغيير إعدادات الموقع في المتصفح.');
                }
            } catch (error) {
                console.error('Push permission request failed:', error);
                toast.error('حدث خطأ أثناء طلب تفعيل الإشعارات.');
            }
        } else {
            toast.error('متصفحك لا يدعم إشعارات الخلفية (Web Push). يرجى إبقاء هذه الصفحة مفتوحة.');
        }
    };

    const triggerSystemNotification = (title: string, body: string) => {
        // Always play sound as fallback/addition
        playTicketSound();

        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body,
                    icon: '/pwa-icon.svg',
                    vibrate: [200, 100, 200, 100, 200, 100, 200],
                } as any);
            } catch (e) {
                // Some mobile browsers require notifications to be sent via ServiceWorker
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, {
                        body,
                        icon: '/pwa-icon.svg',
                        vibrate: [200, 100, 200, 100, 200, 100, 200],
                    } as any);
                }).catch(err => {
                    console.error('Failed to show notification via service worker', err);
                    toast.info(`📢 ${title}: ${body}`, { duration: 6000 });
                });
            }
        } else {
            // Fallback to a special toast if permissions aren't granted
            toast.info(`📢 ${title}: ${body}`, { duration: 6000 });
        }
    };

    return {
        notificationPermission,
        requestNotificationPermission,
        triggerSystemNotification
    };
}
