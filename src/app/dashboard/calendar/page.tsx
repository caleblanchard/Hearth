'use client';

// Force dynamic rendering to avoid useSearchParams SSG issues
export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { useSearchParams } from 'next/navigation';
import { Modal, ConfirmModal, AlertModal } from '@/components/ui/Modal';
import MealDetailModal from '@/components/meals/MealDetailModal';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  CalendarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { CakeIcon } from '@heroicons/react/24/solid';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  color: string;
  isAllDay: boolean;
  isMeal?: boolean;
  mealData?: any;
  createdBy: {
    id: string;
    name: string;
  };
  assignments: {
    id: string;
    member: {
      id: string;
      name: string;
      avatarUrl?: string;
    };
  }[];
}

interface FamilyMember {
  id: string;
  name: string;
  avatarUrl?: string;
}

type CalendarView = 'month' | 'week' | 'day';

export default function CalendarPage() {
  const { user, loading: sessionLoading } = useSupabaseSession();
  const searchParams = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [weekStartDay, setWeekStartDay] = useState<'SUNDAY' | 'MONDAY'>('MONDAY');
  const [familyTimezone, setFamilyTimezone] = useState<string>('America/New_York');
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [selectedWeekDay, setSelectedWeekDay] = useState<Date>(new Date());
  const [isMobile, setIsMobile] = useState(false);

  // Helper: Get current date in family timezone
  const getNowInTimezone = (): Date => {
    const now = new Date();
    const timeString = now.toLocaleString('en-US', { timeZone: familyTimezone });
    return new Date(timeString);
  };

  // Helper: Calculate week start based on family preference
  const getWeekStartDate = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    if (weekStartDay === 'SUNDAY') {
      const diff = day; // Days since Sunday
      d.setDate(d.getDate() - diff);
    } else {
      const diff = day === 0 ? 6 : day - 1; // Days since Monday
      d.setDate(d.getDate() - diff);
    }
    
    return d;
  };

  // Helper: Get ordered week day names based on family preference
  const getWeekDayNames = (short: boolean = true): string[] => {
    const shortNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const longNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const names = short ? shortNames : longNames;
    
    if (weekStartDay === 'MONDAY') {
      // Rotate array: [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
      return [...names.slice(1), names[0]];
    }
    return names; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  };

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    color: '#3b82f6',
    isAllDay: false,
    assignedMemberIds: [] as string[],
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    eventId: string;
    eventTitle: string;
  }>({ isOpen: false, eventId: '', eventTitle: '' });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const [selectedMeal, setSelectedMeal] = useState<any>(null);
  const [showMealModal, setShowMealModal] = useState(false);

  const weekScrollRef = useRef<HTMLDivElement>(null);
  const weekScrollMobileRef = useRef<HTMLDivElement>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);


  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchEvents = async (date: Date, viewType: CalendarView = view, background = false) => {
    try {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      let startDate: Date;
      let endDate: Date;

      if (viewType === 'day') {
        // Single day
        startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
      } else if (viewType === 'week') {
        // Week view - get the week containing the date respecting family week start
        startDate = getWeekStartDate(date);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Month view
        const year = date.getFullYear();
        const month = date.getMonth();
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0, 23, 59, 59);
      }

      // Fetch regular calendar events
      const response = await fetch(
        `/api/calendar/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      
      let calendarEvents: CalendarEvent[] = [];
      if (response.ok) {
        const data = await response.json();
        calendarEvents = data.events || [];
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Calendar] Failed to fetch events:', response.status, errorData);
      }

      // Fetch meal plan events
      const mealEvents = await fetchMealEvents(startDate, endDate);

      // Combine events
      const combinedEvents = [...calendarEvents, ...mealEvents];
      setEvents(combinedEvents);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setEvents([]); // Set empty array on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMealEvents = async (startDate: Date, endDate: Date): Promise<CalendarEvent[]> => {
    try {
      // Get week start based on family setting
      const getWeekStart = (d: Date): Date => {
        const date = new Date(d);
        date.setUTCHours(0, 0, 0, 0);
        const day = date.getUTCDay();
        
        if (weekStartDay === 'SUNDAY') {
          // Get Sunday of the week
          const diff = date.getUTCDate() - day;
          date.setUTCDate(diff);
        } else {
          // Get Monday of the week
          const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
          date.setUTCDate(diff);
        }
        
        return date;
      };

      const weekStart = getWeekStart(startDate);
      const weekStr = weekStart.toISOString().split('T')[0];

      console.log('[Calendar] Current date:', new Date());
      console.log('[Calendar] Start date:', startDate);
      console.log('[Calendar] Week start for query:', weekStart);
      console.log('[Calendar] Week string:', weekStr);

      const response = await fetch(`/api/meals/plan?week=${weekStr}`);
      if (!response.ok) return [];

      const data = await response.json();
      console.log('[Calendar] Meal plan data:', data);
      
      if (!data.mealPlan || !data.mealPlan.meals) {
        console.log('[Calendar] No meal plan or meals found');
        return [];
      }

      // Filter meals within date range and convert to calendar events
      const mealEvents: CalendarEvent[] = [];
      
      for (const meal of data.mealPlan.meals) {
        console.log('[Calendar] Processing meal:', meal);
        const mealDate = new Date(meal.date);
        
        // Compare dates by day (ignore time) to avoid timezone issues
        const mealDay = new Date(mealDate.getUTCFullYear(), mealDate.getUTCMonth(), mealDate.getUTCDate());
        const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        // Skip if outside date range
        if (mealDay < startDay || mealDay > endDay) continue;

        // Skip if no dishes
        if (!meal.dishes || meal.dishes.length === 0) {
          // Fallback to customName for legacy meals
          if (!meal.customName) continue;
        }

        // Get meal time based on type
        const { hour, duration } = getMealTime(meal.mealType);
        
        // Create date in LOCAL timezone (not UTC) so it displays at correct time
        const mealDateObj = new Date(mealDate);
        const localDate = new Date(
          mealDateObj.getUTCFullYear(),
          mealDateObj.getUTCMonth(),
          mealDateObj.getUTCDate(),
          hour,
          0,
          0,
          0
        );
        
        const startTime = localDate;
        const endTime = new Date(localDate);
        endTime.setHours(hour + duration, 0, 0, 0);

        // Use first dish name or customName
        const title = meal.dishes && meal.dishes.length > 0
          ? meal.dishes[0].dishName
          : meal.customName || meal.mealType;

        mealEvents.push({
          id: `meal-${meal.id}`,
          title: title,
          description: meal.notes || undefined,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          location: undefined,
          color: '#f97316', // Orange for meals
          isAllDay: false,
          isMeal: true,
          mealData: meal,
          createdBy: {
            id: 'system',
            name: 'Meal Plan',
          },
          assignments: [],
        });
      }

      return mealEvents;
    } catch (error) {
      console.error('Failed to fetch meal events:', error);
      return [];
    }
  };

  const getMealTime = (mealType: string): { hour: number; duration: number } => {
    switch (mealType) {
      case 'BREAKFAST':
        return { hour: 7, duration: 1 };
      case 'LUNCH':
        return { hour: 12, duration: 1 };
      case 'DINNER':
        return { hour: 18, duration: 1 }; // 6 PM
      case 'SNACK':
        return { hour: 15, duration: 1 }; // 3 PM
      default:
        return { hour: 12, duration: 1 };
    }
  };

  const fetchFamilyMembers = async () => {
    try {
      // Use /api/family-data instead of /api/family due to Next.js routing bug
      const response = await fetch('/api/family-data');
      if (response.ok) {
        const data = await response.json();
        setFamilyMembers(data.family.members.filter((m: any) => m.isActive));
        
        // Get week start setting and timezone
        const weekStartSetting = data.family?.settings?.weekStartDay || 'MONDAY';
        const timezone = data.family?.timezone || 'America/New_York';
        setWeekStartDay(weekStartSetting);
        setFamilyTimezone(timezone);
      }
    } catch (error) {
      console.error('Failed to fetch family members:', error);
    }
  };

  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (user) {
      const isBackground = !initialLoadRef.current;
      initialLoadRef.current = false;
      fetchEvents(currentDate, view, isBackground);
      fetchFamilyMembers();
    } else if (!sessionLoading) {
      // User is not authenticated and loading is complete
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, currentDate.toISOString(), view]);

  // Update view when URL parameter changes or on initial load
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'week' || viewParam === 'day' || viewParam === 'month') {
      setView(viewParam as CalendarView);
    }
  }, [searchParams]);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-scroll to current time (or 8am if it's a future date) when entering week/day view
  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    // Use current time if viewing today's week/day, otherwise scroll to 8am
    const isCurrentPeriod = (() => {
      if (view === 'week') {
        const weekDays = getWeekDays();
        return weekDays.some(d => d.toDateString() === now.toDateString());
      }
      return currentDate.toDateString() === now.toDateString();
    })();
    const targetHour = isCurrentPeriod ? Math.max(currentHour - 1, 0) : 8;

    // Use setTimeout to ensure the DOM has fully painted before scrolling
    const timer = setTimeout(() => {
      if (view === 'week') {
        const hourPx = isMobile ? 56 : 64;
        const ref = isMobile ? weekScrollMobileRef : weekScrollRef;
        if (ref.current) ref.current.scrollTop = targetHour * hourPx;
      }
      if (view === 'day' && dayScrollRef.current) {
        dayScrollRef.current.scrollTop = targetHour * 80;
      }
    }, 50);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, currentDate, isMobile]);

  // Scroll to current time (manual "Now" button)
  const scrollToNow = () => {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    if (view === 'week') {
      const hourPx = isMobile ? 56 : 64;
      const ref = isMobile ? weekScrollMobileRef : weekScrollRef;
      if (ref.current) ref.current.scrollTop = currentHour * hourPx - 100;
    }
    if (view === 'day' && dayScrollRef.current) {
      dayScrollRef.current.scrollTop = currentHour * 80 - 100;
    }
  };

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Get current time position for the indicator line
  const getCurrentTimePosition = () => {
    const now = currentTime;
    const currentHour = now.getHours() + now.getMinutes() / 60;
    return currentHour;
  };

  // Check if current date is visible in the view
  const isCurrentDateVisible = () => {
    if (view === 'day') {
      const today = new Date();
      return (
        currentDate.getDate() === today.getDate() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear()
      );
    } else if (view === 'week') {
      const weekDaysList = getWeekDays();
      const today = new Date();
      return weekDaysList.some(
        (date) =>
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear()
      );
    }
    return false;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startDayOfWeek = firstDay.getDay();

    // Adjust padding based on week start preference
    if (weekStartDay === 'MONDAY') {
      // Monday = 0, Sunday = 6
      startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    }

    const days = [];

    // Add empty cells for days before the month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getEventsForDay = (date: Date | null) => {
    if (!date) return [];
    
    // Create date range for the day in local time
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    return events.filter((event) => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      
      // Check if event overlaps with this day
      // Event overlaps if: event starts before day ends AND event ends after day starts
      return eventStart <= dayEnd && eventEnd >= dayStart;
    });
  };

  const handlePrevious = () => {
    if (view === 'day') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 1);
      setCurrentDate(newDate);
    } else if (view === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
      // Keep same day-of-week index in the new week
      setSelectedWeekDay(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      });
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const handleNext = () => {
    if (view === 'day') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 1);
      setCurrentDate(newDate);
    } else if (view === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
      // Keep same day-of-week index in the new week
      setSelectedWeekDay(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      });
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedWeekDay(new Date());
  };

  // Helper function to format Date for datetime-local input (local time, not UTC)
  // datetime-local inputs interpret the value as local time, so we must format in local time
  const formatLocalDateTime = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Handle clicking on a date in month view
  // On mobile: select the day and show events below; on desktop: navigate to day view
  const handleDayClick = (date: Date | null) => {
    if (!date) return;
    if (isMobile && view === 'month') {
      // Only update the selected day — don't change currentDate so events aren't re-fetched
      setSelectedDay(date);
    } else {
      setCurrentDate(date);
      setView('day');
    }
  };

  // Handle clicking the plus button - open event creation dialog
  const handleAddEventClick = (date: Date | null, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the day click
    if (!date) return;
    setSelectedDate(date);
    const defaultStartTime = new Date(date);
    defaultStartTime.setHours(9, 0, 0, 0);
    const defaultEndTime = new Date(date);
    defaultEndTime.setHours(10, 0, 0, 0);

    setEventForm({
      title: '',
      description: '',
      startTime: formatLocalDateTime(defaultStartTime),
      endTime: formatLocalDateTime(defaultEndTime),
      location: '',
      color: '#3b82f6',
      isAllDay: false,
      assignedMemberIds: [],
    });
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    // If it's a meal event, open meal modal instead
    if (event.isMeal && event.mealData) {
      setSelectedMeal(event.mealData);
      setShowMealModal(true);
      return;
    }

    // Convert UTC times to local time for datetime-local inputs
    // datetime-local inputs expect local time, not UTC
    // When we create a Date from a UTC string, JavaScript automatically converts it to local time
    const startDate = new Date(event.startTime);
    const endDate = new Date(event.endTime);
    
    setEventForm({
      title: event.title,
      description: event.description || '',
      startTime: event.isAllDay 
        ? startDate.toISOString().slice(0, 10) // Date only for all-day events
        : formatLocalDateTime(startDate), // Local time for timed events
      endTime: event.isAllDay
        ? endDate.toISOString().slice(0, 10) // Date only for all-day events
        : formatLocalDateTime(endDate), // Local time for timed events
      location: event.location || '',
      color: event.color,
      isAllDay: event.isAllDay,
      assignedMemberIds: event.assignments.map((a) => a.member.id),
    });
    setEditingEvent(event);
    setShowEventModal(true);
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title.trim()) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please enter an event title',
      });
      return;
    }

    setSavingEvent(true);
    try {
      const url = editingEvent
        ? `/api/calendar/events/${editingEvent.id}`
        : '/api/calendar/events';
      const method = editingEvent ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventForm),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: editingEvent
            ? 'Event updated successfully'
            : 'Event created successfully',
        });
        setShowEventModal(false);
        await fetchEvents(currentDate, view);
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to save event',
        });
      }
    } catch (error) {
      console.error('Error saving event:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to save event',
      });
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    const { eventId } = confirmModal;
    setConfirmModal({ ...confirmModal, isOpen: false });

    try {
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: 'Event deleted successfully',
        });
        setShowEventModal(false);
        await fetchEvents(currentDate, view);
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to delete event',
        });
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to delete event',
      });
    }
  };

  // Get display title based on view
  const getViewTitle = () => {
    if (view === 'day') {
      return currentDate.toLocaleString('default', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric' 
      });
    } else if (view === 'week') {
      const dayOfWeek = currentDate.getDay();
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - dayOfWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const startStr = weekStart.toLocaleString('default', { month: 'short', day: 'numeric' });
      const endStr = weekEnd.toLocaleString('default', { 
        month: 'short', 
        day: 'numeric',
        year: weekStart.getFullYear() !== weekEnd.getFullYear() ? 'numeric' : undefined
      });
      return `${startStr} - ${endStr}, ${weekStart.getFullYear()}`;
    } else {
      return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
  };

  // Get days for week view
  const getWeekDays = () => {
    const weekStart = getWeekStartDate(currentDate);
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentDate);
  const weekDays = getWeekDayNames(true);
  const weekDaysFull = getWeekDayNames(false);

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-8">
      {/* Subtle refresh indicator - doesn't replace the page */}
      {refreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-ember-200 dark:bg-ember-900 overflow-hidden">
          <div className="h-full bg-ember-600 animate-[slide-in_1.5s_ease-in-out_infinite]" style={{ animation: 'pulse 1.5s ease-in-out infinite', width: '60%', marginLeft: '20%' }} />
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-end mb-3">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 text-sm sm:text-base"
            >
              <CalendarIcon className="h-4 w-4" />
              Today
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 sm:gap-4 flex-1 min-w-0">
              <button
                onClick={handlePrevious}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              >
                <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <h2 className="text-sm sm:text-xl font-semibold text-gray-900 dark:text-white flex-1 text-center min-w-0 truncate">
                {getViewTitle()}
              </h2>
              <button
                onClick={handleNext}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              >
                <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* View Switcher */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex-shrink-0">
              <button
                onClick={() => setView('month')}
                className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors ${
                  view === 'month'
                    ? 'bg-ember-700 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => { setView('week'); setSelectedWeekDay(currentDate); }}
                className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors ${
                  view === 'week'
                    ? 'bg-ember-700 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView('day')}
                className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors ${
                  view === 'day'
                    ? 'bg-ember-700 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Day
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Views */}
        {view === 'month' && (
          <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {/* Week day headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="p-1 sm:p-3 text-center text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900"
                >
                  {/* Single letter on mobile, full abbreviation on desktop */}
                  <span className="sm:hidden">{day[0]}</span>
                  <span className="hidden sm:inline">{day}</span>
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {days.map((date, index) => {
                const dayEvents = getEventsForDay(date);
                const isToday =
                  date &&
                  date.getDate() === new Date().getDate() &&
                  date.getMonth() === new Date().getMonth() &&
                  date.getFullYear() === new Date().getFullYear();
                const isSelected =
                  isMobile &&
                  date &&
                  selectedDay &&
                  date.toDateString() === selectedDay.toDateString();

                return (
                  <div
                  key={index}
                  onClick={() => handleDayClick(date)}
                  className={`group min-h-[60px] sm:min-h-[120px] border-r border-b border-gray-200 dark:border-gray-700 p-1 sm:p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !date ? 'bg-gray-50 dark:bg-gray-900' : ''
                  } ${isSelected ? 'bg-ember-50 dark:bg-ember-900/20' : ''}`}
                >
                  {date && (
                    <>
                      <div className="flex justify-between items-start mb-1">
                        <span
                          className={`text-xs sm:text-sm font-medium leading-none ${
                            isToday
                              ? 'bg-ember-700 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs'
                              : isSelected
                              ? 'text-ember-700 dark:text-ember-400 font-bold'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        {/* Add button — desktop only (hover) */}
                        <button
                          onClick={(e) => handleAddEventClick(date, e)}
                          className="opacity-0 group-hover:opacity-100 hidden sm:block p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
                          title="Add event"
                        >
                          <PlusIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>

                      {/* Desktop: event pills */}
                      <div className="hidden sm:block space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditEvent(event);
                            }}
                            className="text-xs p-1 rounded truncate text-white font-medium flex items-center gap-1"
                            style={{ backgroundColor: event.color || '#9CA3AF' }}
                            title={event.title}
                          >
                            {event.isMeal ? (
                              <CakeIcon className="h-3 w-3 flex-shrink-0" />
                            ) : event.isAllDay ? (
                              <CalendarIcon className="h-3 w-3 flex-shrink-0" />
                            ) : (
                              <ClockIcon className="h-3 w-3 flex-shrink-0" />
                            )}
                            <span className="truncate">{event.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>

                      {/* Mobile: colored dots */}
                      <div className="sm:hidden flex flex-wrap gap-0.5 mt-1">
                        {dayEvents.slice(0, 4).map((event) => (
                          <div
                            key={event.id}
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: event.color || '#9CA3AF' }}
                          />
                        ))}
                        {dayEvents.length > 4 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                        )}
                      </div>
                    </>
                  )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile: Selected Day Events Panel */}
          {isMobile && (
            <div className="mt-3 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {selectedDay.toLocaleDateString('default', { weekday: 'long' })}
                  </p>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {selectedDay.toLocaleDateString('default', { month: 'long', day: 'numeric' })}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleAddEventClick(selectedDay, e)}
                    className="p-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg transition-colors"
                    title="Add event"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => { setCurrentDate(selectedDay); setView('day'); }}
                    className="px-3 py-1.5 text-sm text-ember-700 dark:text-ember-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                  >
                    Day →
                  </button>
                </div>
              </div>
              {(() => {
                const dayEvts = getEventsForDay(selectedDay);
                if (dayEvts.length === 0) {
                  return (
                    <div className="p-6 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">No events this day</p>
                    </div>
                  );
                }
                return (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {dayEvts.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => handleEditEvent(event)}
                        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div
                          className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                          style={{ backgroundColor: event.color || '#9CA3AF' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{event.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {event.isAllDay
                              ? 'All day'
                              : `${new Date(event.startTime).toLocaleTimeString('default', { hour: 'numeric', minute: '2-digit' })} – ${new Date(event.endTime).toLocaleTimeString('default', { hour: 'numeric', minute: '2-digit' })}`
                            }
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
          </>
        )}

        {view === 'week' && (
          <>
          {/* ── MOBILE: Day-strip + single-day timeline ─────────────────── */}
          <div className="sm:hidden space-y-2">
            {/* Day chip strip */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow px-2 pt-3 pb-2">
              <div className="grid grid-cols-7 gap-0.5">
                {getWeekDays().map((date, i) => {
                  const today = new Date();
                  const isToday = date.toDateString() === today.toDateString();
                  const isSelected = date.toDateString() === selectedWeekDay.toDateString();
                  const hasEvents = getEventsForDay(date).length > 0;
                  const abbrev = date.toLocaleDateString('default', { weekday: 'narrow' });
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedWeekDay(date)}
                      className={`flex flex-col items-center py-1.5 rounded-xl transition-colors ${
                        isSelected
                          ? 'bg-ember-700 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wide">{abbrev}</span>
                      <span className={`text-sm font-bold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday && !isSelected
                          ? 'border-2 border-ember-700 text-ember-700 dark:text-ember-400'
                          : ''
                      }`}>
                        {date.getDate()}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full mt-1 ${
                        hasEvents
                          ? isSelected ? 'bg-white/80' : 'bg-ember-500'
                          : 'bg-transparent'
                      }`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Single-day timeline for selectedWeekDay */}
            {(() => {
              const dayEvents = getEventsForDay(selectedWeekDay);
              const allDayEvts = dayEvents.filter(e => e.isAllDay);
              const timedEvts = dayEvents.filter(e => !e.isAllDay);
              const isToday = selectedWeekDay.toDateString() === new Date().toDateString();

              const getEventPos = (event: CalendarEvent) => {
                const start = new Date(event.startTime);
                const end = new Date(event.endTime);
                const startH = start.getHours() + start.getMinutes() / 60;
                const endH = end.getHours() + end.getMinutes() / 60;
                return {
                  top: `${(startH / 24) * 100}%`,
                  height: `${Math.max(((endH - startH) / 24) * 100, 2.5)}%`,
                };
              };

              return (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                  {/* All-day events */}
                  {allDayEvts.length > 0 && (
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 space-y-1">
                      {allDayEvts.map(ev => (
                        <div
                          key={ev.id}
                          onClick={() => handleEditEvent(ev)}
                          className="text-xs px-2 py-1 rounded-md text-white font-medium cursor-pointer truncate"
                          style={{ backgroundColor: ev.color || '#9CA3AF' }}
                        >
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Time grid */}
                  <div
                    className="overflow-y-auto"
                    ref={weekScrollMobileRef}
                    style={{ maxHeight: 'calc(100vh - 320px)', scrollbarGutter: 'stable' }}
                  >
                    <div className="relative flex" style={{ height: `${24 * 56}px` }}>
                      {/* Time labels */}
                      <div className="w-14 flex-shrink-0">
                        {Array.from({ length: 24 }, (_, i) => (
                          <div key={i} className="h-14 flex items-start justify-end pr-2 pt-1">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 leading-none">
                              {i === 0 ? '12am' : i < 12 ? `${i}am` : i === 12 ? '12pm' : `${i - 12}pm`}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Event area */}
                      <div
                        className={`flex-1 relative border-l border-gray-100 dark:border-gray-700 cursor-pointer ${
                          isToday ? 'bg-ember-50/20 dark:bg-ember-900/10' : ''
                        }`}
                        onClick={() => handleAddEventClick(selectedWeekDay, { stopPropagation: () => {} } as React.MouseEvent)}
                      >
                        {/* Hour lines */}
                        {Array.from({ length: 24 }, (_, i) => (
                          <div
                            key={i}
                            className="absolute left-0 right-0 border-b border-gray-100 dark:border-gray-700"
                            style={{ top: `${(i / 24) * 100}%` }}
                          />
                        ))}

                        {/* Current time line */}
                        {isToday && (
                          <div
                            className="absolute left-0 right-0 z-10 pointer-events-none"
                            style={{ top: `${(getCurrentTimePosition() / 24) * 100}%` }}
                          >
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 border border-white dark:border-gray-800 flex-shrink-0" />
                              <div className="flex-1 h-0.5 bg-red-500" />
                            </div>
                          </div>
                        )}

                        {/* Timed events */}
                        {timedEvts.map(ev => {
                          const pos = getEventPos(ev);
                          return (
                            <div
                              key={ev.id}
                              onClick={(e) => { e.stopPropagation(); handleEditEvent(ev); }}
                              className="absolute left-1 right-1 rounded-lg px-2 py-1 text-xs text-white font-medium cursor-pointer z-10 overflow-hidden shadow-sm"
                              style={{ backgroundColor: ev.color || '#9CA3AF', top: pos.top, height: pos.height, minHeight: '28px' }}
                              title={ev.title}
                            >
                              <div className="flex items-center gap-1">
                                {ev.isMeal ? (
                                  <CakeIcon className="h-3 w-3 flex-shrink-0" />
                                ) : (
                                  <ClockIcon className="h-3 w-3 flex-shrink-0" />
                                )}
                                <span className="truncate">{ev.title}</span>
                              </div>
                              <div className="text-[10px] opacity-80 leading-none mt-0.5 truncate">
                                {new Date(ev.startTime).toLocaleTimeString('default', { hour: 'numeric', minute: '2-digit' })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── DESKTOP: 7-column grid ───────────────────────────────────── */}
          <div className="hidden sm:block overflow-x-auto">
          <div className="min-w-[560px]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col">
            {/* Week day headers - fixed */}
            <div className="grid border-b border-gray-200 dark:border-gray-700 flex-shrink-0 gap-px bg-gray-200 dark:bg-gray-700" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
              <div className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900">
                <div className="flex flex-col gap-1">
                  <span>Time</span>
                  <button
                    onClick={scrollToNow}
                    className="text-xs px-2 py-0.5 bg-ember-700 hover:bg-ember-500 text-white rounded transition-colors self-start"
                    title="Scroll to current time"
                  >
                    Now
                  </button>
                </div>
              </div>
              {weekDays.map((day, index) => {
                const weekDaysList = getWeekDays();
                const date = weekDaysList[index];
                const isToday =
                  date &&
                  date.getDate() === new Date().getDate() &&
                  date.getMonth() === new Date().getMonth() &&
                  date.getFullYear() === new Date().getFullYear();
                
                const dayEvents = getEventsForDay(date);
                const allDayEvents = dayEvents.filter(e => e.isAllDay);
                
                return (
                  <div
                    key={day}
                    className={`p-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 overflow-hidden ${
                      isToday ? 'bg-ember-50 dark:bg-ember-900' : ''
                    }`}
                    style={{ minHeight: '80px', maxHeight: '120px' }}
                  >
                    <div className="flex-shrink-0">
                      <div>{day}</div>
                      <div className={`text-xs mt-1 mb-2 ${isToday ? 'font-bold text-ember-700 dark:text-ember-300' : ''}`}>
                        {date?.getDate()}
                      </div>
                    </div>
                    {/* All-day events - scrollable if needed */}
                    {allDayEvents.length > 0 && (
                      <div className="space-y-1 mt-2 overflow-y-auto" style={{ maxHeight: '60px' }}>
                        {allDayEvents.map((event) => (
                          <div
                            key={event.id}
                            onClick={() => handleEditEvent(event)}
                            className="text-xs px-2 py-1 rounded truncate text-white font-normal cursor-pointer hover:opacity-80 flex-shrink-0"
                            style={{ backgroundColor: event.color || '#9CA3AF' }}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Week grid with time slots - scrollable */}
            <div className="overflow-y-auto flex-1" ref={weekScrollRef} style={{ maxHeight: 'calc(100vh - 300px)', scrollbarGutter: 'stable' }}>
              <div className="grid relative gap-px bg-gray-200 dark:bg-gray-700" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
                {/* Time column - sticky */}
                <div className="sticky left-0 bg-white dark:bg-gray-800 z-20">
                  {Array.from({ length: 24 }, (_, i) => (
                    <div
                      key={i}
                      className="h-16 border-b border-gray-200 dark:border-gray-700 p-2 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800"
                    >
                      {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                    </div>
                  ))}
                </div>

                {/* Current time indicator line - spans all day columns */}
                {isCurrentDateVisible() && (
                  <div
                    className="absolute left-0 right-0 z-30 pointer-events-none col-start-2 col-end-9"
                    style={{
                      top: `${(getCurrentTimePosition() / 24) * 100}%`,
                    }}
                  >
                    <div className="flex items-center h-full">
                      <div className="w-2 h-2 bg-red-500 rounded-full -ml-1 border border-white dark:border-gray-800"></div>
                      <div className="flex-1 h-0.5 bg-red-500"></div>
                    </div>
                  </div>
                )}

                {/* Day columns */}
                {getWeekDays().map((date, dayIndex) => {
                  const dayEvents = getEventsForDay(date);
                  const isToday =
                    date.getDate() === new Date().getDate() &&
                    date.getMonth() === new Date().getMonth() &&
                    date.getFullYear() === new Date().getFullYear();

                  // Get events with their time positions
                  const getEventPosition = (event: CalendarEvent) => {
                    if (event.isAllDay) return { top: 0, height: 24 };
                    const start = new Date(event.startTime);
                    const end = new Date(event.endTime);
                    const startHour = start.getHours() + start.getMinutes() / 60;
                    const endHour = end.getHours() + end.getMinutes() / 60;
                    const top = (startHour / 24) * 100;
                    const height = ((endHour - startHour) / 24) * 100;
                    return { top: `${top}%`, height: `${Math.max(height, 2)}%` };
                  };

                  return (
                    <div
                      key={dayIndex}
                      onClick={() => handleDayClick(date)}
                      className={`relative bg-white dark:bg-gray-800 ${
                        isToday ? 'bg-ember-50/20 dark:bg-ember-900/20' : ''
                      }`}
                    >
                      {Array.from({ length: 24 }, (_, hour) => (
                        <div
                          key={hour}
                          className="h-16 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        />
                      ))}
                      
                      {/* Events */}
                      <div className="absolute inset-0 pointer-events-none">
                        {dayEvents.filter(event => !event.isAllDay).map((event) => {
                          const position = getEventPosition(event);
                          return (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditEvent(event);
                              }}
                              className="absolute left-1 right-1 rounded px-2 py-1 text-xs text-white font-medium pointer-events-auto cursor-pointer z-10 overflow-hidden"
                              style={{
                                backgroundColor: event.color || '#9CA3AF',
                                top: position.top,
                                height: position.height,
                                minHeight: '24px',
                              }}
                              title={`${event.title} - ${new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                            >
                              <div className="flex items-center gap-1">
                                {event.isMeal ? (
                                  <CakeIcon className="h-3 w-3 flex-shrink-0" />
                                ) : (
                                  <ClockIcon className="h-3 w-3 flex-shrink-0" />
                                )}
                                <span className="truncate">{event.title}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          </div>
          </div>
          </>
        )}

        {view === 'day' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col">
            {/* Day header - fixed */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {weekDaysFull[currentDate.getDay()]}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {currentDate.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={scrollToNow}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-colors"
                    title="Scroll to current time"
                  >
                    Now
                  </button>
                  <button
                    onClick={() => handleAddEventClick(currentDate, { stopPropagation: () => {} } as React.MouseEvent)}
                    className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Event
                  </button>
                </div>
              </div>
              
              {/* All-day events section */}
              {(() => {
                const allDayEvents = getEventsForDay(currentDate).filter(e => e.isAllDay);
                if (allDayEvents.length === 0) return null;
                
                return (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">ALL-DAY EVENTS</div>
                    <div className="space-y-2">
                      {allDayEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => handleEditEvent(event)}
                          className="px-3 py-2 rounded-lg text-white font-medium cursor-pointer hover:opacity-80 flex items-center gap-2"
                          style={{ backgroundColor: event.color || '#9CA3AF' }}
                        >
                          {event.isMeal ? (
                            <CakeIcon className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                          )}
                          <span className="flex-1">{event.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Day grid with time slots - scrollable */}
            <div className="overflow-y-auto flex-1" ref={dayScrollRef} style={{ maxHeight: 'calc(100vh - 300px)', scrollbarGutter: 'stable' }}>
              <div className="grid grid-cols-12">
                {/* Time column - sticky */}
                <div className="col-span-2 border-r border-gray-200 dark:border-gray-700 sticky left-0 bg-white dark:bg-gray-800 z-20">
                  {Array.from({ length: 24 }, (_, i) => (
                    <div
                      key={i}
                      className="h-20 border-b border-gray-200 dark:border-gray-700 p-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                    >
                      {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                    </div>
                  ))}
                </div>

                {/* Events column */}
                <div
                  className="col-span-10 relative"
                  onClick={() => handleAddEventClick(currentDate, { stopPropagation: () => {} } as React.MouseEvent)}
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div
                      key={hour}
                      className="h-20 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    />
                  ))}
                  
                  {/* Current time indicator line */}
                  {isCurrentDateVisible() && (
                    <div
                      className="absolute left-0 right-0 z-30 pointer-events-none"
                      style={{
                        top: `${(getCurrentTimePosition() / 24) * 100}%`,
                      }}
                    >
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5 border-2 border-white dark:border-gray-800"></div>
                        <div className="flex-1 h-0.5 bg-red-500"></div>
                      </div>
                    </div>
                  )}

                  {/* Events */}
                  <div className="absolute inset-0 pointer-events-none">
                    {getEventsForDay(currentDate).filter(event => !event.isAllDay).map((event) => {
                      const getEventPosition = (event: CalendarEvent) => {
                        const start = new Date(event.startTime);
                        const end = new Date(event.endTime);
                        const startHour = start.getHours() + start.getMinutes() / 60;
                        const endHour = end.getHours() + end.getMinutes() / 60;
                        const top = (startHour / 24) * 100;
                        const height = ((endHour - startHour) / 24) * 100;
                        return { top: `${top}%`, height: `${Math.max(height, 3)}%` };
                      };

                      const position = getEventPosition(event);
                      return (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditEvent(event);
                          }}
                          className="absolute left-2 right-2 rounded-lg px-3 py-2 text-sm text-white font-medium pointer-events-auto cursor-pointer z-10 shadow-sm"
                          style={{
                            backgroundColor: event.color || '#9CA3AF',
                            top: position.top,
                            height: position.height,
                            minHeight: '48px',
                          }}
                          title={`${event.title} - ${new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${new Date(event.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                        >
                          <div className="flex items-center gap-2">
                            {event.isMeal ? (
                              <CakeIcon className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <ClockIcon className="h-4 w-4 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold truncate">{event.title}</div>
                              <div className="text-xs opacity-90">
                                {new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {new Date(event.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </div>
                              {event.location && (
                                <div className="text-xs opacity-75 truncate mt-1">{event.location}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event Modal */}
      <Modal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        title={editingEvent ? 'Edit Event' : 'Create Event'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Title *
            </label>
            <input
              type="text"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              placeholder="e.g., Soccer Practice, Doctor Appointment"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              placeholder="Add details about this event..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAllDay"
              checked={eventForm.isAllDay}
              onChange={(e) => setEventForm({ ...eventForm, isAllDay: e.target.checked })}
              className="w-4 h-4 text-ember-700 border-gray-300 rounded"
            />
            <label htmlFor="isAllDay" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              All Day Event
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start {!eventForm.isAllDay && 'Time'}
              </label>
              <input
                type={eventForm.isAllDay ? 'date' : 'datetime-local'}
                value={eventForm.isAllDay ? eventForm.startTime.split('T')[0] : eventForm.startTime}
                onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End {!eventForm.isAllDay && 'Time'}
              </label>
              <input
                type={eventForm.isAllDay ? 'date' : 'datetime-local'}
                value={eventForm.isAllDay ? eventForm.endTime.split('T')[0] : eventForm.endTime}
                onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location
            </label>
            <input
              type="text"
              value={eventForm.location}
              onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
              placeholder="e.g., Home, School, Park"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color
            </label>
            <div className="flex gap-2">
              {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map((color) => (
                <button
                  key={color}
                  onClick={() => setEventForm({ ...eventForm, color })}
                  className={`w-8 h-8 rounded-full ${
                    eventForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assign to Family Members
            </label>
            <div className="space-y-2">
              {familyMembers.map((member) => (
                <label key={member.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={eventForm.assignedMemberIds.includes(member.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setEventForm({
                          ...eventForm,
                          assignedMemberIds: [...eventForm.assignedMemberIds, member.id],
                        });
                      } else {
                        setEventForm({
                          ...eventForm,
                          assignedMemberIds: eventForm.assignedMemberIds.filter(
                            (id) => id !== member.id
                          ),
                        });
                      }
                    }}
                    className="w-4 h-4 text-ember-700 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{member.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSaveEvent}
            disabled={savingEvent}
            className="flex-1 px-6 py-2 bg-ember-700 hover:bg-ember-500 disabled:bg-ember-300 text-white font-semibold rounded-lg transition-colors"
          >
            {savingEvent ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
          </button>
          {editingEvent && (
            <button
              onClick={() =>
                setConfirmModal({
                  isOpen: true,
                  eventId: editingEvent.id,
                  eventTitle: editingEvent.title,
                })
              }
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
              Delete
            </button>
          )}
          <button
            onClick={() => setShowEventModal(false)}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleDeleteEvent}
        title="Delete Event"
        message={`Delete "${confirmModal.eventTitle}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="red"
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />

      {/* Meal Detail Modal */}
      <MealDetailModal
        isOpen={showMealModal}
        onClose={() => {
          setShowMealModal(false);
          setSelectedMeal(null);
        }}
        mealEntry={selectedMeal}
      />
    </div>
  );
}
