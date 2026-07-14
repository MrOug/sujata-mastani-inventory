/**
 * Panchang/Hindu Calendar Utilities
 * Uses mhah-panchang library for Tithi calculations
 * and Google Calendar API for Indian holidays
 */

import { MhahPanchang } from 'mhah-panchang';
import { formatDateLocal, getTodayDate, getYesterdayDate } from './date-utils';

// Mumbai coordinates (default for Sujata Mastani)
const DEFAULT_LOCATION = {
  latitude: 19.0760,
  longitude: 72.8777
};

// Google Calendar API for Indian holidays (free, no key required for public calendars)
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/en.indian%23holiday%40group.v.calendar.google.com/events';
const GOOGLE_API_KEY = 'AIzaSyBNlYH01_9Hc5S1J9vuFmu2nUqBZJNAXxs';

// Tithi names in English
const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima/Amavasya'
];

// Important tithis for business impact
const IMPORTANT_TITHIS = {
  4: { name: 'Chaturthi', impact: 'high', description: 'Ganesh worship day - expect more sweets orders' },
  11: { name: 'Ekadashi', impact: 'medium', description: 'Fasting day - some customers may fast' },
  14: { name: 'Chaturdashi', impact: 'medium', description: 'Day before Purnima/Amavasya' },
  15: { name: 'Purnima', impact: 'high', description: 'Full moon - auspicious day, more celebrations' },
  30: { name: 'Amavasya', impact: 'medium', description: 'New moon - some fasting observed' }
};

// Paksha (lunar fortnight)
const PAKSHA = {
  SHUKLA: 'Shukla Paksha', // Waxing moon (day 1-15)
  KRISHNA: 'Krishna Paksha' // Waning moon (day 16-30)
};

/**
 * Get Panchang data for a specific date
 * @param {Date} date - Date to get panchang for
 * @param {Object} location - { latitude, longitude }
 * @returns {Object} Panchang data including tithi, nakshatra, etc.
 */
export function getPanchangData(date = new Date(), location = DEFAULT_LOCATION) {
  try {
    const panchang = new MhahPanchang();

    // Get panchang for the date using calculate method
    const result = panchang.calculate(date);

    // Get tithi number (1-30)
    const tithiNumber = result.Tithi?.Tithi_Number || 0;
    const pakshaFromResult = result.Paksha?.Paksha_Name || '';
    const isShukla = pakshaFromResult.toLowerCase().includes('shukla') || tithiNumber <= 15;
    const paksha = isShukla ? PAKSHA.SHUKLA : PAKSHA.KRISHNA;

    // For tithi comparison, get the day within the paksha (1-15)
    const adjustedTithi = tithiNumber <= 15 ? tithiNumber : tithiNumber - 15;

    // Check if it's an important tithi
    const importantTithi = IMPORTANT_TITHIS[adjustedTithi] || IMPORTANT_TITHIS[tithiNumber];

    return {
      date: formatDateLocal(date),
      tithi: {
        number: tithiNumber,
        name: result.Tithi?.Tithi_Name || TITHI_NAMES[adjustedTithi - 1] || 'Unknown',
        paksha: paksha,
        isShukla: isShukla
      },
      nakshatra: {
        name: result.Nakshatra?.Nakshatra_Name || 'Unknown',
        number: result.Nakshatra?.Nakshatra_Number || 0
      },
      yoga: result.Yoga?.Yoga_Name || 'Unknown',
      karana: result.Karna?.Karna_Name || 'Unknown',
      raasi: result.Raasi?.Raasi_Name || 'Unknown',
      important: importantTithi || null,
      isChaturthi: adjustedTithi === 4,
      isEkadashi: adjustedTithi === 11,
      isPurnima: tithiNumber === 15 || adjustedTithi === 15,
      isAmavasya: tithiNumber === 30 || (tithiNumber === 15 && !isShukla),
      raw: result
    };
  } catch (error) {
    console.error('Error calculating panchang:', error);
    return {
      date: formatDateLocal(date),
      error: error.message,
      tithi: { name: 'Unknown', number: 0, paksha: '' },
      nakshatra: { name: 'Unknown' },
      important: null,
      isChaturthi: false,
      isEkadashi: false,
      isPurnima: false,
      isAmavasya: false
    };
  }
}

/**
 * Fetch Indian holidays from Google Calendar API
 * @param {Date} startDate - Start date for range
 * @param {Date} endDate - End date for range
 * @returns {Promise<Array>} Array of holiday objects
 */
