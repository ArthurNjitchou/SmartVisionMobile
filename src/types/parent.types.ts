import { User } from './user.types';

export interface Parent extends User {
  role: 'parent';
}

/** Référence API (section, zone, etc.) */
export interface NamedEntityRef {
  id?: string;
  name?: string;
  description?: string;
}

/** École liée au profil élève (API / Angular) */
export interface StudentSchool {
  name?: string | NamedEntityRef;
  address?: string;
  city?: string | NamedEntityRef;
  zone?: string | NamedEntityRef;
}

/** Profil élève tel que renvoyé par le backend (Angular: studentProfile) */
export interface StudentProfile {
  class?: string | NamedEntityRef;
  section?: string | NamedEntityRef;
  birthdate?: string;
  school?: StudentSchool | null;
}

export interface ParentChild {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  classId?: string;
  parentId?: string;
  studentProfile?: StudentProfile | null;
}

/** @deprecated Utiliser ParentChild — alias pour compatibilité */
export type Child = ParentChild;

export interface Grade {
  id: string;
  childId: string;
  subject: string;
  score: number;
  maxScore: number;
  date: string;
}
