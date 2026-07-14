/**
 * Get today's date in YYYY-MM-DD format using local timezone
 * @returns {string}
 */
export function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get yesterday's date in YYYY-MM-DD format using local timezone
 * @returns {string}
 */
export function getYesterdayDate() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date object to YYYY-MM-DD using local timezone
 * @param {Date} date
 * @returns {string}
 */
export function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to a Date object in local timezone
 * @param {string} dateStr
 * @returns {Date}
 */
export function parseDateLocal(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Business day ends at 6 AM (not midnight)
 * Orders placed between 12 AM - 6 AM are considered part of the previous day
 */
export const BUSINESS_DAY_END_HOUR = 6;

/**
 * Get the delivery date based on business day logic
 * Business day ends at 6 AM - if ordering between 12 AM - 6 AM, delivery is same day
 * @returns {Date}
 */
export function getDeliveryDate() {
  const now = new Date();
  const currentHour = now.getHours();

  const deliveryDate = new Date();
  if (currentHour >= BUSINESS_DAY_END_HOUR) {
    // After 6 AM - normal next day delivery
    deliveryDate.setDate(deliveryDate.getDate() + 1);
  }
  // Before 6 AM - delivery date stays as today (same business day)

  return deliveryDate;
}

/**
 * Get the current business date (accounting for 6 AM cutoff)
 * If it's between 12 AM - 6 AM, business date is still "yesterday"
 * @returns {string} YYYY-MM-DD format
 */
export function getBusinessDate() {
  const now = new Date();
  const currentHour = now.getHours();

  if (currentHour < BUSINESS_DAY_END_HOUR) {
    // Before 6 AM - business date is previous calendar day
    now.setDate(now.getDate() - 1);
  }

  return formatDateLocal(now);
}
