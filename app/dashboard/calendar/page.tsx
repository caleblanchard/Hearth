'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Modal, ConfirmModal, AlertModal } from '@/components/ui/Modal';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  CalendarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  color: string;
  isAllDay: boolean;
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
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);

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

  const weekScrollRef = useRef<HTMLDivElement>(null);
  const dayScrollRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchEvents = async (date: Date, viewType: CalendarView = view) => {
    try {
      let startDate: Date;
      let endDate: Date;

      if (viewType === 'day') {
        // Single day
        startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
      } else if (viewType === 'week') {
        // Week view - get the week containing the date
        const dayOfWeek = date.getDay();
        startDate = new Date(date);
        startDate.setDate(date.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
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

      const response = await fetch(
        `/api/calendar/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      if (response.ok) {
        const data = await response.json();
        console.log('[Calendar] Fetched events:', {
          total: data.events?.length || 0,
          externalSubscriptionEvents: data.events?.filter((e: any) => e.externalSubscriptionId).length || 0,
          sampleEvents: data.events?.slice(0, 5).map((e: any) => ({
            title: e.title,
            startTime: e.startTime,
            externalSubscriptionId: e.externalSubscriptionId,
            externalId: e.externalId,
            id: e.id,
          })),
          allExternalEvents: data.events?.filter((e: any) => e.externalSubscriptionId).map((e: any) => ({
            title: e.title,
            startTime: e.startTime,
            externalSubscriptionId: e.externalSubscriptionId,
          })),
        });
        setEvents(data.events || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Calendar] Failed to fetch events:', response.status, errorData);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilyMembers = async () => {
    try {
      const response = await fetch('/api/family');
      if (response.ok) {
        const data = await response.json();
        setFamilyMembers(data.family.members.filter((m: any) => m.isActive));
      }
    } catch (error) {
      console.error('Failed to fetch family members:', error);
    }
  };

  useEffect(() => {
    if (session?.user?.familyId) {
      fetchEvents(currentDate, view);
      fetchFamilyMembers();
    }
  }, [session, currentDate, view]);

  // Update view when URL parameter changes or on initial load
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'week' || viewParam === 'day' || viewParam === 'month') {
      setView(viewParam as CalendarView);
    }
  }, [searchParams]);

  // Scroll to 6am on view change or when switching to week/day view
  useEffect(() => {
    if (view === 'week' && weekScrollRef.current) {
      // Scroll to 6am (6 hours * 64px per hour = 384px)
      // Each hour is h-16 (64px)
      weekScrollRef.current.scrollTop = 6 * 64;
    }
    if (view === 'day' && dayScrollRef.current) {
      // Scroll to 6am (6 hours * 80px per hour = 480px)
      // Each hour is h-20 (80px)
      dayScrollRef.current.scrollTop = 6 * 80;
    }
  }, [view, currentDate]);

  // Scroll to current time
  const scrollToNow = () => {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    
    if (view === 'week' && weekScrollRef.current) {
      weekScrollRef.current.scrollTop = currentHour * 64 - 100; // Offset by 100px to show some context above
    }
    if (view === 'day' && dayScrollRef.current) {
      dayScrollRef.current.scrollTop = currentHour * 80 - 100; // Offset by 100px to show some context above
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
    const startDayOfWeek = firstDay.getDay();

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
    
    // Create date range for the day (start and end of day in local time)
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      // Check if event falls within the day range (handles timezone correctly)
      return eventDate >= dayStart && eventDate <= dayEnd;
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
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
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

  // Handle clicking on a date in month view - switch to day view
  const handleDayClick = (date: Date | null) => {
    if (!date) return;
    setCurrentDate(date);
    setView('day');
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
    const dayOfWeek = currentDate.getDay();
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    
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
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekDaysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calendar</h1>
            <button
              onClick={handleToday}
              className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <CalendarIcon className="h-4 w-4" />
              Today
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrevious}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white min-w-[200px] text-center">
                {getViewTitle()}
              </h2>
              <button
                onClick={handleNext}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            {/* View Switcher */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setView('month')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  view === 'month'
                    ? 'bg-ember-700 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  view === 'week'
                    ? 'bg-ember-700 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView('day')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {/* Week day headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="p-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900"
                >
                  {day}
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

                return (
                  <div
                  key={index}
                  onClick={() => handleDayClick(date)}
                  className={`group min-h-[120px] border-r border-b border-gray-200 dark:border-gray-700 p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !date ? 'bg-gray-50 dark:bg-gray-900' : ''
                  }`}
                >
                  {date && (
                    <>
                      <div className="flex justify-between items-start mb-1">
                        <span
                          className={`text-sm font-medium ${
                            isToday
                              ? 'bg-ember-700 text-white w-6 h-6 rounded-full flex items-center justify-center'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        <button
                          onClick={(e) => handleAddEventClick(date, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-all"
                          title="Add event"
                        >
                          <PlusIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                      <div className="space-y-1">
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
                            {event.isAllDay ? (
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
                    </>
                  )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'week' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col">
            {/* Week day headers - fixed */}
            <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span>Time</span>
                <button
                  onClick={scrollToNow}
                  className="text-xs px-2 py-1 bg-ember-700 hover:bg-ember-500 text-white rounded transition-colors"
                  title="Scroll to current time"
                >
                  Now
                </button>
              </div>
              {weekDays.map((day, index) => {
                const weekDaysList = getWeekDays();
                const date = weekDaysList[index];
                const isToday =
                  date &&
                  date.getDate() === new Date().getDate() &&
                  date.getMonth() === new Date().getMonth() &&
                  date.getFullYear() === new Date().getFullYear();
                
                return (
                  <div
                    key={day}
                    className={`p-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 ${
                      isToday ? 'bg-ember-50 dark:bg-ember-900' : ''
                    }`}
                  >
                    <div>{day}</div>
                    <div className={`text-xs mt-1 ${isToday ? 'font-bold text-ember-700 dark:text-ember-300' : ''}`}>
                      {date?.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Week grid with time slots - scrollable */}
            <div className="overflow-y-auto flex-1" ref={weekScrollRef} style={{ maxHeight: 'calc(100vh - 300px)' }}>
              <div className="grid grid-cols-8 relative">
                {/* Time column - sticky */}
                <div className="border-r border-gray-200 dark:border-gray-700 sticky left-0 bg-white dark:bg-gray-800 z-20">
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
                      className={`border-r border-gray-200 dark:border-gray-700 relative ${
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
                        {dayEvents.map((event) => {
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
                                minHeight: event.isAllDay ? 'auto' : '24px',
                              }}
                              title={`${event.title}${event.isAllDay ? '' : ` - ${new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}`}
                            >
                              <div className="flex items-center gap-1">
                                {event.isAllDay ? (
                                  <CalendarIcon className="h-3 w-3 flex-shrink-0" />
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
        )}

        {view === 'day' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col">
            {/* Day header - fixed */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
              <div className="flex items-center justify-between">
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
            </div>

            {/* Day grid with time slots - scrollable */}
            <div className="overflow-y-auto flex-1" ref={dayScrollRef} style={{ maxHeight: 'calc(100vh - 300px)' }}>
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
                    {getEventsForDay(currentDate).map((event) => {
                      const getEventPosition = (event: CalendarEvent) => {
                        if (event.isAllDay) return { top: 0, height: 48 };
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
                            minHeight: event.isAllDay ? 'auto' : '48px',
                          }}
                          title={`${event.title}${event.isAllDay ? '' : ` - ${new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${new Date(event.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}`}
                        >
                          <div className="flex items-center gap-2">
                            {event.isAllDay ? (
                              <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <ClockIcon className="h-4 w-4 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold truncate">{event.title}</div>
                              {!event.isAllDay && (
                                <div className="text-xs opacity-90">
                                  {new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {new Date(event.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                </div>
                              )}
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
    </div>
  );
}
