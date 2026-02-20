import React, { useRef, useState, useEffect, useMemo } from 'react';
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
import { useConference } from './ConferenceContext';
import { canEdit } from './permissions';

export default function CalendarV2View() {
  const { user, isGlobalAdmin } = useAuth();
  const { conferenceId, conference, isAdmin, groups } = useConference();
  const scheduleRef = useRef<ScheduleComponent>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Calculate conference range
  const { conferenceStartDate, conferenceEndDate, today } = useMemo(() => {
    const now = new Date();
    if (!conference) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 4, 23, 59, 59);
      return { conferenceStartDate: start, conferenceEndDate: end, today: now };
    }
    return { 
      conferenceStartDate: new Date(conference.startDate), 
      conferenceEndDate: new Date(conference.endDate), 
      today: now 
    };
  }, [conference]);

  useEffect(() => {
    if (!conferenceId) return;
    const unsubscribe = onSnapshot(collection(db, 'conferences', conferenceId, 'events'), (snapshot) => {
      const authInfo = user ? { uid: user.uid, isAdmin, isGlobalAdmin, groups } : null;
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        
        // Helper to handle Firestore Timestamps, JS Dates, or Strings
        const parseDate = (val: any, fallback: Date) => {
          if (!val) return fallback;
          if (val.toDate) return val.toDate();
          if (val instanceof Date) return val;
          if (typeof val === 'string') return new Date(val);
          return fallback;
        };

        const start = parseDate(d.StartTime, d.start ? new Date(d.start + (d.start.includes('T') ? '' : 'T00:00:00')) : today);
        const end = parseDate(d.EndTime, d.start ? new Date(d.start + (d.start.includes('T') ? '' : 'T23:59:59')) : today);
        
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
      if (!hasLoadedData) setHasLoadedData(true);
    });

    return () => unsubscribe();
  }, [user, isAdmin, isGlobalAdmin, groups, today, hasLoadedData, conferenceId]);

  // Use the memoized conferenceStartDate
  const [view, setView] = useState<any>('Day');
  const [currentDate, setCurrentDate] = useState(conferenceStartDate);

  // Update currentDate when conferenceStartDate changes (on load)
  useEffect(() => {
    setCurrentDate(conferenceStartDate);
  }, [conferenceStartDate]);

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
    const authInfo = user ? { uid: user.uid, isAdmin, isGlobalAdmin, groups } : null;
    if (!conferenceId) return;

    if (args.requestType === 'eventCreated') {
      const data = args.data instanceof Array ? args.data[0] : args.data;
      if (!user) {
        alert("You must be signed in to create events.");
        return;
      }
      addDoc(collection(db, 'conferences', conferenceId, 'events'), {
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
      const eventRef = doc(db, 'conferences', conferenceId, 'events', data.Id);
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
      const eventId = data.Id || (data[0] && data[0].Id);
      if (eventId) {
        deleteDoc(doc(db, 'conferences', conferenceId, 'events', eventId)).catch(err => {
          console.error("Error deleting event:", err);
        });
      }
    }

    if (args.requestType === 'viewNavigate' || args.requestType === 'dateNavigate') {
      const scheduleObj = scheduleRef.current;
      if (!scheduleObj) return;

      const viewDates = scheduleObj.getCurrentViewDates();
      const firstVisibleDate = viewDates[0];
      const lastVisibleDate = viewDates[viewDates.length - 1];

      const prevBtn = scheduleObj.element.querySelector('.e-prev') as HTMLElement;
      const nextBtn = scheduleObj.element.querySelector('.e-next') as HTMLElement;

      if (prevBtn) {
        const isAtStart = firstVisibleDate <= conferenceStartDate;
        prevBtn.style.opacity = isAtStart ? '0.3' : '1';
        prevBtn.style.pointerEvents = isAtStart ? 'none' : 'auto';
      }
      if (nextBtn) {
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
        const todayAtConf = new Date();
        if (todayAtConf >= conferenceStartDate && todayAtConf <= conferenceEndDate) {
          args.currentDate = todayAtConf; 
          if (scheduleRef.current) {
            scheduleRef.current.selectedDate = todayAtConf;
          }
          setCurrentDate(todayAtConf);
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

  const diffTime = Math.abs(conferenceEndDate.getTime() - conferenceStartDate.getTime());
  const conferenceLength = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

  const eventSettings = useMemo(() => ({ 
    dataSource: events,
    template: eventTemplate,
    enableTooltip: true
  }), [events]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Conference Schedule</h2>      
      <div style={{ height: 'calc(100vh - 250px)', width: '100%', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
        <ScheduleComponent
          key={hasLoadedData ? `scheduler-${conferenceId}-loaded` : `scheduler-${conferenceId}-loading`}
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
          eventSettings={eventSettings}
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
