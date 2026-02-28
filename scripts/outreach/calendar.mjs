#!/usr/bin/env node
/**
 * Apple Calendar integration via AppleScript.
 * Books 30-min call slots in the "Work" calendar.
 *
 * Available slots: 9:30am-3:30pm weekdays, 30-min intervals, skip noon.
 */

import { execSync } from 'node:child_process';

// ──────────────────────────────────────────────────────────
// Slot definitions
// ──────────────────────────────────────────────────────────

/** Available 30-min call slots (skip noon — 12:00-12:59) */
const SLOT_HOURS = [
  { hour: 9, min: 30 },
  { hour: 10, min: 0 },
  { hour: 10, min: 30 },
  { hour: 11, min: 0 },
  { hour: 11, min: 30 },
  // Skip noon
  { hour: 13, min: 0 },
  { hour: 13, min: 30 },
  { hour: 14, min: 0 },
  { hour: 14, min: 30 },
  { hour: 15, min: 0 },
];

// ──────────────────────────────────────────────────────────
// Query existing events
// ──────────────────────────────────────────────────────────

/**
 * Get existing events from "Work" calendar for a given date.
 * Returns array of { start: Date, end: Date, summary: string }.
 */
export function getEventsForDate(date) {
  const dateStr = formatAppleDate(date);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = formatAppleDate(nextDay);

  const script = `
tell application "Calendar"
  set workCal to calendar "Work"
  set dayStart to date "${dateStr} 12:00:00 AM"
  set dayEnd to date "${nextDayStr} 12:00:00 AM"
  set dayEvents to (every event of workCal whose start date >= dayStart and start date < dayEnd)
  set output to ""
  repeat with e in dayEvents
    set output to output & (start date of e as text) & "|" & (end date of e as text) & "|" & (summary of e) & "\\n"
  end repeat
  return output
end tell`;

  try {
    const result = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      timeout: 10000,
      encoding: 'utf-8',
    }).trim();

    if (!result) return [];

    return result.split('\n').filter(Boolean).map(line => {
      const [startStr, endStr, summary] = line.split('|');
      return {
        start: new Date(startStr),
        end: new Date(endStr),
        summary: summary || '',
      };
    });
  } catch (e) {
    // Calendar might not have events or app might not be responding
    console.warn(`Calendar query failed: ${e.message}`);
    return [];
  }
}

/**
 * Find the next available 30-min slot across the next N business days.
 * Returns { date: Date, timeLabel: string, slotStart: Date, slotEnd: Date } or null.
 */
export function findNextSlot(fromDate = new Date(), lookAheadDays = 10) {
  let current = new Date(fromDate);
  current.setDate(current.getDate() + 1); // Start from tomorrow

  let daysChecked = 0;

  while (daysChecked < lookAheadDays) {
    // Skip weekends
    if (current.getDay() === 0 || current.getDay() === 6) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    const events = getEventsForDate(current);

    for (const slot of SLOT_HOURS) {
      const slotStart = new Date(current);
      slotStart.setHours(slot.hour, slot.min, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + 30);

      // Check for conflicts
      const conflict = events.some(e => {
        return e.start < slotEnd && e.end > slotStart;
      });

      if (!conflict) {
        const timeLabel = formatTimeLabel(slot.hour, slot.min);
        return {
          date: new Date(current),
          timeLabel,
          slotStart,
          slotEnd,
        };
      }
    }

    current.setDate(current.getDate() + 1);
    daysChecked++;
  }

  return null; // No slot found in look-ahead window
}

// ──────────────────────────────────────────────────────────
// Create calendar event
// ──────────────────────────────────────────────────────────

/**
 * Book a 30-min call event in the "Work" calendar.
 */
export function createCalendarEvent({ summary, startDate, phone, notes }) {
  const endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + 30);

  const startStr = formatAppleDateTime(startDate);
  const endStr = formatAppleDateTime(endDate);

  // Escape special chars for AppleScript
  const safeSummary = summary.replace(/"/g, '\\"');
  const safePhone = (phone || '').replace(/"/g, '\\"');
  const safeNotes = (notes || '').replace(/"/g, '\\"').replace(/\n/g, '\\n');

  const script = `
tell application "Calendar"
  set workCal to calendar "Work"
  set newEvent to make new event at end of events of workCal with properties {summary:"${safeSummary}", start date:date "${startStr}", end date:date "${endStr}", location:"${safePhone}", description:"${safeNotes}"}
  return "OK"
end tell`;

  try {
    const result = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      timeout: 10000,
      encoding: 'utf-8',
    }).trim();
    return { success: result === 'OK', error: null };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function formatAppleDate(date) {
  // AppleScript needs "Month Day, Year" format
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatAppleDateTime(date) {
  return date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatTimeLabel(hour, min) {
  const suffix = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour > 12 ? hour - 12 : hour;
  const displayMin = min === 0 ? '' : `:${String(min).padStart(2, '0')}`;
  return `${displayHour}${displayMin}${suffix}`;
}

/**
 * Format a slot for the email template (e.g., "10:30am", "2pm").
 */
export function formatSlotForEmail(slot) {
  if (!slot) return '10:30am'; // Default fallback
  return slot.timeLabel;
}
