export default function handler(req, res) {
    // إعداد ترويسة الاستجابة كـ JSON
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // استقبال المتغيرات من الرابط (GET Parameters)
    const ticketNumber = req.query.ticketNumber || '';
    const customerName = req.query.customerName || 'عميل عبر الرابط';
    const shopName = req.query.shopName || 'محطة غسيل';
    const peopleCount = req.query.peopleCount || '';
    const peopleAhead = req.query.peopleAhead || '';
    const createdAt = req.query.createdAt || new Date().toLocaleString('ar-DZ');
    const qrUrl = req.query.qrUrl || '';

    const a = [];

    // إرسال سطر فارغ
    const objEmpty = {
        type: 0,
        content: ' ',
        bold: 0,
        align: 0,
        format: 0
    };

    // اسم المحطة (Shop Name)
    a.push({
        type: 0,
        content: shopName,
        bold: 1,
        align: 1, // 1 = center
        format: 3 // 3 = double width
    });

    a.push(objEmpty);

    // عنوان التذكرة
    a.push({
        type: 0,
        content: 'رقم التذكرة',
        bold: 1,
        align: 1,
        format: 0
    });

    // رقم التذكرة (Ticket Number)
    a.push({
        type: 0,
        content: '#' + ticketNumber,
        bold: 1,
        align: 1,
        format: 2 // 2 = double height + width
    });

    a.push(objEmpty);

    // اسم الزبون
    a.push({
        type: 0,
        content: 'الزبون: ' + customerName,
        bold: 1,
        align: 1,
        format: 0
    });

    // عدد السيارات
    a.push({
        type: 0,
        content: 'عدد السيارات: ' + peopleCount,
        bold: 1,
        align: 1,
        format: 0
    });

    // سيارات قبلك
    if (peopleAhead !== '') {
        a.push({
            type: 0,
            content: 'سيارات قبلك: ' + peopleAhead,
            bold: 1,
            align: 1,
            format: 0
        });
    }

    // التاريخ والوقت
    a.push({
        type: 0,
        content: 'التاريخ: ' + createdAt,
        bold: 0,
        align: 1,
        format: 0
    });

    a.push(objEmpty);

    // رمز الاستجابة السريعة (QR Code)
    if (qrUrl !== '') {
        a.push({
            type: 3, // 3 = QR code
            value: qrUrl,
            size: 40, // 40mm
            align: 1 // 1 = center
        });

        a.push({
            type: 0,
            content: 'امسح الرمز لتتبع دورك',
            bold: 1,
            align: 1,
            format: 0
        });
    }

    a.push(objEmpty);

    // التذييل (Footer)
    a.push({
        type: 0,
        content: 'Lavage Ticket - System',
        bold: 1,
        align: 1,
        format: 4 // 4 = small
    });

    a.push(objEmpty);
    a.push(objEmpty);

    // طباعة النتيجة بصيغة JSON لكي يقرأها تطبيق Bluetooth Print
    res.status(200).json(a);
}
