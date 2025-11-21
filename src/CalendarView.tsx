import React, { useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventApi } from '@fullcalendar/core';
// NOTE: CSS for FullCalendar is loaded from index.html via CDN links

type SampleEvent = {
  id: string;
  title: string;
  start: string;
  description?: string;
  location?: string;
};

const sampleEvents: SampleEvent[] = [
  { id: '1', title: 'Opening Keynote', start: new Date().toISOString().slice(0,10), description: 'Hear from our opening speaker about the state of security.' },
  { id: '2', title: 'Networking Lunch', start: new Date(Date.now() + 1000*60*60*24).toISOString().slice(0,10), description: 'Casual lunch and networking with peers.' },
  { id: '3', title: 'Workshop: Security', start: new Date(Date.now() + 2*1000*60*60*24).toISOString().slice(0,10), description: 'Hands-on workshop covering modern security practices.' }
];

interface EventDetailsProps {
  title: string;
  start: string;
  description?: string;
  location?: string;
  onClose: () => void;
  isAdmin?: boolean;
  onSave?: (updated: SampleEvent) => void;
}

function EventDetails({ title, start, description, location, onClose, isAdmin = false, onSave }: EventDetailsProps) {
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
    boxShadow: '0 6px 18px rgba(0,0,0,0.2)'
  };

  function startEdit() {
    setDraft({ title, start, description, location });
    setIsEditing(true);
  }

  function save() {
    if (onSave) {
      // Build minimal payload — id will be filled by parent if needed
      onSave({ id: '', title: draft.title, start: draft.start, description: draft.description, location: draft.location });
    }
    setIsEditing(false);
    onClose();
  }

  function cancel() {
    setIsEditing(false);
  }

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <div>
            {isAdmin && !isEditing && <button onClick={startEdit} style={{ marginRight: 8 }}>Edit</button>}
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
            {description && <p style={{ marginTop: 0 }}>{description}</p>}
            {location && (
              <div style={{ marginTop: 8 }}><strong>Location:</strong> {location}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CalendarView({ isAdmin }: { isAdmin: boolean }): React.ReactElement {
  const [selectedEvent, setSelectedEvent] = useState<SampleEvent | null>(null);
  const [events, setEvents] = useState<SampleEvent[]>(() => sampleEvents);

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
    const payload: SampleEvent = {
      id: e.id,
      title: e.title,
      start: e.startStr || (e.start ? e.start.toISOString().slice(0,10) : ''),
      description: (e.extendedProps && (e.extendedProps as any).description) || undefined,
      location: (e.extendedProps && (e.extendedProps as any).location) || undefined,
    };
    setSelectedEvent(payload);
  }

  function handleSaveEvent(updated: SampleEvent) {
    // updated.id may be empty when coming from EventDetails save; use selectedEvent id
    const id = selectedEvent ? selectedEvent.id : updated.id;
    const merged: SampleEvent = { ...updated, id };
    setEvents(prev => prev.map(ev => (ev.id === id ? { ...ev, ...merged } : ev)));
    setSelectedEvent(merged);
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
          title={selectedEvent.title}
          start={selectedEvent.start}
          description={selectedEvent.description}
          location={selectedEvent.location}
          onClose={() => setSelectedEvent(null)}
          isAdmin={isAdmin}
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
