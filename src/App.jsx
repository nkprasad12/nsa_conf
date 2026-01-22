import React, { useRef, useState } from 'react';
import { ScheduleComponent, Day, Week, WorkWeek, Month, Agenda, Inject, ViewsDirective, ViewDirective, DragAndDrop, Resize } from '@syncfusion/ej2-react-schedule';
import { sampleData } from './data';
import './index.css'; 

const conferenceStartDate = new Date(2025, 11, 30);
const conferenceEndDate = new Date(2026, 0, 4, 23, 59, 59);

// Dynamically calculate work days based on the range
const getConferenceWorkDays = (start, end) => {
  const days = new Set();
  let current = new Date(start.getTime());
  while (current <= end) {
    days.add(current.getDay());
    current.setDate(current.getDate() + 1);
  }
  return Array.from(days);
};

const conferenceWorkDays = getConferenceWorkDays(conferenceStartDate, conferenceEndDate);

export default function App() {
  const scheduleRef = useRef(null);

  // Create state to control the view and the date
  const [view, setView] = useState('Day');


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
      const ms = parseInt(n.getAttribute('data-date'), 10);
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
    });
  };

const onActionComplete = (args) => {
  if (args.requestType === 'viewNavigate') {
    const scheduleObj = scheduleRef.current;
    if (scheduleObj) {
      const currentView = scheduleObj.currentView;
      setView(currentView);

      // Enforce date reset logic after view change
      let targetDate = null;
      if (currentView === 'full-schedule') {
        targetDate = conferenceStartDate;
      } else if (currentView === 'single-day' || currentView === 'Day') {
        const today = new Date();
        targetDate = (today >= conferenceStartDate && today <= conferenceEndDate) ? today : conferenceStartDate;
      }

      if (targetDate) {
        // Only update if the date is actually different to avoid unnecessary re-renders
        if (scheduleObj.selectedDate.toDateString() !== targetDate.toDateString()) {
          scheduleObj.selectedDate = targetDate;
        }
      }
    }
  }

  if (args.requestType === 'viewNavigate' || args.requestType === 'dateNavigate') {
    const scheduleObj = scheduleRef.current;
    if (!scheduleObj) return;

    // Get the start and end of the currently visible dates
    const viewDates = scheduleObj.getCurrentViewDates();
    const firstVisibleDate = viewDates[0];
    const lastVisibleDate = viewDates[viewDates.length - 1];

    const prevBtn = scheduleObj.element.querySelector('.e-prev');
    const nextBtn = scheduleObj.element.querySelector('.e-next');

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
  const eventTemplate = (props) => {
  return (
    <div className="template-wrap">
      <div className="subject" style={{ fontWeight: 'bold' }}>{props.Subject}</div>
      <div className="time" style={{ fontSize: '11px', opacity: 0.8 }}>
        {props.StartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
};

const onActionBegin = (args) => {
  if (args.requestType === 'viewNavigate') {
    // Logic moved to onActionComplete for reliability
  }
};

//Calculate the total number of days in the conference
const diffTime = Math.abs(conferenceEndDate - conferenceStartDate);
const conferenceLength = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
  <div style={{ padding: 16 }}>
    <h2>Conference Schedule</h2>      
    <div style={{ height: 'calc(100vh - 100px)', width: '100%', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '12px' }}>
      <ScheduleComponent
        ref={scheduleRef}
        width='100%'
        height='100%'
        selectedDate={conferenceStartDate}
        currentView={view}
        minDate={conferenceStartDate}
        maxDate={conferenceEndDate}
        workDays={conferenceWorkDays}
        allowDragAndDrop={true}
        allowResizing={true}
        allowMultiCellSelection={true}
        actionBegin={onActionBegin}
        eventSettings={{ 
          dataSource: sampleData,
          template: eventTemplate
        }}
        actionComplete={onActionComplete}
        dataBound={onDataBound}
        showWeekend={true}
      >
  <ViewsDirective>
  <ViewDirective 
    name='full-schedule'
    option='Day' 
    displayName='Full Schedule' 
    interval={conferenceLength} 
    cssClass='full-schedule-view'
  />
  <ViewDirective 
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