# Brief: personal-training-booking

## Problem
There is no personal training booking functionality today. Members can only book group classes. Members need the ability to book one-on-one sessions with a trainer of their choice.

## Roles
- Member
- Trainer
- Admin

## Key Actions
- **Member:** browse available trainers, view a trainer's available time slots on a calendar, book a 1-hour personal training session, cancel a booking
- **Trainer:** view list of their upcoming personal training sessions
- **Admin:** view all personal training sessions across all members and trainers

## Business Rules
- All personal training sessions are 1 hour in duration (fixed, no other options)
- Members must book at least 24 hours in advance
- A trainer cannot have overlapping sessions (personal training or group class)
- Trainer availability = gym working hours, minus any time slots already assigned to a group class
- After selecting a trainer, the member sees a calendar showing only available (unbooked, non-conflicting) slots

## Out of Scope
- Payments for personal training sessions
- Manual trainer availability management (trainers cannot set custom availability windows)
- Trainer ratings or reviews
