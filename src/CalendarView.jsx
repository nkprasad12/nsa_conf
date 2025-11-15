import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
// NOTE: CSS for FullCalendar is loaded from index.html via CDN links

const sampleEvents = [
  { id: '1', title: 'Opening Keynote', start: new Date().toISOString().slice(0,10), description: 'Hear from our opening speaker about the state of security.' },
  { id: '2', title: 'Networking Lunch', start: new Date(Date.now() + 1000*60*60*24).toISOString().slice(0,10), description: 'Casual lunch and networking with peers.' },
  { id: '3', title: 'Workshop: Security', start: new Date(Date.now() + 2*1000*60*60*24).toISOString().slice(0,10), description: 'Hands-on workshop covering modern security practices.' }
];

/**
 * @typedef {Object} EventDetailsProps
 * @property {string} title
 * @property {string} start
 * @property {string} [description]
 * @property {string} [location]
 * @property {() => void} onClose
 */

/**
 * Event details modal.
 * @param {EventDetailsProps} props
 */
function EventDetails({ title, start, description, location, onClose }) {
  if (!title && !start) return null;

  const overlayStyle = {
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

  const boxStyle = {
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

export default function CalendarView() {
  const [selectedEvent, setSelectedEvent] = useState(null);

  function handleEventClick(info) {
    // info.event is a FullCalendar EventApi
    const e = info.event;
    const payload = {
      id: e.id,
      title: e.title,
      start: e.startStr || (e.start ? e.start.toISOString().slice(0,10) : ''),
      description: e.description,
      // copy any extended props (like description, location)
      ...e.extendedProps
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
