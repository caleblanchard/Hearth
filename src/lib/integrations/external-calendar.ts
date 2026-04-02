/**
 * External Calendar Integration
 *
 * Handles fetching and parsing external calendar subscriptions (iCal/ICS/webcal).
 * Supports standard calendar formats including iCal, WebCal, and HTTP/HTTPS URLs.
 */

import ICAL from 'ical.js';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { logger } from '@/lib/logger';

interface ParsedEvent {
  uid: string;
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location?: string | null;
  url?: string | null;
  recurrenceRule?: string | null;
  lastModified?: Date | null;
}

interface FetchResult {
  events: ParsedEvent[];
  etag?: string | null;
  lastModified?: string | null;
}

/**
 * Normalize calendar URL to HTTP/HTTPS
 * Converts webcal:// URLs to http:// or https://
 */
function normalizeCalendarUrl(url: string): string {
  // Replace webcal:// with http://
  let normalized = url.replace(/^webcal:\/\//i, 'http://');
  
  // If it's already http://, ensure it's https:// for security (unless explicitly http)
  if (normalized.startsWith('http://') && !normalized.includes('localhost')) {
    normalized = normalized.replace(/^http:\/\//i, 'https://');
  }
  
  return normalized;
}

/**
 * Fetch calendar data from URL
 * Supports HTTP, HTTPS, and WebCal protocols
 * For Google Calendar, adds date range parameters to limit results
 */
export async function fetchCalendarData(url: string, etag?: string | null): Promise<{
  data: string;
  etag?: string | null;
  lastModified?: string | null;
}> {
  let normalizedUrl = normalizeCalendarUrl(url);
  
  // For Google Calendar URLs, add date range parameters to limit results
  // This helps reduce the amount of old data returned
  if (normalizedUrl.includes('calendar.google.com') || normalizedUrl.includes('google.com/calendar')) {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 12); // 12 months ago
    
    // Format dates as YYYYMMDD
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}${month}${day}`;
    };
    
    const startParam = formatDate(startDate);
    const endParam = formatDate(new Date(now.getFullYear() + 5, 11, 31)); // 5 years in future
    
    // Add parameters if not already present
    const urlObj = new URL(normalizedUrl);
    if (!urlObj.searchParams.has('start-min')) {
      urlObj.searchParams.set('start-min', startParam);
    }
    if (!urlObj.searchParams.has('start-max')) {
      urlObj.searchParams.set('start-max', endParam);
    }
    normalizedUrl = urlObj.toString();
  }
  
  const headers: HeadersInit = {
    'User-Agent': 'Hearth-Calendar-Sync/1.0',
    'Accept': 'text/calendar, application/calendar+json, */*',
  };

  // Include If-None-Match header if we have an ETag (for conditional requests)
  if (etag) {
    headers['If-None-Match'] = etag;
  }

  try {
    const response = await fetch(normalizedUrl, {
      headers,
      // Set a reasonable timeout (30 seconds)
      signal: AbortSignal.timeout(30000),
    });

    // If 304 Not Modified, return empty data (no changes)
    if (response.status === 304) {
      return {
        data: '',
        etag: etag || response.headers.get('ETag'),
        lastModified: response.headers.get('Last-Modified'),
      };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.text();
    const responseEtag = response.headers.get('ETag');
    const responseLastModified = response.headers.get('Last-Modified');

    return {
      data,
      etag: responseEtag || etag,
      lastModified: responseLastModified,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: Calendar server did not respond in time');
      }
      throw new Error(`Failed to fetch calendar: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parse iCal/ICS data into structured events
 */
export function parseICalData(icalData: string): ParsedEvent[] {
  if (!icalData || !icalData.trim()) {
    return [];
  }

  try {
    const jcalData = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcalData);
    
    // Set up timezone support - ICAL.js needs timezone data for proper conversion
    // Register VTIMEZONE components so ICAL.js can use them for conversion
    const vtimezones = comp.getAllSubcomponents('vtimezone');
    if (vtimezones.length > 0) {
      logger.info(`Found ${vtimezones.length} VTIMEZONE component(s) in calendar`);
      // Register each timezone with ICAL.js
      for (const vtimezone of vtimezones) {
        const tzid = vtimezone.getFirstPropertyValue('tzid');
        if (tzid) {
          try {
            // Create a timezone and register it
            // ICAL.js will automatically use registered timezones when parsing events
            const timezone = new ICAL.Timezone({
              component: vtimezone,
              tzid: tzid,
            });
            // Register with ICAL.TimezoneService if available
            if (ICAL.TimezoneService && typeof ICAL.TimezoneService.register === 'function' && typeof tzid === 'string') {
              // ICAL.TimezoneService.register expects (timezone, tzid) based on type definitions
              (ICAL.TimezoneService.register as any)(timezone, tzid);
              logger.info(`Registered timezone: ${tzid}`);
            } else {
              // Fallback: ICAL.js should still use the timezone from the component
              logger.debug(`Timezone service not available, but ICAL.js should use timezone from component: ${tzid}`);
            }
          } catch (tzError) {
            logger.warn(`Failed to register timezone ${tzid}`, {
              error: tzError instanceof Error ? tzError.message : String(tzError),
            });
          }
        }
      }
    } else {
      logger.warn('No VTIMEZONE components found in calendar - timezone conversion may be incorrect');
    }
    
    const vevents = comp.getAllSubcomponents('vevent');

    const events: ParsedEvent[] = [];
    
    // Date range for expanding recurring events (12 months in the past to 5 years in the future)
    const now = new Date();
    const expandStart = new Date(now);
    expandStart.setMonth(now.getMonth() - 12); // 12 months ago
    expandStart.setHours(0, 0, 0, 0); // Start of day
    const expandEnd = new Date(now);
    expandEnd.setFullYear(now.getFullYear() + 5); // 5 years in the future
    expandEnd.setHours(23, 59, 59, 999); // End of day
    
    logger.info(`Filtering events to date range: ${expandStart.toISOString()} to ${expandEnd.toISOString()}`);
    
    const expandStartTime = ICAL.Time.fromJSDate(expandStart, true);
    const expandEndTime = ICAL.Time.fromJSDate(expandEnd, true);

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);

      // Get UID (required for deduplication)
      const uidProp = vevent.getFirstPropertyValue('uid');
      const uid = (typeof uidProp === 'string' ? uidProp : null) || (event.uid && typeof event.uid === 'string' ? event.uid : null);
      if (!uid) {
        logger.warn('Skipping event without UID');
        continue;
      }

      // Get title
      const summaryProp = vevent.getFirstPropertyValue('summary');
      const summary = (typeof summaryProp === 'string' ? summaryProp : null) || (event.summary && typeof event.summary === 'string' ? event.summary : null) || 'Untitled Event';

      // Get description
      const descriptionProp = vevent.getFirstPropertyValue('description');
      const description = (typeof descriptionProp === 'string' ? descriptionProp : null) || (event.description && typeof event.description === 'string' ? event.description : null) || null;

      // Get location
      const locationProp = vevent.getFirstPropertyValue('location');
      const location = (typeof locationProp === 'string' ? locationProp : null) || (event.location && typeof event.location === 'string' ? event.location : null) || null;

      // Get URL
      const urlProp = vevent.getFirstPropertyValue('url');
      const url = typeof urlProp === 'string' ? urlProp : null;

      // Get recurrence rule
      const rrule = vevent.getFirstPropertyValue('rrule') || null;

      // Get last modified
      const lastModifiedProp = vevent.getFirstPropertyValue('last-modified');
      const lastModified = lastModifiedProp && typeof lastModifiedProp === 'string' ? new Date(lastModifiedProp) : null;

      // Get start and end times with proper timezone handling
      const startDate = event.startDate;
      const endDate = event.endDate;
      
      if (!startDate || !endDate) {
        logger.warn(`Skipping event ${uid}: missing start or end date`);
        continue;
      }
      
      // Log timezone info for debugging
      const timezone = startDate.zone?.tzid || 'floating';
      
      // Determine if all-day event (must be done before conversion)
      const isAllDay = event.startDate?.isDate || false;
      
      // Convert to JavaScript Date
      // ICAL.js should handle timezone conversion automatically
      // The key is that ICAL.js needs the timezone to be registered or available
      // If timezone is not recognized, it treats it as "floating" (no conversion)
      const startTime = startDate.toJSDate();
      const endTime = endDate.toJSDate();
      
      // Log the conversion for debugging timezone issues (only first few events)
      if (events.length < 5 && timezone !== 'floating' && timezone !== 'UTC' && !isAllDay) {
        // Calculate what the time should be in ET
        const etTime = startTime.toLocaleString('en-US', { 
          timeZone: 'America/New_York', 
          hour12: false,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });
        
        // Get the original time string from the iCal
        const originalTimeStr = startDate.toString();
        
        logger.info(`Event timezone conversion: ${summary}`, {
          originalICalTime: originalTimeStr,
          timezone: timezone,
          storedUTC: startTime.toISOString(),
          displayedET: etTime,
          // If original was "20250903T150000" in ET, UTC should be 4-5 hours later
          // If we see the same hour, timezone conversion failed
        });
      }
      
      // If timezone is floating, log a warning as this might indicate a problem
      if (timezone === 'floating' && !isAllDay) {
        logger.warn(`Event ${summary} has floating time (no timezone) - this may cause display issues`);
      }

      // Check if this is a recurring event
      if (event.isRecurring()) {
        logger.info(`Processing recurring event: ${summary}`, {
          uid: typeof uid === 'string' ? uid.substring(0, 50) : String(uid).substring(0, 50),
          hasRRule: !!rrule,
          baseStartTime: startTime.toISOString(),
          rruleString: rrule ? JSON.stringify(rrule) : null,
        });
        
        try {
          // Expand recurring events to get all instances within our date range
          // Skip if this is a recurrence exception (has RECURRENCE-ID)
          const recurrenceId = vevent.getFirstPropertyValue('recurrence-id');
          if (recurrenceId) {
            logger.debug(`Skipping recurrence exception: ${summary} (RECURRENCE-ID present)`);
            // Recurrence exceptions are handled separately, skip expansion
            if (startTime >= expandStart && startTime <= expandEnd) {
              events.push({
                uid,
                title: summary,
                description,
                startTime,
                endTime,
                isAllDay,
                location,
                url,
                recurrenceRule: null, // Exceptions don't have RRULE
                lastModified,
              });
            }
            continue;
          }
          
          // This is the master recurring event, expand it using ICAL.js iterator
          // ICAL.js uses an iterator pattern for recurring events
          const iterator = event.iterator();
          const occurrences: ICAL.Time[] = [];
          
          // Iterate through occurrences until we exceed our end date
          let occurrence: ICAL.Time | null = null;
          const maxIterations = 10000; // Safety limit to prevent infinite loops
          let iterations = 0;
          
          while (iterations < maxIterations) {
            occurrence = iterator.next();
            if (!occurrence) {
              break;
            }
            
            // Check if we've gone past our end date
            if (occurrence.compare(expandEndTime) > 0) {
              break;
            }
            
            // Only include occurrences within our date range
            if (occurrence.compare(expandStartTime) >= 0) {
              occurrences.push(occurrence);
            }
            
            iterations++;
          }
          
          logger.info(`Recurring event expansion result: ${summary}`, {
            occurrencesFound: occurrences.length,
            iterations: iterations,
            dateRange: {
              start: expandStart.toISOString(),
              end: expandEnd.toISOString(),
            },
          });
          
          if (occurrences.length === 0) {
            logger.warn(`Recurring event ${summary} has no occurrences in date range - this might indicate an issue with the recurrence rule`);
            // Still add the base event if it's in range
            if (startTime >= expandStart && startTime <= expandEnd) {
              logger.info(`Adding base recurring event (no occurrences found): ${summary}`);
              events.push({
                uid,
                title: summary,
                description,
                startTime,
                endTime,
                isAllDay,
                location,
                url,
                recurrenceRule: rrule ? JSON.stringify(rrule) : null,
                lastModified,
              });
            }
          } else {
            logger.info(`Expanding recurring event: ${summary} - ${occurrences.length} occurrences`);
            
            let occurrencesAdded = 0;
            for (const occurrenceTime of occurrences) {
              try {
                // Convert ICAL.Time to JavaScript Date
                // ICAL.js handles timezone conversion automatically
                const occurrenceStart = occurrenceTime.toJSDate();
                
                // Double-check the occurrence is within our range (should be, but be safe)
                if (occurrenceStart < expandStart || occurrenceStart > expandEnd) {
                  logger.debug(`Skipping occurrence outside range: ${occurrenceStart.toISOString()}`);
                  continue;
                }
                
                // Calculate end time using the event's duration
                // Duration is in ICAL.Duration format
                const duration = event.duration;
                const occurrenceEnd = duration 
                  ? new Date(occurrenceStart.getTime() + duration.toSeconds() * 1000)
                  : new Date(occurrenceStart.getTime() + 60 * 60 * 1000); // 1 hour default if no duration
                
                // Create unique UID for each occurrence
                // Use a format that includes the original UID and the occurrence time
                const occurrenceUid = `${uid}-${occurrenceStart.getTime()}`;
                
                events.push({
                  uid: occurrenceUid,
                  title: summary,
                  description,
                  startTime: occurrenceStart,
                  endTime: occurrenceEnd,
                  isAllDay,
                  location,
                  url,
                  recurrenceRule: rrule ? JSON.stringify(rrule) : null,
                  lastModified,
                });
                occurrencesAdded++;
                
                if (occurrencesAdded <= 3) {
                  logger.debug(`Added occurrence ${occurrencesAdded}: ${summary} at ${occurrenceStart.toISOString()}`);
                }
              } catch (occurrenceError) {
                logger.error(`Failed to process occurrence for ${summary}:`, {
                  error: occurrenceError,
                  occurrence: occurrenceTime ? occurrenceTime.toString() : 'null',
                  errorMessage: occurrenceError instanceof Error ? occurrenceError.message : String(occurrenceError),
                });
                // Continue with next occurrence
              }
            }
            
            logger.info(`Successfully expanded recurring event: ${summary} - ${occurrencesAdded} occurrences added (out of ${occurrences.length} total)`);
          }
        } catch (recurError) {
          // If expansion fails, check if base event is within range before adding
          logger.error(`Failed to expand recurring event ${uid} (${summary}):`, {
            error: recurError,
            errorMessage: recurError instanceof Error ? recurError.message : String(recurError),
            errorStack: recurError instanceof Error ? recurError.stack : undefined,
            rrule: rrule ? JSON.stringify(rrule) : null,
            eventComponent: vevent.toString().substring(0, 500), // First 500 chars for debugging
          });
          
          // Fall back to base event if in range
          if (startTime >= expandStart && startTime <= expandEnd) {
            logger.warn(`Adding base recurring event as fallback (expansion failed): ${summary}`);
            events.push({
              uid,
              title: summary,
              description,
              startTime,
              endTime,
              isAllDay,
              location,
              url,
              recurrenceRule: rrule ? JSON.stringify(rrule) : null,
              lastModified,
            });
          }
        }
      } else {
        // Non-recurring event - only include if it's within our date range (last 12 months to future)
        if (startTime >= expandStart && startTime <= expandEnd) {
          events.push({
            uid,
            title: summary,
            description,
            startTime,
            endTime,
            isAllDay,
            location,
            url,
            recurrenceRule: null,
            lastModified,
          });
        } else {
          logger.debug(`Skipping event outside date range: ${summary} (${startTime.toISOString()})`);
        }
      }
    }

    // Events are already filtered by date range during parsing, so just log statistics
    const nowForLogging = new Date();
    const twelveMonthsAgoForLogging = new Date(nowForLogging);
    twelveMonthsAgoForLogging.setMonth(nowForLogging.getMonth() - 12);
    const fiveYearsFutureForLogging = new Date(nowForLogging);
    fiveYearsFutureForLogging.setFullYear(nowForLogging.getFullYear() + 5);
    
    const futureEventsCount = events.filter(e => e.startTime > nowForLogging).length;
    const pastEventsCount = events.filter(e => e.startTime <= nowForLogging && e.startTime >= twelveMonthsAgoForLogging).length;
    
    logger.info(`Parsed ${events.length} events from iCal data (${vevents.length} base events)`, {
      totalParsed: events.length,
      futureEvents: futureEventsCount,
      pastEvents: pastEventsCount,
      dateRange: {
        from: twelveMonthsAgoForLogging.toISOString(),
        to: fiveYearsFutureForLogging.toISOString(),
      },
      sampleEvents: events.slice(0, 5).map(e => ({
        title: e.title,
        startTime: e.startTime.toISOString(),
      })),
    });
    
    return events;
  } catch (error) {
    logger.error('Failed to parse iCal data', { error });
    throw new Error(`Invalid calendar format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Sync external calendar subscription
 * Fetches calendar data, parses events, and creates/updates calendar events
 */
export async function syncExternalCalendar(
  subscriptionId: string,
  supabaseClient?: SupabaseClient<Database>
): Promise<{
  success: boolean;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  error?: string;
}> {
  const supabase = supabaseClient ?? (await createClient());
  
  const { data: subscription } = await supabase
    .from('external_calendar_subscriptions')
    .select(`
      *,
      family:families(*)
    `)
    .eq('id', subscriptionId)
    .single();

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  if (!subscription.is_active) {
    logger.info('Subscription is inactive, skipping sync', { subscriptionId });
    return {
      success: true,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
    };
  }

  const syncStartTime = Date.now();
  
  try {
    // Fetch calendar data
    const { data, etag, lastModified } = await fetchCalendarData(
      subscription.url,
      subscription.etag
    );

    // If no data (304 Not Modified), no changes
    if (!data) {
      await supabase
        .from('external_calendar_subscriptions')
        .update({
          last_sync_at: new Date().toISOString(),
          last_successful_sync_at: new Date().toISOString(),
          sync_status: 'ACTIVE',
          sync_error: null,
          next_sync_at: new Date(Date.now() + subscription.refresh_interval * 60 * 1000).toISOString(),
        })
        .eq('id', subscriptionId);

      return {
        success: true,
        eventsCreated: 0,
        eventsUpdated: 0,
        eventsDeleted: 0,
      };
    }

    // Parse events
    const parsedEvents = parseICalData(data);
    
    // Analyze date range of parsed events
    const nowForAnalysis = new Date();
    const twelveMonthsAgoForAnalysis = new Date(nowForAnalysis);
    twelveMonthsAgoForAnalysis.setMonth(nowForAnalysis.getMonth() - 12);
    
    const eventDates = parsedEvents.map(e => e.startTime).sort((a, b) => a.getTime() - b.getTime());
    const earliestEvent = eventDates[0];
    const latestEvent = eventDates[eventDates.length - 1];
    const eventsInRange = parsedEvents.filter(e => e.startTime >= twelveMonthsAgoForAnalysis).length;
    const futureEvents = parsedEvents.filter(e => e.startTime > nowForAnalysis).length;
    
    logger.info(`Parsed ${parsedEvents.length} events from calendar`, {
      subscriptionId,
      eventCount: parsedEvents.length,
      eventsInRange: eventsInRange,
      futureEvents: futureEvents,
      dateRange: {
        earliest: earliestEvent?.toISOString(),
        latest: latestEvent?.toISOString(),
        filterStart: twelveMonthsAgoForAnalysis.toISOString(),
        now: nowForAnalysis.toISOString(),
      },
      sampleEvents: parsedEvents.slice(0, 5).map(e => ({
        title: e.title,
        startTime: e.startTime.toISOString(),
        uid: typeof e.uid === 'string' ? e.uid.substring(0, 30) : String(e.uid).substring(0, 30),
      })),
    });

    // Get existing events from this subscription
    const { data: existingEvents } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('external_subscription_id', subscriptionId);
    
    logger.info(`Found ${existingEvents?.length || 0} existing events for subscription`, {
      subscriptionId,
    });

    // Create maps for matching events
    // Map by exact UID match
    const existingEventsByUid = new Map(
      (existingEvents || []).map((e) => [e.external_id || '', e])
    );
    
    // Map by startTime + title for recurring events (since UIDs might differ)
    // Key format: startTime-timestamp + title
    const existingEventsByTimeAndTitle = new Map<string, NonNullable<typeof existingEvents>[0]>();
    for (const e of (existingEvents || [])) {
      // Use startTime (rounded to nearest minute) + title as key for recurring events
      const timeKey = `${Math.floor(new Date(e.start_time).getTime() / 60000)}-${e.title}`;
      if (!existingEventsByTimeAndTitle.has(timeKey)) {
        existingEventsByTimeAndTitle.set(timeKey, e);
      }
    }

    let eventsCreated = 0;
    let eventsUpdated = 0;
    const processedUids = new Set<string>();

    // Process each parsed event
    for (const parsedEvent of parsedEvents) {
      processedUids.add(parsedEvent.uid);

      // Try to find existing event by exact UID match first
      let existingEvent = existingEventsByUid.get(parsedEvent.uid);
      
      // If not found, try matching by startTime + title (for recurring events)
      // This handles cases where UIDs might differ between syncs
      if (!existingEvent) {
        const timeKey = `${Math.floor(parsedEvent.startTime.getTime() / 60000)}-${parsedEvent.title}`;
        existingEvent = existingEventsByTimeAndTitle.get(timeKey);
        
        // Also try a more lenient match: same subscription, same title, startTime within 1 minute
        if (!existingEvent) {
          existingEvent = (existingEvents || []).find(
            (e) =>
              e.external_subscription_id === subscriptionId &&
              e.title === parsedEvent.title &&
              Math.abs(new Date(e.start_time).getTime() - parsedEvent.startTime.getTime()) < 60000 // Within 1 minute
          );
        }
      }

      if (existingEvent) {
        // Check if event needs update (compare updatedAt or times)
        const needsUpdate =
          !existingEvent.updated_at ||
          (parsedEvent.lastModified &&
            new Date(existingEvent.updated_at) < parsedEvent.lastModified) ||
          new Date(existingEvent.start_time).getTime() !== parsedEvent.startTime.getTime() ||
          new Date(existingEvent.end_time).getTime() !== parsedEvent.endTime.getTime() ||
          existingEvent.title !== parsedEvent.title;

        if (needsUpdate) {
          await supabase
            .from('calendar_events')
            .update({
              title: parsedEvent.title,
              description: parsedEvent.description,
              start_time: parsedEvent.startTime.toISOString(),
              end_time: parsedEvent.endTime.toISOString(),
              is_all_day: parsedEvent.isAllDay,
              location: parsedEvent.location,
              color: subscription.color || '#9CA3AF', // Update color from subscription
              last_synced_at: (parsedEvent.lastModified || new Date()).toISOString(),
            })
            .eq('id', existingEvent.id);
          eventsUpdated++;
        }
      } else {
        // Create new event
        try {
          const { data: newEvent } = await supabase
            .from('calendar_events')
            .insert({
              family_id: subscription.family_id,
              title: parsedEvent.title,
              description: parsedEvent.description,
              start_time: parsedEvent.startTime.toISOString(),
              end_time: parsedEvent.endTime.toISOString(),
              is_all_day: parsedEvent.isAllDay,
              location: parsedEvent.location,
              color: subscription.color || '#9CA3AF', // Use subscription color or default gray
              external_subscription_id: subscriptionId,
              external_id: parsedEvent.uid, // Store UID in external_id field
              created_by_id: subscription.created_by_id, // Required: use subscription creator
              last_synced_at: (parsedEvent.lastModified || new Date()).toISOString(),
            })
            .select()
            .single();
          eventsCreated++;
          
          if (eventsCreated <= 5) {
            logger.debug(`Created event: ${parsedEvent.title} (${parsedEvent.startTime.toISOString()})`);
          }
        } catch (createError) {
          logger.error(`Failed to create event: ${parsedEvent.title}`, {
            error: createError,
            eventData: {
              title: parsedEvent.title,
              startTime: parsedEvent.startTime.toISOString(),
              uid: parsedEvent.uid,
            },
          });
          // Continue with other events even if one fails
        }
      }
    }

    // Delete events that are no longer in the calendar
    const uidsToDelete = (existingEvents || [])
      .filter((e) => e.external_id && !processedUids.has(e.external_id))
      .map((e) => e.id);

    // Also delete events that are older than 12 months (outside our sync range)
    const cleanupDate = new Date();
    cleanupDate.setMonth(cleanupDate.getMonth() - 12);
    
    const oldEventsToDelete = (existingEvents || [])
      .filter((e) => {
        const eventStart = new Date(e.start_time);
        return eventStart < cleanupDate;
      })
      .map((e) => e.id);

    // Combine both sets of events to delete
    const allEventsToDelete = [...new Set([...uidsToDelete, ...oldEventsToDelete])];

    let eventsDeleted = 0;
    if (allEventsToDelete.length > 0) {
      await supabase
        .from('calendar_events')
        .delete()
        .in('id', allEventsToDelete);
      eventsDeleted = allEventsToDelete.length;
      
      if (oldEventsToDelete.length > 0) {
        logger.info(`Deleted ${oldEventsToDelete.length} events older than 12 months`);
      }
    }

    // Update subscription with sync results
    await supabase
      .from('external_calendar_subscriptions')
      .update({
        last_sync_at: new Date().toISOString(),
        last_successful_sync_at: new Date().toISOString(),
        sync_status: 'ACTIVE',
        sync_error: null,
        etag: etag || subscription.etag,
        next_sync_at: new Date(Date.now() + subscription.refresh_interval * 60 * 1000).toISOString(),
      })
      .eq('id', subscriptionId);

    // Create sync log
    const syncDuration = Date.now() - syncStartTime;
    await supabase
      .from('calendar_sync_logs')
      .insert({
        family_id: subscription.family_id,
        external_subscription_id: subscriptionId,
        sync_direction: 'IMPORT', // External -> App
        status: 'SUCCESS',
        events_added: eventsCreated,
        events_updated: eventsUpdated,
        events_deleted: eventsDeleted,
        duration: syncDuration,
      });

    logger.info('External calendar sync completed', {
      subscriptionId,
      eventsCreated,
      eventsUpdated,
      eventsDeleted,
    });

    return {
      success: true,
      eventsCreated,
      eventsUpdated,
      eventsDeleted,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Update subscription with error
    await supabase
      .from('external_calendar_subscriptions')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: 'ERROR',
        sync_error: errorMessage,
      })
      .eq('id', subscriptionId);

    // Create sync log with error
    const syncDuration = Date.now() - syncStartTime;
    await supabase
      .from('calendar_sync_logs')
      .insert({
        family_id: subscription?.family_id || '',
        external_subscription_id: subscriptionId,
        sync_direction: 'IMPORT', // External -> App
        status: 'FAILED',
        error_message: errorMessage,
        duration: syncDuration,
      });

    logger.error('External calendar sync failed', {
      subscriptionId,
      error: errorMessage,
    });

    return {
      success: false,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      error: errorMessage,
    };
  }
}

/**
 * Validate calendar URL
 * Checks if URL is accessible and returns valid iCal data
 */
export async function validateCalendarUrl(url: string): Promise<{
  valid: boolean;
  error?: string;
  eventCount?: number;
}> {
  try {
    const { data } = await fetchCalendarData(url);

    if (!data || !data.trim()) {
      return {
        valid: false,
        error: 'Calendar URL returned empty data',
      };
    }

    // Try to parse the data
    const events = parseICalData(data);

    return {
      valid: true,
      eventCount: events.length,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
