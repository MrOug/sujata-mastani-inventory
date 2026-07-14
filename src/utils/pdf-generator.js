export const generateSummaryReport = (data) => {
    const { categorySummary, aggregatedTotals, selectedDate, outletCount, CATEGORY_ORDER, masterStockList } = data;

    const formattedDate = new Date(selectedDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    let content = `
SUJATA MASTANI - DAILY STOCK SUMMARY REPORT
============================================
Date: ${formattedDate}
Outlets: ${outletCount}
Generated: ${new Date().toLocaleString('en-IN')}

CATEGORY TOTALS
---------------
Milkshake:    ${categorySummary['MILKSHAKE'] || 0}
Ice Cream:    ${categorySummary['ICE CREAM'] || 0}
Toppings:     ${categorySummary['TOPPINGS'] || 0}
Packaging Material:    ${categorySummary['ICE CREAM DABBE'] || 0}

DETAILED BREAKDOWN
------------------
`;

    CATEGORY_ORDER.forEach(category => {
        if (category === 'MISC') return;

        const catData = aggregatedTotals[category];
        if (!catData || catData.total === 0) return;

        content += `\n${category}\n${'='.repeat(category.length)}\n`;

        const items = masterStockList[category] || [];
        items.forEach(item => {
            const qty = catData.items[item] || 0;
            if (qty > 0) {
                const paddedItem = item.padEnd(30);
                content += `${paddedItem} ${qty}\n`;
            }
        });

        content += `${'─'.repeat(35)}\n`;
        content += `TOTAL: ${catData.total}\n`;
    });

    content += `\n============================================\nEnd of Report\n`;

    return content;
};

export const generateShopwiseReport = (data) => {
    const { orders, stores, selectedDate, CATEGORY_ORDER } = data;

    const formattedDate = new Date(selectedDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    let content = `
SUJATA MASTANI - SHOP-WISE DISPATCH CHALLANS
=============================================
Date: ${formattedDate}
Total Orders: ${orders.length}
Generated: ${new Date().toLocaleString('en-IN')}

`;

    orders.forEach((order, idx) => {
        const store = stores[order.storeId] || {};
        const storeName = store.name || order.storeName || order.storeId;
        const area = store.areaCode || '';

        content += `\n${'═'.repeat(45)}\n`;
        content += `CHALLAN #${idx + 1}\n`;
        content += `${'═'.repeat(45)}\n`;
        content += `Shop: ${storeName}\n`;
        if (area) content += `Area: ${area}\n`;
        content += `Date: ${formattedDate}\n`;
        content += `${'─'.repeat(45)}\n`;

        const orderQty = order.orderQuantities || {};

        CATEGORY_ORDER.forEach(category => {
            const categoryItems = Object.entries(orderQty)
                .filter(([key, qty]) => key.startsWith(`${category}-`) && qty > 0)
                .map(([key, qty]) => ({
                    item: key.replace(`${category}-`, ''),
                    qty
                }));

            if (categoryItems.length > 0) {
                content += `\n${category}\n`;
                categoryItems.forEach(({ item, qty }) => {
                    const paddedItem = item.padEnd(30);
                    content += `  ${paddedItem} ${qty}\n`;
                });
            }
        });

        content += `\n`;
    });

    content += `\n${'═'.repeat(45)}\nEnd of Challans\n`;

    return content;
};

export const downloadTextAsFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
