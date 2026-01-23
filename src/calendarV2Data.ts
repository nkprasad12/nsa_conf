// Minimal sample events for the Scheduler demo
export const sampleData = [
  {
    Id: 1,
    Subject: 'Board Meeting',
    StartTime: new Date(new Date().setHours(new Date().getHours() + 1)),
    EndTime: new Date(new Date().setHours(new Date().getHours() + 2)),
    IsAllDay: false
  },
  {
    Id: 2,
    Subject: 'Training session',
    StartTime: new Date(new Date().setDate(new Date().getDate() + 1)),
    EndTime: new Date(new Date().setDate(new Date().getDate() + 1)),
    IsAllDay: true
  },
  {
    Id: 3,
    Subject: 'Client call',
    StartTime: new Date(new Date().setHours(new Date().getHours() + 4)),
    EndTime: new Date(new Date().setHours(new Date().getHours() + 5)),
    IsAllDay: false
  }
];
