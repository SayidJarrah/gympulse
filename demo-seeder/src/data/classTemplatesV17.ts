export interface ClassTemplateV17Record {
  id: string;                  // fixed UUID — must not change
  name: string;
  description: string;
  category: string;
  defaultDurationMin: number;
  defaultCapacity: number;
  difficulty: string;
  isSeeded: boolean;
  imageUrl: string;
}

export const V17_CLASS_TEMPLATES: ClassTemplateV17Record[] = [
  {
    id: '33333333-3333-3333-3333-333333333301',
    name: 'Sunrise Stretch',
    description: 'Gentle flexibility and mobility class to start the day.',
    category: 'Flexibility',
    defaultDurationMin: 45,
    defaultCapacity: 18,
    difficulty: 'Beginner',
    isSeeded: true,
    imageUrl: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=800&auto=format&fit=crop',
  },
  {
    id: '33333333-3333-3333-3333-333333333302',
    name: 'Power Yoga',
    description: 'Dynamic vinyasa flow with strength and balance sequences.',
    category: 'Mind & Body',
    defaultDurationMin: 60,
    defaultCapacity: 20,
    difficulty: 'Intermediate',
    isSeeded: true,
    imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop',
  },
  {
    id: '33333333-3333-3333-3333-333333333303',
    name: 'Functional Circuit',
    description: 'Timed stations focused on full-body functional movement.',
    category: 'Functional',
    defaultDurationMin: 50,
    defaultCapacity: 24,
    difficulty: 'All Levels',
    isSeeded: true,
    imageUrl: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=800&auto=format&fit=crop',
  },
  {
    id: '33333333-3333-3333-3333-333333333304',
    name: 'Boxing Fundamentals',
    description: 'Skill-based boxing combinations and footwork drills.',
    category: 'Combat',
    defaultDurationMin: 55,
    defaultCapacity: 22,
    difficulty: 'Beginner',
    isSeeded: true,
    imageUrl: 'https://images.unsplash.com/photo-1549824846-7a83ffc5b7da?w=800&auto=format&fit=crop',
  },
  {
    id: '33333333-3333-3333-3333-333333333305',
    name: 'Dance Cardio Blast',
    description: 'High-energy dance workout with simple choreography.',
    category: 'Dance',
    defaultDurationMin: 45,
    defaultCapacity: 30,
    difficulty: 'All Levels',
    isSeeded: true,
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop',
  },
  {
    id: '33333333-3333-3333-3333-333333333306',
    name: 'Aqua Flow',
    description: 'Low-impact pool class focused on joint-friendly conditioning.',
    category: 'Aqua',
    defaultDurationMin: 40,
    defaultCapacity: 16,
    difficulty: 'Beginner',
    isSeeded: true,
    imageUrl: 'https://images.unsplash.com/photo-1571019613975-0b56b2bcf1f8?w=800&auto=format&fit=crop',
  },
  {
    id: '33333333-3333-3333-3333-333333333307',
    name: 'Cycle Endurance',
    description: 'Longer ride format that builds aerobic capacity.',
    category: 'Cycling',
    defaultDurationMin: 60,
    defaultCapacity: 28,
    difficulty: 'Intermediate',
    isSeeded: true,
    imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&auto=format&fit=crop',
  },
  {
    id: '33333333-3333-3333-3333-333333333308',
    name: 'Core Ignite',
    description: 'Targeted core strength and stability training.',
    category: 'Strength',
    defaultDurationMin: 40,
    defaultCapacity: 20,
    difficulty: 'All Levels',
    isSeeded: true,
    imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&auto=format&fit=crop',
  },
  {
    id: '33333333-3333-3333-3333-333333333309',
    name: 'Meditation Reset',
    description: 'Guided breathwork and meditation for recovery and focus.',
    category: 'Wellness',
    defaultDurationMin: 30,
    defaultCapacity: 25,
    difficulty: 'Beginner',
    isSeeded: true,
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop',
  },
  {
    id: '33333333-3333-3333-3333-333333333310',
    name: 'Mobility Lab',
    description: 'Joint mobility and movement prep for better training quality.',
    category: 'Flexibility',
    defaultDurationMin: 50,
    defaultCapacity: 18,
    difficulty: 'All Levels',
    isSeeded: true,
    imageUrl: 'https://images.unsplash.com/photo-1517438476312-10437cf17e7e?w=800&auto=format&fit=crop',
  },
];
