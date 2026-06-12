import { Timestamp } from 'firebase/firestore';

export type Role = 'user' | 'admin';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type FitnessGoal =
  | 'lose_weight'
  | 'gain_muscle'
  | 'maintain'
  | 'improve_endurance'
  | 'general_fitness';
export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extremely_active';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  dob?: string;           // stored as 'YYYY-MM-DD'
  gender?: Gender;
  weight?: number;        // raw value (user's chosen unit)
  weightUnit?: 'kg' | 'lbs';
  height?: number;        // raw value (user's chosen unit)
  heightUnit?: 'cm' | 'ft';
  fitnessGoal?: FitnessGoal;
  activityLevel?: ActivityLevel;
  photoURL?: string;
  role: Role;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

const REQUIRED_FIELDS: (keyof UserProfile)[] = [
  'phone',
  'dob',
  'gender',
  'weight',
  'height',
  'fitnessGoal',
  'activityLevel',
];

export function profileCompletionPct(profile: UserProfile | null): number {
  if (!profile) return 0;
  const filled = REQUIRED_FIELDS.filter((k) => profile[k] != null && profile[k] !== '').length;
  return Math.round((filled / REQUIRED_FIELDS.length) * 100);
}

export function isProfileComplete(profile: UserProfile | null): boolean {
  return profileCompletionPct(profile) === 100;
}

export function calcAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
}

// 'DD/MM/YYYY' display ↔ 'YYYY-MM-DD' storage
export function dobToDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function dobToIso(display: string): string | null {
  const parts = display.split('/');
  if (parts.length !== 3 || parts[2].length !== 4) return null;
  const [d, m, y] = parts;
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  if (isNaN(date.getTime())) return null;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}
