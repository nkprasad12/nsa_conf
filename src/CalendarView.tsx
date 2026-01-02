import React, { useState, useMemo, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventApi } from '@fullcalendar/core';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { canEdit, PermissibleItem } from './permissions';
// NOTE: CSS for FullCalendar is loaded from index.html via CDN links

interface CalendarEvent extends PermissibleItem {
  id: string;
  title: string;
  start: string;
  description?: string;
  location?: string;
}

interface EventDetailsProps {
  event: CalendarEvent;
  onClose: () => void;
  user: any;
  isAdmin: boolean;
  groups: string[];
  onSave?: (updated: CalendarEvent) => void;
}

function EventDetails({ event, onClose, user, isAdmin, groups, onSave }: EventDetailsProps) {
  const { title, start, description, location } = event;
  if (!title && !start) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<{ title: string; start: string; description?: string; location?: string }>({ title, start, description, location });

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  };

  const boxStyle: React.CSSProperties = {
    background: '#fff',
    padding: '1rem 1.25rem',
    borderRadius: 8,
    maxWidth: 520,
    width: '90%',
    boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
    color: '#213547'
  };

  function startEdit() {
    setDraft({ title, start, description, location });
    setIsEditing(true);
  }

  async function save() {
    if (onSave) {
      await onSave({ ...event, title: draft.title, start: draft.start, description: draft.description, location: draft.location });
    }
    setIsEditing(false);
    onClose();
  }

  function cancel() {
    setIsEditing(false);
  }

  const authInfo = user ? { uid: user.uid, isAdmin, groups } : null;

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0, color: '#213547' }}>{title}</h3>
          <div>
            {canEdit(event, authInfo) && !isEditing && <button onClick={startEdit} style={{ marginRight: 8 }}>Edit</button>}
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {isEditing ? (
          <div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#666' }}>Title</label>
              <input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#666' }}>Date</label>
              <input type="date" value={draft.start} onChange={e => setDraft(d => ({ ...d, start: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#666' }}>Description</label>
              <textarea value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={save}>Save</button>
              <button onClick={cancel}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ color: '#444', marginBottom: 8 }}>
              <strong>Date:</strong> {start}
            </div>
            {description && <p style={{ marginTop: 0, color: '#213547' }}>{description}</p>}
            {location && (
              <div style={{ marginTop: 8, color: '#213547' }}><strong>Location:</strong> {location}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CalendarView(): React.ReactElement {
  const { user, isAdmin, groups } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'events'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CalendarEvent[];
      setEvents(data);
    });

    return () => unsubscribe();
  }, []);

  // compute unique event dates (YYYY-MM-DD), sorted
  const uniqueDates = useMemo(() => {
    const dates = events.map(e => (e.start || '').slice(0, 10));
    return Array.from(new Set(dates)).filter(d => d).sort();
  }, [events]);

  const exclusiveEnd = (end?: string) => {
    if (!end) return undefined;
    const d = new Date(end + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  function handleEventClick(info: any) {
    const e: EventApi = info.event as EventApi;
    const payload: CalendarEvent = {
      id: e.id,
      title: e.title,
      start: e.startStr || (e.start ? e.start.toISOString().slice(0,10) : ''),
      description: (e.extendedProps && (e.extendedProps as any).description) || undefined,
      location: (e.extendedProps && (e.extendedProps as any).location) || undefined,
      ownerId: (e.extendedProps && (e.extendedProps as any).ownerId) || undefined,
      allowedEditors: (e.extendedProps && (e.extendedProps as any).allowedEditors) || undefined,
      allowedGroups: (e.extendedProps && (e.extendedProps as any).allowedGroups) || undefined,
    };
    setSelectedEvent(payload);
  }

  async function handleSaveEvent(updated: CalendarEvent) {
    try {
      const eventRef = doc(db, 'events', updated.id);
      await updateDoc(eventRef, {
        title: updated.title,
        start: updated.start,
        description: updated.description || '',
        location: updated.location || ''
      });
      setSelectedEvent(updated);
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to save changes. You might not have permission.');
    }
  }

  // If there are 1-3 unique event days, create a compact multi-day view limited to those days
  const useCompactMultiDay = uniqueDates.length > 0 && uniqueDates.length <= 3;
  const compactDuration = useCompactMultiDay ? uniqueDates.length : undefined;
  const compactStart = useCompactMultiDay ? uniqueDates[0] : undefined;
  const compactEndExclusive = useCompactMultiDay ? exclusiveEnd(uniqueDates[uniqueDates.length - 1]) : undefined;

  // filter events to only those dates (helps if there are out-of-range events)
  const filteredEvents = useMemo(() => {
    if (!useCompactMultiDay) return events;
    const set = new Set(uniqueDates);
    return events.filter(ev => set.has((ev.start || '').slice(0, 10)));
  }, [events, useCompactMultiDay, uniqueDates]);

  return (
    <>
      {selectedEvent && (
        <EventDetails
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          user={user}
          isAdmin={isAdmin}
          groups={groups}
          onSave={handleSaveEvent}
        />
      )}
      <div className="calendar-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView={useCompactMultiDay ? 'compactMulti' : 'dayGridMonth'}
          views={useCompactMultiDay ? { compactMulti: { type: 'dayGrid', duration: { days: compactDuration } } } : undefined}
          initialDate={compactStart}
          validRange={useCompactMultiDay ? { start: compactStart, end: compactEndExclusive } : undefined}
          headerToolbar={{ left: useCompactMultiDay ? '' : 'prev,next today', center: 'title', right: useCompactMultiDay ? '' : 'dayGridMonth,dayGridWeek' }}
          editable={false}
          selectable={true}
          events={filteredEvents}
          eventClick={handleEventClick}
          height="auto"
        />
      </div>
    </>
  );
}