export async function fetchIndianHolidays(startDate, endDate) {
  try {
    const timeMin = startDate.toISOString();
    const timeMax = endDate.toISOString();

    const url = `${GOOGLE_CALENDAR_API}?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    return (data.items || []).map(event => ({
      date: event.start.date,
      name: event.summary,
      description: event.description || '',
      isPublicHoliday: event.description?.toLowerCase().includes('public holiday'),
      isObservance: event.description?.toLowerCase().includes('observance'),
      type: event.description?.toLowerCase().includes('public holiday') ? 'public' : 'observance'
    }));
  } catch (error) {
    console.error('Error fetching Indian holidays:', error);
    return [];
  }
}

/**
 * Get complete calendar info for the next day
 * Combines panchang data with Google Calendar holidays
 * @returns {Promise<Object>} Combined calendar info
 */
export async function getNextDayCalendarInfo() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(6, 0, 0, 0); // Set to morning for accurate tithi

  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  // Get panchang data
  const panchang = getPanchangData(tomorrow);

  // Fetch holidays for the day
  const holidays = await fetchIndianHolidays(tomorrow, dayAfter);

  // Get day info
  const dayName = tomorrow.toLocaleDateString('en-IN', { weekday: 'long' });
  const isWeekend = tomorrow.getDay() === 0 || tomorrow.getDay() === 6;

  // Determine business impact
  let businessImpact = 'normal';
  let impactReason = [];

  if (panchang.isChaturthi) {
    businessImpact = 'high';
    impactReason.push('Chaturthi - Ganesh worship day');
  }
  if (panchang.isPurnima) {
    businessImpact = 'high';
    impactReason.push('Purnima (Full Moon) - Auspicious day');
  }
  if (panchang.isEkadashi) {
    impactReason.push('Ekadashi - Fasting day');
  }
  if (panchang.isAmavasya) {
    impactReason.push('Amavasya (New Moon)');
  }
  if (isWeekend) {
    businessImpact = businessImpact === 'high' ? 'high' : 'medium';
    impactReason.push('Weekend');
  }

  const publicHolidays = holidays.filter(h => h.isPublicHoliday);
  if (publicHolidays.length > 0) {
    businessImpact = 'high';
    impactReason.push(...publicHolidays.map(h => h.name));
  }

  return {
    date: formatDateLocal(tomorrow),
    dayName,
    isWeekend,
    panchang: {
      tithi: panchang.tithi,
      nakshatra: panchang.nakshatra,
      isChaturthi: panchang.isChaturthi,
      isEkadashi: panchang.isEkadashi,
      isPurnima: panchang.isPurnima,
      isAmavasya: panchang.isAmavasya
    },
    holidays,
    businessImpact,
    impactReason,
    recommendation: getBusinessRecommendation(businessImpact, impactReason)
  };
}

/**
 * Get business recommendation based on calendar info
 */
function getBusinessRecommendation(impact, reasons) {
  if (impact === 'high') {
    return {
      type: 'increase',
      message: 'High demand expected',
      detail: reasons.join(', ')
    };
  } else if (impact === 'medium') {
    return {
      type: 'normal',
      message: 'Moderate demand',
      detail: reasons.join(', ')
    };
  }
  return {
    type: 'normal',
    message: 'Normal day',
    detail: ''
  };
}

/**
 * Check if a specific date has any special events (Chaturthi, Ekadashi, etc.)
 * @param {Date} date
 * @returns {Object} Special event info
 */
export function checkSpecialDay(date = new Date()) {
  const panchang = getPanchangData(date);

  const events = [];

  if (panchang.isChaturthi) {
    const isSankashti = panchang.tithi.paksha === PAKSHA.KRISHNA;
    events.push({
      name: isSankashti ? 'Sankashti Chaturthi' : 'Vinayaka Chaturthi',
      type: 'tithi',
      impact: 'high',
      emoji: '🙏'
    });
  }

  if (panchang.isEkadashi) {
    events.push({
      name: 'Ekadashi',
      type: 'tithi',
      impact: 'medium',
      emoji: '🙏'
    });
  }

  if (panchang.isPurnima) {
    events.push({
      name: 'Purnima (Full Moon)',
      type: 'tithi',
      impact: 'high',
      emoji: '🌕'
    });
  }

  if (panchang.isAmavasya) {
    events.push({
      name: 'Amavasya (New Moon)',
      type: 'tithi',
      impact: 'medium',
      emoji: '🌑'
    });
  }

  return {
    date: formatDateLocal(date),
    hasSpecialEvent: events.length > 0,
    events,
    panchang
  };
}

export default {
  getPanchangData,
  fetchIndianHolidays,
  getNextDayCalendarInfo,
  checkSpecialDay,
  IMPORTANT_TITHIS,
  PAKSHA
};
