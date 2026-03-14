import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
// Import edge compatible web-push (fixed typo denonext)
import * as webpush from "https://esm.sh/web-push@3.6.6?target=denonext";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders, status: 204 });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROJECT_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';

        if (!supabaseUrl || !serviceRoleKey) {
            return new Response(JSON.stringify({ error: 'Missing server configuration' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            });
        }

        const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
        const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';

        if (!jwt) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(jwt);

        if (userErr || !userData?.user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        const callerUserId = userData.user.id;

        // Fetch VAPID Keys from the app_settings table
        const { data: settingsData, error: settingsError } = await supabaseAdmin
            .from('app_settings')
            .select('key, value')
            .in('key', ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY']);

        if (settingsError) throw settingsError;

        let publicKey = '';
        let privateKey = '';

        for (const row of settingsData) {
            if (row.key === 'VAPID_PUBLIC_KEY') publicKey = row.value;
            if (row.key === 'VAPID_PRIVATE_KEY') privateKey = row.value;
        }

        if (!publicKey || !privateKey) {
            throw new Error('VAPID keys not configured in database.');
        }

        // Configure web-push
        try {
            webpush.setVapidDetails(
                'mailto:admin@coiffureticket.com',
                publicKey,
                privateKey
            );
        } catch (setupErr) {
            const details = setupErr instanceof Error ? setupErr.message : String(setupErr);
            return new Response(JSON.stringify({ error: 'Failed configured VAPID details', details }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            });
        }

        const { ticketId, title, body, url } = await req.json();

        if (!ticketId) {
            return new Response(JSON.stringify({ error: 'ticketId is required' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            });
        }

        const { data: ticketRow, error: ticketErr } = await supabaseAdmin
            .from('tickets')
            .select('id, shop_id, barber_id')
            .eq('id', ticketId)
            .single();

        if (ticketErr || !ticketRow) {
            return new Response(JSON.stringify({ error: 'Ticket not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            });
        }

        const { data: shopRow } = await supabaseAdmin
            .from('shops')
            .select('owner_id')
            .eq('id', ticketRow.shop_id)
            .single();

        const isOwner = Boolean(shopRow?.owner_id && shopRow.owner_id === callerUserId);

        const { data: barberRow } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', callerUserId)
            .eq('role', 'barber')
            .eq('shop_id', ticketRow.shop_id)
            .eq('is_active', true)
            .single();

        const isAssignedBarber = Boolean(barberRow?.id && ticketRow.barber_id && ticketRow.barber_id === callerUserId);

        if (!isOwner && !isAssignedBarber) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            });
        }

        // Fetch subscriptions for this ticket
        const { data: subscriptions, error: subError } = await supabaseAdmin
            .from('push_subscriptions')
            .select('*')
            .eq('ticket_id', ticketId);

        if (subError) throw subError;

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(JSON.stringify({ message: 'No subscriptions found for this ticket' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // Payload to send
        const notificationPayload = JSON.stringify({
            title: title || 'CoiffureTicket Update',
            body: body || 'Your ticket status has been updated.',
            url: url || '/',
            icon: '/pwa-icon.png'
        });

        const results = [];

        // Send push to all subscriptions
        const sendPromises = subscriptions.map(async (subRow: { id: string; subscription: unknown }) => {
            try {
                const sub = subRow.subscription;
                await webpush.sendNotification(sub, notificationPayload);
                results.push({ id: subRow.id, status: 'success' });
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                const statusCode = typeof err === 'object' && err !== null && 'statusCode' in err
                    ? (err as { statusCode?: number }).statusCode
                    : undefined;
                console.error(`Error sending to subscription ${subRow.id}:`, err);
                results.push({ id: subRow.id, status: 'failed', error: message });

                // If subscription is invalid/expired (status 410 or 404), delete it
                if (statusCode === 410 || statusCode === 404) {
                    await supabaseAdmin
                        .from('push_subscriptions')
                        .delete()
                        .eq('id', subRow.id);
                }
            }
        });

        await Promise.all(sendPromises);

        return new Response(JSON.stringify({ success: true, count: subscriptions.length, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        console.error('Error in send-push function:', error);

        // Return explicit error details to frontend
        return new Response(JSON.stringify({
            error: 'Internal Edge Function Error',
            message,
            stack
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
