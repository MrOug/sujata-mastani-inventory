// Calendar and date utility functions

/**
 * Get the next day's date
 */
export const getNextDay = (date = new Date()) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay;
};

/**
 * Format date to readable string
 */
export const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Get day of week
 */
export const getDayOfWeek = (date) => {
    return date.toLocaleDateString('en-IN', { weekday: 'long' });
};

/**
 * Hindu Festivals and Public Holidays for 2024-2026
 * This is a simplified calendar - can be expanded
 */
const hinduFestivals = {
    2024: [
        { date: '2024-01-14', name: 'Makar Sankranti', type: 'festival' },
        { date: '2024-01-26', name: 'Republic Day', type: 'public' },
        { date: '2024-03-08', name: 'Maha Shivaratri', type: 'festival' },
        { date: '2024-03-25', name: 'Holi', type: 'festival' },
        { date: '2024-03-29', name: 'Good Friday', type: 'public' },
        { date: '2024-04-11', name: 'Eid ul-Fitr', type: 'public' },
        { date: '2024-04-17', name: 'Ram Navami', type: 'festival' },
        { date: '2024-04-21', name: 'Mahavir Jayanti', type: 'festival' },
        { date: '2024-08-15', name: 'Independence Day', type: 'public' },
        { date: '2024-08-26', name: 'Janmashtami', type: 'festival' },
        { date: '2024-09-07', name: 'Ganesh Chaturthi', type: 'festival' },
        { date: '2024-10-02', name: 'Gandhi Jayanti', type: 'public' },
        { date: '2024-10-12', name: 'Dussehra', type: 'festival' },
        { date: '2024-10-31', name: 'Diwali', type: 'festival' },
        { date: '2024-11-01', name: 'Govardhan Puja', type: 'festival' },
        { date: '2024-11-02', name: 'Bhai Dooj', type: 'festival' },
        { date: '2024-12-25', name: 'Christmas', type: 'public' },
    ],
    2025: [
        { date: '2025-01-14', name: 'Makar Sankranti', type: 'festival' },
        { date: '2025-01-26', name: 'Republic Day', type: 'public' },
        { date: '2025-02-26', name: 'Maha Shivaratri', type: 'festival' },
        { date: '2025-03-14', name: 'Holi', type: 'festival' },
        { date: '2025-03-30', name: 'Eid ul-Fitr', type: 'public' },
        { date: '2025-04-06', name: 'Ram Navami', type: 'festival' },
        { date: '2025-04-10', name: 'Mahavir Jayanti', type: 'festival' },
        { date: '2025-04-18', name: 'Good Friday', type: 'public' },
        { date: '2025-08-15', name: 'Independence Day', type: 'public' },
        { date: '2025-08-16', name: 'Janmashtami', type: 'festival' },
        { date: '2025-08-27', name: 'Ganesh Chaturthi', type: 'festival' },
        { date: '2025-10-02', name: 'Gandhi Jayanti / Dussehra', type: 'public' },
        { date: '2025-10-20', name: 'Diwali', type: 'festival' },
        { date: '2025-10-21', name: 'Govardhan Puja', type: 'festival' },
        { date: '2025-10-22', name: 'Bhai Dooj', type: 'festival' },
        { date: '2025-12-25', name: 'Christmas', type: 'public' },
    ],
    2026: [
        { date: '2026-01-14', name: 'Makar Sankranti', type: 'festival' },
        { date: '2026-01-26', name: 'Republic Day', type: 'public' },
        { date: '2026-02-16', name: 'Maha Shivaratri', type: 'festival' },
        { date: '2026-03-03', name: 'Holi', type: 'festival' },
        { date: '2026-03-20', name: 'Eid ul-Fitr', type: 'public' },
        { date: '2026-03-26', name: 'Ram Navami', type: 'festival' },
        { date: '2026-03-29', name: 'Mahavir Jayanti', type: 'festival' },
        { date: '2026-04-03', name: 'Good Friday', type: 'public' },
        { date: '2026-08-04', name: 'Janmashtami', type: 'festival' },
        { date: '2026-08-15', name: 'Independence Day', type: 'public' },
        { date: '2026-09-16', name: 'Ganesh Chaturthi', type: 'festival' },
        { date: '2026-09-21', name: 'Dussehra', type: 'public' },
        { date: '2026-10-02', name: 'Gandhi Jayanti', type: 'public' },
        { date: '2026-11-08', name: 'Diwali', type: 'festival' },
        { date: '2026-11-09', name: 'Govardhan Puja', type: 'festival' },
        { date: '2026-11-10', name: 'Bhai Dooj', type: 'festival' },
        { date: '2026-12-25', name: 'Christmas', type: 'public' },
    ]
};

/**
 * Get holidays for a specific date
 */
export const getHolidaysForDate = (date) => {
    const year = date.getFullYear();
    const dateStr = date.toISOString().split('T')[0];
    
    if (!hinduFestivals[year]) {
        return [];
    }
    
    return hinduFestivals[year].filter(holiday => holiday.date === dateStr);
};

/**
 * Get holidays within a date range (for showing upcoming holidays)
 */
export const getUpcomingHolidays = (startDate, days = 7) => {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);
    
    const year = startDate.getFullYear();
    if (!hinduFestivals[year]) {
        return [];
    }
    
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    
    return hinduFestivals[year].filter(holiday => 
        holiday.date >= startStr && holiday.date <= endStr
    );
};

/**
 * Check if a date is a weekend
 */
export const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
};

/**
 * Get a formatted string for next day info
 */
export const getNextDayInfo = () => {
    const nextDay = getNextDay();
    const dayName = getDayOfWeek(nextDay);
    const dateStr = formatDate(nextDay);
    const holidays = getHolidaysForDate(nextDay);
    const weekend = isWeekend(nextDay);
    
    return {
        date: nextDay,
        dateStr,
        dayName,
        holidays,
        isWeekend: weekend,
        isSpecialDay: holidays.length > 0 || weekend
    };
};

