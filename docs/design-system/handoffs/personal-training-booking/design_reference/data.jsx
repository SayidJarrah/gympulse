/* Mock data for the personal training booking flow */

const TRAINERS = [
  {
    id: "t-priya",
    name: "Priya Mendes",
    initial: "P",
    accent: "#4ADE80",
    specialties: ["Mobility", "Strength", "Post-rehab"],
    bio: "11 years coaching. Former national gymnast. Builds programs around movement quality first.",
    sessions: 1340,
    yearsExp: 11,
    rate: "included",
    tags: ["Mon–Fri mornings", "Studio B"],
  },
  {
    id: "t-jordan",
    name: "Jordan Kovač",
    initial: "J",
    accent: "#FB923C",
    specialties: ["Powerlifting", "Strength", "Barbell"],
    bio: "USAPL-certified. Walks you through the big three with no fluff and a lot of rep-by-rep feedback.",
    sessions: 980,
    yearsExp: 8,
    rate: "included",
    tags: ["Evenings", "Main Floor"],
  },
  {
    id: "t-mia",
    name: "Mia Takeda",
    initial: "M",
    accent: "#60A5FA",
    specialties: ["HIIT", "Conditioning", "Athletic perf."],
    bio: "Endurance-first. Former D1 soccer. Session plans hit zone 2 then spike, never the other way round.",
    sessions: 760,
    yearsExp: 6,
    rate: "included",
    tags: ["Sat/Sun", "Studio A"],
  },
  {
    id: "t-noah",
    name: "Noah Ashford",
    initial: "N",
    accent: "#C084FC",
    specialties: ["Boxing", "Conditioning"],
    bio: "Ex-amateur boxer. Mitt work, footwork drills, and conditioning circuits you'll regret at the time.",
    sessions: 520,
    yearsExp: 5,
    rate: "included",
    tags: ["Tue–Thu", "Ring"],
  },
  {
    id: "t-lena",
    name: "Lena Okafor",
    initial: "L",
    accent: "#F472B6",
    specialties: ["Prenatal", "Mobility", "Recovery"],
    bio: "Certified in prenatal + postnatal. Gentle, technical, with a focus on pelvic floor and posture.",
    sessions: 410,
    yearsExp: 7,
    rate: "included",
    tags: ["Weekdays", "Studio B"],
  },
  {
    id: "t-ravi",
    name: "Ravi Chandra",
    initial: "R",
    accent: "#FACC15",
    specialties: ["Olympic lifting", "Mobility"],
    bio: "Snatch, clean & jerk, and everything that makes them work. Patient with beginners.",
    sessions: 640,
    yearsExp: 9,
    rate: "included",
    tags: ["AM + PM", "Platform"],
  },
];

/* Gym open hours (used to derive slots). Monday = 0, Sunday = 6 in our local model */
const GYM_HOURS = {
  weekday: { open: 6, close: 21 }, // 6am → 9pm
  weekend: { open: 8, close: 18 }, // 8am → 6pm
};

/* Group classes already on the schedule — these block the corresponding trainer's slots */
const GROUP_CLASSES = [
  // trainerId, dayOffset (0 = today), hour (local)
  ["t-priya",  0, 7],  ["t-priya",  0, 17],
  ["t-priya",  1, 7],  ["t-priya",  1, 10],
  ["t-priya",  2, 7],  ["t-priya",  3, 7], ["t-priya", 4, 7],
  ["t-jordan", 0, 18], ["t-jordan", 1, 18], ["t-jordan", 2, 18], ["t-jordan", 3, 18],
  ["t-jordan", 1, 9],  ["t-jordan", 4, 18],
  ["t-mia",    0, 9],  ["t-mia",    1, 9],  ["t-mia",    5, 9],
  ["t-mia",    5, 10], ["t-mia",    6, 10],
  ["t-noah",   1, 19], ["t-noah",   2, 19], ["t-noah",   3, 19],
  ["t-lena",   0, 11], ["t-lena",   1, 11], ["t-lena",   2, 11], ["t-lena", 3, 11],
  ["t-ravi",   0, 8],  ["t-ravi",   1, 8],  ["t-ravi",   2, 8], ["t-ravi", 3, 17],
];

/* Existing personal-training bookings that occupy slots */
const EXISTING_PT = [
  ["t-priya",  1, 9],  ["t-priya",  2, 10], ["t-priya",  3, 15],
  ["t-jordan", 0, 16], ["t-jordan", 2, 19], ["t-jordan", 3, 17],
  ["t-mia",    1, 14], ["t-mia",    2, 15], ["t-mia",    4, 10],
  ["t-noah",   0, 17], ["t-noah",   2, 18],
  ["t-lena",   0, 14], ["t-lena",   2, 13],
  ["t-ravi",   1, 16], ["t-ravi",   3, 18],
];

