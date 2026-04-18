export interface ClassTemplateRecord {
  name: string;
  description: string | null;
  category: string;
  defaultDurationMin: number;
  defaultCapacity: number;
  difficulty: string;
  isSeeded: boolean;
  imageUrl: string;
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
    imageUrl: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&auto=format&fit=crop',
  },
  {
    name: 'Yoga Flow',
    description: null,
    category: 'Flexibility',
    defaultDurationMin: 60,
    defaultCapacity: 15,
    difficulty: 'All Levels',
    isSeeded: true,
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&auto=format&fit=crop',
  },
  {
    name: 'Spin Cycle',
    description: null,
    category: 'Cardio',
    defaultDurationMin: 45,
    defaultCapacity: 25,
    difficulty: 'Intermediate',
    isSeeded: true,
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop',
  },
  {
    name: 'Strength & Conditioning',
    description: null,
    category: 'Strength',
    defaultDurationMin: 60,
    defaultCapacity: 12,
    difficulty: 'Intermediate',
    isSeeded: true,
    imageUrl: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&auto=format&fit=crop',
  },
  {
    name: 'Pilates Core',
    description: null,
    category: 'Flexibility',
    defaultDurationMin: 50,
    defaultCapacity: 10,
    difficulty: 'Beginner',
    isSeeded: true,
    imageUrl: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&auto=format&fit=crop',
  },
];
