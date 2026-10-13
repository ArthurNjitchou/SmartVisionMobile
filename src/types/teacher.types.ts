import { User } from './user.types';

export interface Teacher extends User {
  role: 'teacher';
}

export interface Class {
  id: string;
  name: string;
  subject: string;
  grade: string;
  studentCount: number;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  classId: string;
}
