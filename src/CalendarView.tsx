import React, { useState } from 'react';
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
}

function EventDetails({ title, start, description, location, onClose }: EventDetailsProps) {
  if (!title && !start) return null;

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

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ color: '#444', marginBottom: 8 }}>
          <strong>Date:</strong> {start}
        </div>
        {description && <p style={{ marginTop: 0 }}>{description}</p>}
        {location && (
          <div style={{ marginTop: 8 }}><strong>Location:</strong> {location}</div>
        )}
      </div>
    </div>
  );
}

export default function CalendarView(): React.ReactElement {
  const [selectedEvent, setSelectedEvent] = useState<SampleEvent | null>(null);

  function handleEventClick(info: any) {
    // info.event is a FullCalendar EventApi
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

  return (
    <>
      {selectedEvent && (
        <EventDetails
          title={selectedEvent.title}
          start={selectedEvent.start}
          description={selectedEvent.description}
          location={selectedEvent.location}
          onClose={() => setSelectedEvent(null)}
        />
      )}
      <div className="calendar-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' }}
          editable={false}
          selectable={true}
          events={sampleEvents}
          eventClick={handleEventClick}
          height="auto"
        />
      </div>
    </>
  );
}
