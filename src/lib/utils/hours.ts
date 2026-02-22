/**
 * Parse business hours strings like "Mon-Fri 8am-5pm, Sat 9am-2pm"
 * into structured data for the contact page.
 */

interface BusinessHoursEntry {
  day: string;
  hours: string;
}

/**
 * Parse a business hours string into an array of {day, hours} objects.
 * Handles formats like:
 * - "Mon-Fri 8am-5pm, Sat 9am-2pm"
 * - "Mon-Fri 9am-5pm"
 * - "Monday-Friday 9:00 AM - 5:00 PM, Saturday: Closed, Sunday: Closed"
 */
export function parseBusinessHours(hoursString: string): BusinessHoursEntry[] {
  if (!hoursString || hoursString.trim() === '') {
    return [
      { day: 'Monday - Friday', hours: '9:00 AM - 5:00 PM' },
      { day: 'Saturday', hours: 'Closed' },
      { day: 'Sunday', hours: 'Closed' },
    ];
  }

  const DAY_EXPANSION: Record<string, string> = {
    'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday',
    'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday',
    'monday': 'Monday', 'tuesday': 'Tuesday', 'wednesday': 'Wednesday',
    'thursday': 'Thursday', 'friday': 'Friday', 'saturday': 'Saturday', 'sunday': 'Sunday',
  };

  function expandDay(d: string): string {
    return DAY_EXPANSION[d.toLowerCase()] || d;
  }

  function expandRange(range: string): string {
    const parts = range.split('-').map(p => expandDay(p.trim()));
    return parts.join(' - ');
  }

  // Split by comma or semicolon
  const segments = hoursString.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  const result: BusinessHoursEntry[] = [];

  for (const segment of segments) {
    // Try to split "Mon-Fri 8am-5pm" into days and hours
    // Pattern: day-range followed by time-range
    const match = segment.match(/^([A-Za-z-\s]+?)\s*:?\s*([\d:aApPmM\s-]+|Closed|closed|By Appointment)$/i);
    if (match && match[1] && match[2]) {
      result.push({
        day: expandRange(match[1].trim()),
        hours: match[2].trim(),
      });
    } else {
      // Fallback: treat entire segment as-is
      result.push({ day: segment, hours: '' });
    }
  }

  // If Saturday/Sunday not mentioned, add them as Closed
  const mentionedDays = result.map(r => r.day.toLowerCase()).join(' ');
  if (!mentionedDays.includes('saturday') && !mentionedDays.includes('sat')) {
    result.push({ day: 'Saturday', hours: 'Closed' });
  }
  if (!mentionedDays.includes('sunday') && !mentionedDays.includes('sun')) {
    result.push({ day: 'Sunday', hours: 'Closed' });
  }

  return result;
}
