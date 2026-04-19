export interface QaUserRecord {
  id: string;             // fixed UUID — must not change
  email: string;
  passwordHash: string;   // bcrypt hash — plaintext credentials are listed with each entry below
  role: 'USER';
}

export interface QaProfileRecord {
  email: string;           // join key — resolved to user_id at insert time
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;     // ISO date string: 'YYYY-MM-DD'
  fitnessGoals: string[];
  preferredClassTypes: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

const PASSWORD_HASH = '$2a$10$7EqJtq98hPqEX7fNZaFWoOa4Z1GpSgaFjxuqFkEqLzYmI2lHvk3yS';

export const QA_USERS: QaUserRecord[] = [
  { id: '44444444-4444-4444-4444-444444444401', email: 'qa.user01@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444402', email: 'qa.user02@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444403', email: 'qa.user03@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444404', email: 'qa.user04@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444405', email: 'qa.user05@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444406', email: 'qa.user06@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444407', email: 'qa.user07@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444408', email: 'qa.user08@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444409', email: 'qa.user09@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
  { id: '44444444-4444-4444-4444-444444444410', email: 'qa.user10@gymflow.local', passwordHash: PASSWORD_HASH, role: 'USER' },
];

export const QA_PROFILES: QaProfileRecord[] = [
  { email: 'qa.user01@gymflow.local', firstName: 'Avery',  lastName: 'West',    phone: '+14155551001', dateOfBirth: '1993-02-10', fitnessGoals: ['Build strength', 'Improve posture'],           preferredClassTypes: ['Strength', 'Mind & Body'], emergencyContactName: 'Dana West',      emergencyContactPhone: '+14155559001' },
  { email: 'qa.user02@gymflow.local', firstName: 'Jordan', lastName: 'Reed',    phone: '+14155551002', dateOfBirth: '1988-11-05', fitnessGoals: ['Increase endurance', 'Lose weight'],           preferredClassTypes: ['Cardio', 'Cycling'],        emergencyContactName: 'Sam Reed',       emergencyContactPhone: '+14155559002' },
  { email: 'qa.user03@gymflow.local', firstName: 'Casey',  lastName: 'Nguyen',  phone: '+14155551003', dateOfBirth: '1996-07-19', fitnessGoals: ['Improve flexibility', 'Reduce stress'],        preferredClassTypes: ['Flexibility', 'Wellness'],  emergencyContactName: 'Alex Nguyen',    emergencyContactPhone: '+14155559003' },
  { email: 'qa.user04@gymflow.local', firstName: 'Taylor', lastName: 'Diaz',    phone: '+14155551004', dateOfBirth: '1990-03-24', fitnessGoals: ['Build muscle', 'Improve balance'],             preferredClassTypes: ['Strength', 'Functional'],   emergencyContactName: 'Robin Diaz',     emergencyContactPhone: '+14155559004' },
  { email: 'qa.user05@gymflow.local', firstName: 'Morgan', lastName: 'Patel',   phone: '+14155551005', dateOfBirth: '1992-12-02', fitnessGoals: ['Increase energy', 'Stay consistent'],          preferredClassTypes: ['Cardio', 'Dance'],           emergencyContactName: 'Jamie Patel',    emergencyContactPhone: '+14155559005' },
  { email: 'qa.user06@gymflow.local', firstName: 'Riley',  lastName: 'Chen',    phone: '+14155551006', dateOfBirth: '1985-09-14', fitnessGoals: ['Recover from injury', 'Improve mobility'],     preferredClassTypes: ['Wellness', 'Flexibility'],  emergencyContactName: 'Skyler Chen',    emergencyContactPhone: '+14155559006' },
  { email: 'qa.user07@gymflow.local', firstName: 'Quinn',  lastName: 'Lopez',   phone: '+14155551007', dateOfBirth: '1998-01-29', fitnessGoals: ['Improve athleticism', 'Build power'],          preferredClassTypes: ['Functional', 'Strength'] },
  { email: 'qa.user08@gymflow.local', firstName: 'Sydney', lastName: 'Foster',  phone: '+14155551008', dateOfBirth: '1994-05-11', fitnessGoals: ['Stay active', 'Reduce stress'],                preferredClassTypes: ['Mind & Body', 'Wellness'] },
  { email: 'qa.user09@gymflow.local', firstName: 'Parker', lastName: 'Singh',   phone: '+14155551009', dateOfBirth: '1989-08-30', fitnessGoals: ['Increase stamina', 'Improve speed'],           preferredClassTypes: ['Cardio', 'Combat'] },
  { email: 'qa.user10@gymflow.local', firstName: 'Drew',   lastName: 'Santos',  phone: '+14155551010', dateOfBirth: '1991-06-08', fitnessGoals: ['Build core strength', 'Improve flexibility'], preferredClassTypes: ['Strength', 'Flexibility'] },
];
