import React, { useState, useMemo, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventApi } from '@fullcalendar/core';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
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
  onDelete?: (id: string) => void;
}

function EventDetails({ event, onClose, user, isAdmin, groups, onSave, onDelete }: EventDetailsProps) {
  const { title, start, description, location, allowedEditors, allowedGroups } = event;
  if (!title && !start) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<{ 
    title: string; 
    start: string; 
    description?: string; 
    location?: string;
    allowedEditors?: string[];
    allowedGroups?: string[];
  }>({ 
    title, 
    start, 
    description, 
    location,
    allowedEditors: allowedEditors || [],
    allowedGroups: allowedGroups || []
  });

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  };

  const boxStyle: React.CSSProperties = {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    maxWidth: 500,
    width: '90%',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    color: '#213547'
  };

  function startEdit() {
    setDraft({ 
      title, 
      start, 
      description, 
      location,
      allowedEditors: allowedEditors || [],
      allowedGroups: allowedGroups || []
    });
    setIsEditing(true);
  }

  async function save() {
    if (onSave) {
      await onSave({ 
        ...event, 
        title: draft.title, 
        start: draft.start, 
        description: draft.description, 
        location: draft.location,
        allowedEditors: draft.allowedEditors,
        allowedGroups: draft.allowedGroups
      });
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
            {canEdit(event, authInfo) && !isEditing && (
              <>
                <button onClick={startEdit} style={{ marginRight: 8 }}>Edit</button>
                {onDelete && (
                  <button 
                    onClick={() => onDelete(event.id)} 
                    style={{ marginRight: 8, backgroundColor: '#ff4d4f', color: 'white' }}
                  >
                    Delete
                  </button>
                )}
              </>
            )}
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {isEditing ? (
          <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
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
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#666' }}>Location</label>
              <input value={draft.location} onChange={e => setDraft(d => ({ ...d, location: e.target.value }))} style={{ width: '100%' }} />
            </div>
            
            <div style={{ borderTop: '1px solid #eee', marginTop: 16, paddingTop: 16 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Permissions</h4>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#666' }}>Allowed Editors (UIDs, comma separated)</label>
                <input 
                  value={draft.allowedEditors?.join(', ')} 
                  onChange={e => setDraft(d => ({ ...d, allowedEditors: e.target.value.split(',').map(s => s.trim()).filter(s => s) }))} 
                  style={{ width: '100%' }} 
                  placeholder="e.g. uid1, uid2"
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#666' }}>Allowed Groups (comma separated)</label>
                <input 
                  value={draft.allowedGroups?.join(', ')} 
                  onChange={e => setDraft(d => ({ ...d, allowedGroups: e.target.value.split(',').map(s => s.trim()).filter(s => s) }))} 
                  style={{ width: '100%' }} 
                  placeholder="e.g. organizers, speakers"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
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
            {(allowedEditors?.length || allowedGroups?.length) ? (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #eee', fontSize: 12, color: '#666' }}>
                {allowedEditors && allowedEditors.length > 0 && (
                  <div><strong>Editors:</strong> {allowedEditors.join(', ')}</div>
                )}
                {allowedGroups && allowedGroups.length > 0 && (
                  <div><strong>Groups:</strong> {allowedGroups.join(', ')}</div>
                )}
              </div>
            ) : null}
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
  const [isAdding, setIsAdding] = useState(false);
  const [newEvent, setNewEvent] = useState<{
    title: string;
    start: string;
    description: string;
    location: string;
    allowedEditors: string[];
    allowedGroups: string[];
  }>({ 
    title: '', 
    start: new Date().toISOString().slice(0, 10), 
    description: '', 
    location: '',
    allowedEditors: [],
    allowedGroups: []
  });

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
        location: updated.location || '',
        allowedEditors: updated.allowedEditors || [],
        allowedGroups: updated.allowedGroups || []
      });
      setSelectedEvent(updated);
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to save changes. You might not have permission.');
    }
  }

  async function handleDeleteEvent(id: string) {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteDoc(doc(db, 'events', id));
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. You might not have permission.');
    }
  }

  async function handleAddEvent() {
    if (!user) {
      alert('You must be signed in to add events.');
      return;
    }
    if (!newEvent.title || !newEvent.start) {
      alert('Please fill in both title and date.');
      return;
    }

    try {
      await addDoc(collection(db, 'events'), {
        ...newEvent,
        ownerId: user.uid
      });
      setNewEvent({ 
        title: '', 
        start: new Date().toISOString().slice(0, 10), 
        description: '', 
        location: '',
        allowedEditors: [],
        allowedGroups: []
      });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event. You might not have permission.');
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
      {isAdmin && !isAdding && (
        <button 
          onClick={() => setIsAdding(true)} 
          style={{ marginBottom: 20, padding: '8px 16px', backgroundColor: '#646cff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          + New Event
        </button>
      )}

      {isAdding && (
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', marginBottom: '2rem', color: '#213547' }}>
          <h3 style={{ marginTop: 0 }}>Add New Event</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Title</label>
            <input 
              value={newEvent.title} 
              onChange={e => setNewEvent(prev => ({ ...prev, title: e.target.value }))} 
              style={{ width: '100%', padding: 8 }} 
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Date</label>
            <input 
              type="date" 
              value={newEvent.start} 
              onChange={e => setNewEvent(prev => ({ ...prev, start: e.target.value }))} 
              style={{ padding: 8 }} 
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Description</label>
            <textarea 
              value={newEvent.description} 
              onChange={e => setNewEvent(prev => ({ ...prev, description: e.target.value }))} 
              style={{ width: '100%', padding: 8, minHeight: 80 }} 
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Location</label>
            <input 
              value={newEvent.location} 
              onChange={e => setNewEvent(prev => ({ ...prev, location: e.target.value }))} 
              style={{ width: '100%', padding: 8 }} 
            />
          </div>
          <div style={{ borderTop: '1px solid #eee', marginTop: 16, paddingTop: 16 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Permissions</h4>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Allowed Editors (UIDs, comma separated)</label>
              <input 
                value={newEvent.allowedEditors.join(', ')} 
                onChange={e => setNewEvent(prev => ({ ...prev, allowedEditors: e.target.value.split(',').map(s => s.trim()).filter(s => s) }))} 
                style={{ width: '100%', padding: 8 }} 
                placeholder="e.g. uid1, uid2"
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>Allowed Groups (comma separated)</label>
              <input 
                value={newEvent.allowedGroups.join(', ')} 
                onChange={e => setNewEvent(prev => ({ ...prev, allowedGroups: e.target.value.split(',').map(s => s.trim()).filter(s => s) }))} 
                style={{ width: '100%', padding: 8 }} 
                placeholder="e.g. organizers, speakers"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAddEvent}>Add Event</button>
            <button onClick={() => setIsAdding(false)} style={{ backgroundColor: '#eee', color: '#333' }}>Cancel</button>
          </div>
        </div>
      )}

      {selectedEvent && (
        <EventDetails
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          user={user}
          isAdmin={isAdmin}
          groups={groups}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
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
