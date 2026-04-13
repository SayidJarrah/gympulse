export interface RoomRecord {
  name: string;
  capacity: number;
  description: string;
  imageUrl: string;
}

export const V13_ROOMS: RoomRecord[] = [
  {
    name: 'Pulse Studio',
    capacity: 30,
    description: 'Main group fitness studio',
    imageUrl: 'https://images.unsplash.com/photo-1534438327535-0c01b3c3ea3a?w=800&auto=format&fit=crop',
  },
  {
    name: 'Cycle Studio',
    capacity: 20,
    description: 'Spin and cycling studio',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop',
  },
  {
    name: 'Weight Room',
    capacity: 15,
    description: 'Strength training area',
    imageUrl: 'https://images.unsplash.com/photo-1534367990453-3bcd4d4f8a9f?w=800&auto=format&fit=crop',
  },
  {
    name: 'Functional Space',
    capacity: 18,
    description: 'Open functional training area with rigs and sleds',
    imageUrl: 'https://images.unsplash.com/photo-1601422407176-00bd94c73b7f?w=800&auto=format&fit=crop',
  },
  {
    name: 'Outdoor Terrace',
    capacity: 25,
    description: 'Covered outdoor training terrace',
    imageUrl: 'https://images.unsplash.com/photo-1571731956672-f9e7ffe66da7?w=800&auto=format&fit=crop',
  },
  {
    name: 'Recovery Suite',
    capacity: 10,
    description: 'Dedicated mobility, foam rolling and recovery area',
    imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop',
  },
];
