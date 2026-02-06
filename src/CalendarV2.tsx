import React, { useRef, useState, useEffect } from 'react';
import { 
  ScheduleComponent, 
  Day, 
  Week, 
  WorkWeek, 
  Month, 
  Agenda, 
  Inject, 
  ViewsDirective, 
  ViewDirective, 
  DragAndDrop, 
  Resize
} from '@syncfusion/ej2-react-schedule';
import './CalendarV2.css';
import { db } from './firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { canEdit } from './permissions';

export default function CalendarV2View() {
  const { user, isAdmin, groups } = useAuth();
  const scheduleRef = useRef<ScheduleComponent>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'events'), (snapshot) => {
      const authInfo = user ? { uid: user.uid, isAdmin, groups } : null;
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        // Map Firestore fields to Syncfusion fields
        // Prioritize StartTime/EndTime (Timestamps), fallback to 'start' string
        const start = d.StartTime?.toDate ? d.StartTime.toDate() : (d.start ? new Date(d.start + (d.start.includes('T') ? '' : 'T00:00:00')) : new Date());
        const end = d.EndTime?.toDate ? d.EndTime.toDate() : (d.start ? new Date(d.start + (d.start.includes('T') ? '' : 'T23:59:59')) : new Date());
        
        const item = {
          Id: doc.id,
          Subject: d.title || d.Subject || 'Untitled Event',
          StartTime: start,
          EndTime: end,
          IsAllDay: d.allDay ?? d.IsAllDay ?? (!d.StartTime && !!d.start && !d.start.includes('T')),
          Description: d.description || d.Description || '',
          Location: d.location || d.Location || '',
          ownerId: d.ownerId,
          allowedEditors: d.allowedEditors,
          allowedGroups: d.allowedGroups
        };

        return {
          ...item,
          IsReadonly: !canEdit(item, authInfo)
        };
      });
      setEvents(data);
    });

    return () => unsubscribe();
  }, [user, isAdmin, groups]);

  const today = new Date();
  const conferenceStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const conferenceEndDate = new Date(
    conferenceStartDate.getFullYear(),
    conferenceStartDate.getMonth(),
    conferenceStartDate.getDate() + 4,
    23,
    59,
    59
  );

  // Create state to control the view and the date
  const [view, setView] = useState<any>('Day');
  const [currentDate, setCurrentDate] = useState(conferenceStartDate);

  // Dynamically calculate work days based on the range
  const getConferenceWorkDays = (start: Date, end: Date) => {
    const days = new Set<number>();
    let current = new Date(start.getTime());
    while (current <= end) {
      days.add(current.getDay());
      current.setDate(current.getDate() + 1);
    }
    return Array.from(days);
  };

  const conferenceWorkDays = getConferenceWorkDays(conferenceStartDate, conferenceEndDate);

  // 1. Re-added Logic to manually tag "Today" cells for the CSS to pick up
  const onDataBound = () => {
    const scheduleObj = scheduleRef.current;
    if (!scheduleObj) return;

    const root = scheduleObj.element;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const nodes = root.querySelectorAll('[data-date]');
    nodes.forEach(n => {
      const msStr = n.getAttribute('data-date');
      if (msStr) {
        const ms = parseInt(msStr, 10);
        if (ms >= startOfDay && ms < endOfDay) {
          // Apply the classes defined in your index.css
          n.classList.add('my-today-col');
          if (n.classList.contains('e-header-cells')) {
            n.classList.add('my-today-header');
          }
        } else {
          n.classList.remove('my-today-col');
          n.classList.remove('my-today-header');
        }
      }
    });
  };

  const onActionComplete = (args: any) => {
    const authInfo = user ? { uid: user.uid, isAdmin, groups } : null;

    if (args.requestType === 'eventCreated') {
      const data = args.data instanceof Array ? args.data[0] : args.data;
      if (!user) {
        alert("You must be signed in to create events.");
        return;
      }
      addDoc(collection(db, 'events'), {
        title: data.Subject || 'New Event',
        description: data.Description || '',
        location: data.Location || '',
        ownerId: user?.uid,
        Subject: data.Subject || 'New Event',
        StartTime: data.StartTime,
        EndTime: data.EndTime,
        IsAllDay: !!data.IsAllDay,
        Description: data.Description || '',
        Location: data.Location || ''
      }).catch(err => {
        console.error("Error creating event:", err);
      });
    }

    if (args.requestType === 'eventChanged') {
      const data = args.data instanceof Array ? args.data[0] : args.data;
      if (!canEdit(data, authInfo)) {
        alert("You don't have permission to edit this event.");
        return;
      }
      const eventRef = doc(db, 'events', data.Id);
      updateDoc(eventRef, {
        title: data.Subject,
        description: data.Description || '',
        location: data.Location || '',
        Subject: data.Subject,
        StartTime: data.StartTime,
        EndTime: data.EndTime,
        IsAllDay: !!data.IsAllDay,
        Description: data.Description || '',
        Location: data.Location || ''
      }).catch(err => {
        console.error("Error updating event:", err);
        alert("Failed to update event. You might not have permission.");
      });
    }

    if (args.requestType === 'eventRemoved') {
      const data = args.data instanceof Array ? args.data[0] : args.data;
      if (!canEdit(data, authInfo)) {
        alert("You don't have permission to delete this event.");
        return;
      }
      const eventId = data.Id || data[0].Id;
      if (eventId) {
        deleteDoc(doc(db, 'events', eventId)).catch(err => {
          console.error("Error deleting event:", err);
        });
      }
    }

    if (args.requestType === 'viewNavigate' || args.requestType === 'dateNavigate') {
      const scheduleObj = scheduleRef.current;
      if (!scheduleObj) return;

      // Get the start and end of the currently visible dates
      const viewDates = scheduleObj.getCurrentViewDates();
      const firstVisibleDate = viewDates[0];
      const lastVisibleDate = viewDates[viewDates.length - 1];

      const prevBtn = scheduleObj.element.querySelector('.e-prev') as HTMLElement;
      const nextBtn = scheduleObj.element.querySelector('.e-next') as HTMLElement;

      if (prevBtn) {
        // Disable if the FIRST visible day is the start of the conference
        const isAtStart = firstVisibleDate <= conferenceStartDate;
        prevBtn.style.opacity = isAtStart ? '0.3' : '1';
        prevBtn.style.pointerEvents = isAtStart ? 'none' : 'auto';
      }
      if (nextBtn) {
        // Disable if the LAST visible day is the end of the conference
        const isAtEnd = lastVisibleDate >= conferenceEndDate;
        nextBtn.style.opacity = isAtEnd ? '0.3' : '1';
        nextBtn.style.pointerEvents = isAtEnd ? 'none' : 'auto';
      }
    }
  };

  const eventTemplate = (props: any) => {
    return (
      <div className="template-wrap">
        <div className="subject" style={{ fontWeight: 'bold' }}>{props.Subject}</div>
        <div className="time" style={{ fontSize: '11px', opacity: 0.8 }}>
          {props.StartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  };

  const onNavigating = (args: any) => {
    if (args.action === 'view') {
      const target = args.viewName || args.currentView;
      setView(target); 

      if (target === 'single-day' || target === 'Day') {
        const today = new Date();
        if (today >= conferenceStartDate && today <= conferenceEndDate) {
          // 1. Force the internal scheduler property immediately
          args.currentDate = today; 
          
          // 2. Directly update the ref to bypass the state-render delay
          if (scheduleRef.current) {
            scheduleRef.current.selectedDate = today;
          }

          // 3. Keep React state in sync
          setCurrentDate(today);
        }
      } else if (target === 'full-schedule') {
        args.currentDate = conferenceStartDate;
        if (scheduleRef.current) {
          scheduleRef.current.selectedDate = conferenceStartDate;
        }
        setCurrentDate(conferenceStartDate);
      }
    } else if (args.action === 'date') {
      if (args.currentDate) {
        setCurrentDate(args.currentDate);
      }
    }
  };

  // Calculate the total number of days in the conference
  const diffTime = Math.abs(conferenceEndDate.getTime() - conferenceStartDate.getTime());
  const conferenceLength = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <div style={{ padding: 16 }}>
      <h2>Conference Schedule</h2>      
      <div style={{ height: 'calc(100vh - 250px)', width: '100%', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
        <ScheduleComponent
          ref={scheduleRef}
          width='100%'
          height='100%'
          selectedDate={currentDate}
          currentView={view}
          minDate={conferenceStartDate}
          maxDate={conferenceEndDate}
          workDays={conferenceWorkDays}
          allowDragAndDrop={!!user}
          allowResizing={!!user}
          allowMultiCellSelection={!!user}
          readonly={!user}
          navigating={onNavigating}
          eventSettings={{ 
            dataSource: events,
            template: eventTemplate,
            enableTooltip: true
          }}
          actionComplete={onActionComplete}
          dataBound={onDataBound}
          showWeekend={true}
        >
          <ViewsDirective>
            <ViewDirective 
              // @ts-ignore
              name='full-schedule'
              option='Day' 
              displayName='Full Schedule' 
              interval={conferenceLength} 
              cssClass='full-schedule-view'
            />
            <ViewDirective 
              // @ts-ignore
              name='single-day'
              option='Day' 
              displayName='Day' 
            />
            <ViewDirective option='Week' displayName='Week Schedule' showWeekend={true} />
            <ViewDirective option='Month' />
            <ViewDirective option='Agenda' />
          </ViewsDirective>
          <Inject services={[Day, Week, WorkWeek, Month, Agenda, DragAndDrop, Resize]} />
        </ScheduleComponent>
      </div>
    </div>
  );
}
