import { QRCodeSVG } from 'qrcode.react';
import { getCustomerBaseUrl } from '@/lib/utils';

// تنظيف الكود من السكريبتات قبل الطباعة لمنع الثغرات
function sanitizeHtml(html: string): string {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/\son\w+\s*=\s*(["']).*?\1/gi, '')
        .replace(/\son\w+\s*=[^\s>]*/gi, '')
        .replace(/javascript:/gi, 'blocked:');
}

interface ThermalTicketProps {
    ticketNumber: number;
    ticketId: string;
    customerName: string;
    barberName?: string;
    shopName: string;
    shopSlug: string;
    peopleCount: number;
    peopleAhead?: number;
    createdAt: Date;
}

export function ThermalTicket({
    ticketNumber,
    ticketId,
    customerName,
    barberName,
    shopName,
    peopleCount,
    peopleAhead,
    createdAt,
}: ThermalTicketProps) {
    const customerBase = getCustomerBaseUrl();
    const trackingUrl = `${customerBase}/t/${ticketId}`;

    const dateTimeStr = createdAt.toLocaleString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div
            id="thermal-ticket-content"
            style={{
                width: '280px', // متوافق مع طابعات 58mm
                fontFamily: '"Cairo", sans-serif',
                backgroundColor: '#fff',
                color: '#000',
                padding: '10px',
                boxSizing: 'border-box',
                direction: 'rtl',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}
        >
            {/* Header: Shop Name & Time */}
            <div style={{ marginBottom: '5px' }}>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#000', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {shopName}
                </div>
                <div style={{ fontSize: '12px', color: '#000', fontWeight: 'bold' }}>
                    {dateTimeStr}
                </div>
            </div>

            {/* Hero Section: Ticket Number */}
            <div style={{ padding: '5px 0' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#000', marginBottom: '8px' }}>
                    رقم التذكرة
                </div>
                <div style={{
                    fontSize: '65px',
                    fontWeight: 'bold',
                    lineHeight: '1',
                    border: '3px solid #000',
                    borderRadius: '25px',
                    padding: '15px 0',
                    width: '100%',
                    display: 'block',
                    margin: '0 auto',
                    color: '#000'
                }}>
                    <div>{ticketNumber}</div>
                    {peopleAhead !== undefined && (
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#000', marginTop: '6px' }}>
                            أشخاص أمامك: {peopleAhead}
                        </div>
                    )}
                </div>
            </div>

            {/* Details & QR Section */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '8px',
                borderTop: '2px solid #000',
                marginTop: '5px'
            }}>
                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'right', flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#000' }}>
                        الاسم: <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{customerName}</span>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#000' }}>
                        الحلاق: <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{barberName || '-'}</span>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#000' }}>
                        عدد الاشخاص: <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{peopleCount}</span>
                    </div>
                </div>

                {/* QR Code */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', marginRight: '5px' }}>
                    <div style={{
                        width: '110px',
                        height: '110px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fff'
                    }}>
                        <QRCodeSVG
                            value={trackingUrl}
                            size={110}
                            level="M"
                            bgColor="#ffffff"
                            fgColor="#000000"
                            includeMargin={false}
                        />
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#000', textAlign: 'center', lineHeight: '1.2', maxWidth: '110px' }}>
                        تتبع دورك
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{ fontSize: '12px', color: '#000', marginTop: '5px', fontWeight: 'bold', borderTop: '4px dashed #000', paddingTop: '5px' }}>
                نعيماً مقدماً! شكراً لزيارتكم
            </div>
        </div>
    );
}

/* ─── Print function (Silent Iframe Approach) ─── */
export async function printThermalTicket(props: ThermalTicketProps) {
    // 1. بناء واجهة التذكرة بشكل وهمي ومخفي
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
    document.body.appendChild(container);

    const { createRoot } = await import('react-dom/client');
    const root = createRoot(container);
    root.render(<ThermalTicket {...props} />);

    // انتظار بسيط لضمان تجهيز React للمكونات
    await new Promise(r => setTimeout(r, 300));

    const ticketEl = container.querySelector('#thermal-ticket-content') as HTMLElement;
    if (!ticketEl) {
        document.body.removeChild(container);
        return;
    }

    // ─── NATIVE SHARE API INTEGRATION (Mobile / Desktop supported) ───
    if (navigator.share && navigator.canShare) {
        try {
            const { toBlob } = await import('html-to-image');

            // Generate a high-quality PNG of the ticket
            const blob = await toBlob(ticketEl, {
                quality: 1,
                backgroundColor: '#ffffff',
                pixelRatio: 2, // 2x for better crispness when printing images
                style: { transform: 'scale(1)', transformOrigin: 'top left' }
            });

            if (blob) {
                const file = new File([blob], `ticket-${props.ticketNumber}.png`, { type: 'image/png' });

                // Check if the exact payload can be shared
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: `تذكرة ${props.ticketNumber}`,
                        text: `تذكرة الزبون ${props.customerName} - صالون ${props.shopName}`,
                        files: [file]
                    });

                    // Cleanup and exit early since share drawer took over
                    root.unmount();
                    if (document.body.contains(container)) document.body.removeChild(container);
                    return;
                }
            }
        } catch (err) {
            // AbortError is thrown when users close the share sheet deliberately. 
            // We shouldn't fallback to iframe in that case because they explicitly canceled it.
            const name = err instanceof Error ? err.name : '';
            if (name === 'AbortError') {
                root.unmount();
                if (document.body.contains(container)) document.body.removeChild(container);
                return;
            }
            console.error('Failed to share via native API, falling back to iframe', err);
        }
    }

    // 2. إنشاء نافذة Iframe مخفية للطباعة الصامتة كأسلوب احتياطي (Fallback)
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:absolute;width:0px;height:0px;left:-9999px;border:none;';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
        const code = `#${props.ticketNumber}`;
        doc.open();
        // تمرير تصميم الـ HTML للـ Iframe مع ضبط قياسات 58mm
        doc.write(`
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>تذكرة ${code}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; }
    @page { size: 58mm auto; margin: 0; }
    body { font-family: 'Cairo', sans-serif; background: #fff; width: 58mm; padding: 0; overflow: hidden; }
    #thermal-ticket-content { width: 58mm !important; }
  </style>
</head>
<body>
  ${sanitizeHtml(ticketEl.outerHTML)}
</body>
</html>`);
        doc.close();

        // 3. إعطاء أمر الطباعة بمجرد تحميل الخطوط داخل الـ Iframe
        iframe.onload = function () {
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();

                // تنظيف الـ Iframe والـ Container من الصفحة بعد الطباعة لمنع تسرب الذاكرة
                setTimeout(() => {
                    if (document.body.contains(iframe)) document.body.removeChild(iframe);
                    root.unmount();
                    if (document.body.contains(container)) document.body.removeChild(container);
                }, 1000);
            }, 600); // مهلة 600ms لضمان تحميل خط Cairo من جوجل
        };
    } else {
        root.unmount();
        document.body.removeChild(container);
    }
}