/* Upcoming sessions for the trainer view (Priya) */
const TRAINER_SESSIONS = [
  { when: "Today · 2:00pm",     member: "Dana Reyes",   type: "Personal training", room: "Studio B", note: "Focus: shoulder mobility, prep for squat session", status: "confirmed" },
  { when: "Today · 5:00pm",     member: "Group class — Morning Flow Yoga", type: "Group class", room: "Studio B", note: "12 / 14 booked", status: "class" },
  { when: "Tomorrow · 7:00am",  member: "Group class — Morning Flow Yoga", type: "Group class", room: "Studio B", note: "8 / 14 booked", status: "class" },
  { when: "Tomorrow · 9:00am",  member: "Dana Reyes",   type: "Personal training", room: "Studio B", note: "Second session this week", status: "confirmed" },
  { when: "Wed · 10:00am",      member: "Marcus Li",    type: "Personal training", room: "Studio B", note: "New member, intake form complete", status: "confirmed" },
  { when: "Thu · 3:00pm",       member: "Amelia Tran",  type: "Personal training", room: "Studio B", note: "Returning after 2 weeks off", status: "confirmed" },
];

/* All personal training sessions for admin */
const ADMIN_SESSIONS = [
  { when: "Today · 2:00pm",      trainer: "Priya Mendes",  member: "Dana Reyes",     room: "Studio B",   status: "confirmed" },
  { when: "Today · 4:00pm",      trainer: "Jordan Kovač",  member: "Ethan Wu",       room: "Main Floor", status: "confirmed" },
  { when: "Today · 5:00pm",      trainer: "Noah Ashford",  member: "Sofia Ramos",    room: "Ring",       status: "confirmed" },
  { when: "Today · 2:00pm",      trainer: "Lena Okafor",   member: "Priya Sharma",   room: "Studio B",   status: "confirmed" },
  { when: "Tomorrow · 9:00am",   trainer: "Priya Mendes",  member: "Dana Reyes",     room: "Studio B",   status: "confirmed" },
  { when: "Tomorrow · 2:00pm",   trainer: "Mia Takeda",    member: "Olivia Chen",    room: "Studio A",   status: "confirmed" },
  { when: "Tomorrow · 4:00pm",   trainer: "Ravi Chandra",  member: "Marcus Li",      room: "Platform",   status: "confirmed" },
  { when: "Wed · 10:00am",       trainer: "Priya Mendes",  member: "Marcus Li",      room: "Studio B",   status: "confirmed" },
  { when: "Wed · 3:00pm",        trainer: "Priya Mendes",  member: "Rhea Patel",     room: "Studio B",   status: "confirmed" },
  { when: "Wed · 1:00pm",        trainer: "Lena Okafor",   member: "Jack Harrison",  room: "Studio B",   status: "confirmed" },
  { when: "Wed · 7:00pm",        trainer: "Jordan Kovač",  member: "Yuki Tanaka",    room: "Main Floor", status: "confirmed" },
  { when: "Wed · 6:00pm",        trainer: "Noah Ashford",  member: "Elena Voss",     room: "Ring",       status: "confirmed" },
  { when: "Thu · 3:00pm",        trainer: "Priya Mendes",  member: "Amelia Tran",    room: "Studio B",   status: "confirmed" },
  { when: "Thu · 10:00am",       trainer: "Mia Takeda",    member: "Dana Reyes",     room: "Studio A",   status: "cancelled" },
  { when: "Thu · 5:00pm",        trainer: "Jordan Kovač",  member: "Tomás Silva",    room: "Main Floor", status: "confirmed" },
  { when: "Thu · 6:00pm",        trainer: "Ravi Chandra",  member: "Hiro Sato",      room: "Platform",   status: "confirmed" },
  { when: "Fri · 8:00am",        trainer: "Ravi Chandra",  member: "Clara Müller",   room: "Platform",   status: "confirmed" },
  { when: "Fri · 10:00am",       trainer: "Lena Okafor",   member: "Amelia Tran",    room: "Studio B",   status: "confirmed" },
];

/* Member's existing personal training bookings */
const MY_PT_BOOKINGS = [
  { id: "b1", when: "Today · 2:00pm",     trainerId: "t-priya",  trainer: "Priya Mendes",  room: "Studio B", note: "Shoulder mobility + squat prep", minsFromNow: 180 },
  { id: "b2", when: "Tomorrow · 9:00am",  trainerId: "t-priya",  trainer: "Priya Mendes",  room: "Studio B", note: "Follow-up", minsFromNow: 1380 },
];

Object.assign(window, { TRAINERS, GYM_HOURS, GROUP_CLASSES, EXISTING_PT, TRAINER_SESSIONS, ADMIN_SESSIONS, MY_PT_BOOKINGS });
