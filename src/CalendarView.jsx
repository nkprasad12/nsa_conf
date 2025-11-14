import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
// NOTE: CSS for FullCalendar is loaded from index.html via CDN links

const sampleEvents = [
  { id: '1', title: 'Opening Keynote', start: new Date().toISOString().slice(0,10) },
  { id: '2', title: 'Networking Lunch', start: new Date(Date.now() + 1000*60*60*24).toISOString().slice(0,10) },
  { id: '3', title: 'Workshop: Security', start: new Date(Date.now() + 2*1000*60*60*24).toISOString().slice(0,10) }
];

export default function CalendarView() {
  return (
    <div className="calendar-wrapper">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' }}
        editable={false}
        selectable={true}
        events={sampleEvents}
        height="auto"
      />
    </div>
  );
}
