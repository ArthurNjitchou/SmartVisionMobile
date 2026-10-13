export interface Announcement {
  id?: string;
  title: string;
  content: string;
  createdAt: string;
  /** URL absolue ou chemin relatif côté serveur */
  imagePath?: string | null;
}

export interface PaginatedAnnouncements {
  data?: Announcement[];
  meta?: {
    totalItems?: number;
    page?: number;
    limit?: number;
  };
}

export interface UserDetailsResponse {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  domicile?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
  parentProfile?: {
    profession?: string;
  };
  teacherProfile?: {
    profession?: string;
    experienceYears?: number | string;
    authorizedLevel?: string;
    section?: string;
  };
}

export interface UserAgencyResponse {
  agencyId?: string[];
}
