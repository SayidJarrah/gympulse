export interface RoomRecord {
  name: string;
  capacity: number;
  description: string;
}

export const V13_ROOMS: RoomRecord[] = [
  { name: 'Studio A', capacity: 30, description: 'Main group fitness studio' },
  { name: 'Studio B', capacity: 20, description: 'Spin and cycling studio' },
  { name: 'Weight Room', capacity: 15, description: 'Strength training area' },
];
