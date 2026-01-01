'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
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

export default function CalendarPage() {
  const { data: session } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
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

  const fetchEvents = async (date: Date) => {
    try {
      const year = date.getFullYear();
      const month = date.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const response = await fetch(
        `/api/calendar/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
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
    fetchEvents(currentDate);
    fetchFamilyMembers();
  }, [currentDate]);

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
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (date: Date | null) => {
    if (!date) return;
    setSelectedDate(date);
    const defaultStartTime = new Date(date);
    defaultStartTime.setHours(9, 0, 0, 0);
    const defaultEndTime = new Date(date);
    defaultEndTime.setHours(10, 0, 0, 0);

    setEventForm({
      title: '',
      description: '',
      startTime: defaultStartTime.toISOString().slice(0, 16),
      endTime: defaultEndTime.toISOString().slice(0, 16),
      location: '',
      color: '#3b82f6',
      isAllDay: false,
      assignedMemberIds: [],
    });
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEventForm({
      title: event.title,
      description: event.description || '',
      startTime: new Date(event.startTime).toISOString().slice(0, 16),
      endTime: new Date(event.endTime).toISOString().slice(0, 16),
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
        await fetchEvents(currentDate);
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
        await fetchEvents(currentDate);
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

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentDate);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <CalendarIcon className="h-4 w-4" />
              Today
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white min-w-[200px] text-center">
                {monthName}
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
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
                  className={`min-h-[120px] border-r border-b border-gray-200 dark:border-gray-700 p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !date ? 'bg-gray-50 dark:bg-gray-900' : ''
                  }`}
                >
                  {date && (
                    <>
                      <div className="flex justify-between items-start mb-1">
                        <span
                          className={`text-sm font-medium ${
                            isToday
                              ? 'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {date.getDate()}
                        </span>
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
                            style={{ backgroundColor: event.color }}
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
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
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
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
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
            className="flex-1 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition-colors"
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
