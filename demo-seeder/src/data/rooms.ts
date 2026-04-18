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
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop',
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
    imageUrl: 'https://images.unsplash.com/photo-1594882645126-14020914d58d?w=800&auto=format&fit=crop',
  },
  {
    name: 'Functional Space',
    capacity: 18,
    description: 'Open functional training area with rigs and sleds',
    imageUrl: 'https://images.unsplash.com/photo-1540496905036-5937c10647cc?w=800&auto=format&fit=crop',
  },
  {
    name: 'Outdoor Terrace',
    capacity: 25,
    description: 'Covered outdoor training terrace',
    imageUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&auto=format&fit=crop',
  },
  {
    name: 'Recovery Suite',
    capacity: 10,
    description: 'Dedicated mobility, foam rolling and recovery area',
    imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop',
  },
];
