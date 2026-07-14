import React, { useState } from 'react';
import { Loader, ArrowLeft } from 'lucide-react';
import { useOrders } from '../../context/OrdersContext';

const BarChart = ({ data }) => {
    const maxValue = Math.max(...Object.values(data), 1);

    const categories = [
        { key: 'MILKSHAKE', label: 'Milkshake', color: '#f97316' },
        { key: 'ICE CREAM', label: 'Ice Cream', color: '#b45309' },
        { key: 'TOPPINGS', label: 'Toppings', color: '#16a34a' },
        { key: 'ICE CREAM DABBE', label: 'Packaging Material', color: '#3b82f6' },
    ];

    const chartHeight = 200;
    const barWidth = 50;
    const gap = 30;
    const totalWidth = categories.length * (barWidth + gap);

    return (
        <div className="relative">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-500 w-10">
                <span>{Math.round(maxValue * 1.2)}</span>
                <span>{Math.round(maxValue * 0.9)}</span>
                <span>{Math.round(maxValue * 0.6)}</span>
                <span>{Math.round(maxValue * 0.3)}</span>
                <span>0</span>
            </div>

            {/* Chart area */}
            <div className="ml-12 relative" style={{ height: chartHeight }}>
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between">
                    {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="border-t border-gray-200 w-full" />
                    ))}
                </div>

                {/* Bars */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-around items-end h-full">
                    {categories.map(cat => {
                        const value = data[cat.key] || 0;
                        const heightPercent = (value / (maxValue * 1.2)) * 100;

                        return (
                            <div key={cat.key} className="flex flex-col items-center">
                                <span className="text-xs font-bold text-gray-700 mb-1">{value}</span>
                                <div
                                    className="rounded-t-md transition-all duration-500"
                                    style={{
                                        width: barWidth,
                                        height: `${heightPercent}%`,
                                        backgroundColor: cat.color,
                                        minHeight: value > 0 ? 4 : 0
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* X-axis labels */}
            <div className="ml-12 flex justify-around mt-2">
                {categories.map(cat => (
                    <span key={cat.key} className="text-xs text-gray-600 text-center" style={{ width: barWidth }}>
                        {cat.label}
                    </span>
                ))}
            </div>
        </div>
    );
};

const DonutChart = ({ data }) => {
    const total = Object.values(data).reduce((sum, v) => sum + v, 0);
    if (total === 0) return null;

    const categories = [
        { key: 'MILKSHAKE', label: 'Milkshake', color: '#f97316' },
        { key: 'ICE CREAM', label: 'Ice Cream', color: '#b45309' },
        { key: 'TOPPINGS', label: 'Toppings', color: '#16a34a' },
        { key: 'ICE CREAM DABBE', label: 'Packaging Material', color: '#3b82f6' },
    ];

    const size = 220;
    const strokeWidth = 50;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;

    let currentOffset = 0;
    const segments = categories.map(cat => {
        const value = data[cat.key] || 0;
        const percent = value / total;
        const dashLength = percent * circumference;
        const segment = {
            ...cat,
            value,
            percent,
            dashLength,
            dashOffset: -currentOffset,
        };
        currentOffset += dashLength;
        return segment;
    }).filter(s => s.value > 0);

    return (
        <div className="flex flex-col items-center">
            <div className="relative">
                <svg width={size} height={size} className="transform -rotate-90">
                    {segments.map((seg, i) => (
                        <circle
                            key={seg.key}
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${seg.dashLength} ${circumference}`}
                            strokeDashoffset={seg.dashOffset}
                        />
                    ))}
                </svg>

                {/* Labels on chart */}
                {segments.map((seg, i) => {
                    const angle = (segments.slice(0, i).reduce((sum, s) => sum + s.percent, 0) + seg.percent / 2) * 360;
                    const labelRadius = radius * 0.7;
                    const x = center + labelRadius * Math.cos((angle - 90) * Math.PI / 180);
                    const y = center + labelRadius * Math.sin((angle - 90) * Math.PI / 180);

                    return (
                        <div
                            key={seg.key}
                            className="absolute text-white text-xs font-bold text-center"
                            style={{
                                left: x,
                                top: y,
                                transform: 'translate(-50%, -50%)'
                            }}
                        >
                            <div>{seg.value}</div>
                            <div className="text-[10px] opacity-90">{seg.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 mt-4">
                {categories.map(cat => (
                    <div key={cat.key} className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm text-gray-600">{cat.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ExportReportView = ({ onBack, onExportSummary, onExportShopwise, isExporting }) => {
    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
            {/* Header */}
            <header className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <div className="px-4 py-4 flex items-center gap-3">
                    <button onClick={onBack} className="p-1 -ml-1">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold">Export Report</h1>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-center px-4">
                <div className="space-y-4">
                    <button
                        onClick={onExportSummary}
                        disabled={isExporting}
                        className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition disabled:opacity-50 uppercase tracking-wide"
                    >
                        {isExporting ? (
                            <Loader className="w-5 h-5 animate-spin mx-auto" />
                        ) : (
                            'GENERATE SUMMARY PDF REPORT'
                        )}
                    </button>

                    <button
                        onClick={onExportShopwise}
                        disabled={isExporting}
                        className="w-full py-4 bg-white text-orange-500 font-bold rounded-xl border-2 border-orange-200 hover:bg-orange-50 transition disabled:opacity-50 uppercase tracking-wide"
                    >
                        {isExporting ? (
                            <Loader className="w-5 h-5 animate-spin mx-auto" />
                        ) : (
                            'GENERATE SHOP-WISE DISPATCH PDF'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReportsView = ({ onExportSummary, onExportShopwise, isExporting }) => {
    const { categorySummary, selectedDate, loading, orders } = useOrders();
    const [showExport, setShowExport] = useState(false);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader className="w-8 h-8 text-orange-600 animate-spin" />
            </div>
        );
    }

    if (showExport) {
        return (
            <ExportReportView
                onBack={() => setShowExport(false)}
                onExportSummary={() => {
                    onExportSummary();
                    setShowExport(false);
                }}
                onExportShopwise={() => {
                    onExportShopwise();
                    setShowExport(false);
                }}
                isExporting={isExporting}
            />
        );
    }

    return (
        <div className="space-y-4">
            {/* Date */}
            <div className="text-gray-500 font-medium">
                {selectedDate}
            </div>

            {orders.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-8 text-center">
                    <p className="text-gray-500 font-medium">No data for this date</p>
                </div>
            ) : (
                <>
                    {/* Category Totals Bar Chart */}
                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                        <div className="bg-orange-500 text-white px-4 py-3">
                            <h3 className="font-bold">Category Totals</h3>
                        </div>
                        <div className="p-5">
                            <BarChart data={categorySummary} />
                        </div>
                    </div>

                    {/* Category Breakdown Donut */}
                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                        <div className="bg-orange-500 text-white px-4 py-3">
                            <h3 className="font-bold">Category Breakdown</h3>
                        </div>
                        <div className="p-5">
                            <DonutChart data={categorySummary} />
                        </div>
                    </div>

                    {/* Export Button */}
                    <button
                        onClick={() => setShowExport(true)}
                        className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition uppercase tracking-wide"
                    >
                        EXPORT REPORTS
                    </button>
                </>
            )}
        </div>
    );
};

export default ReportsView;
