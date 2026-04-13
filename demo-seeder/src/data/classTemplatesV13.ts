export interface ClassTemplateRecord {
  name: string;
  description: string | null;
  category: string;
  defaultDurationMin: number;
  defaultCapacity: number;
  difficulty: string;
  isSeeded: boolean;
}

export const V13_CLASS_TEMPLATES: ClassTemplateRecord[] = [
  {
    name: 'HIIT Bootcamp',
    description: null,
    category: 'Cardio',
    defaultDurationMin: 60,
    defaultCapacity: 20,
    difficulty: 'All Levels',
    isSeeded: true,
  },
  {
    name: 'Yoga Flow',
    description: null,
    category: 'Flexibility',
    defaultDurationMin: 60,
    defaultCapacity: 15,
    difficulty: 'All Levels',
    isSeeded: true,
  },
  {
    name: 'Spin Cycle',
    description: null,
    category: 'Cardio',
    defaultDurationMin: 45,
    defaultCapacity: 25,
    difficulty: 'Intermediate',
    isSeeded: true,
  },
  {
    name: 'Strength & Conditioning',
    description: null,
    category: 'Strength',
    defaultDurationMin: 60,
    defaultCapacity: 12,
    difficulty: 'Intermediate',
    isSeeded: true,
  },
  {
    name: 'Pilates Core',
    description: null,
    category: 'Flexibility',
    defaultDurationMin: 50,
    defaultCapacity: 10,
    difficulty: 'Beginner',
    isSeeded: true,
  },
];
