export type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING';
export type PaymentSource = 'MANUAL' | 'MESOMB';
export type MesombService = 'MTN' | 'ORANGE' | 'AIRTEL';

export interface PaginationMeta {
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  itemsPerPage?: number;
}

export interface PersonName {
  id?: string;
  firstName?: string;
  lastName?: string;
}

export interface Invoice {
  id: string;
  amount: number;
  description?: string | null;
  issueDate?: string;
  dueDate?: string;
  paymentStatus?: PaymentStatus;
  paidAmount?: number;
  remainingAmount?: number;
  billingMonth?: number | null;
  billingYear?: number | null;
  teacherId?: string | null;
  parentId?: string | null;
  teacher?: PersonName | null;
  payments?: Array<{
    id?: string;
    amount?: number;
    status?: string;
    paymentDate?: string;
    internalTransactionId?: string | null;
    operatorTransactionId?: string | null;
  }>;
  contract?: {
    student?: PersonName | null;
    teacher?: PersonName | null;
    parent?: PersonName | null;
    courseAssignment?: {
      courseOffering?: {
        description?: string | null;
        level?: string | null;
        frequency?: string | null;
      } | null;
    };
  };
}

export interface Payment {
  id: string;
  amount: number;
  description?: string | null;
  status?: PaymentStatus;
  source?: PaymentSource;
  paymentDate?: string;
  createdAt?: string;
  teacherId?: string | null;
  parentId?: string | null;
  teacher?: PersonName | null;
  parent?: PersonName | null;
  internalTransactionId?: string | null;
  operatorTransactionId?: string | null;
  movement?: 'TEACHER_PAYOUT' | 'PARENT_COLLECT' | 'OTHER';
  invoice?: {
    id?: string;
    contractId?: string;
    contract?: {
      student?: PersonName | null;
      teacher?: PersonName | null;
      parent?: PersonName | null;
      courseAssignment?: {
        courseOffering?: {
          description?: string | null;
          level?: string | null;
          frequency?: string | null;
        } | null;
      };
    };
  };
}

export interface InvoiceFilters {
  studentId?: string;
  status?: string;
  month?: number;
  year?: number;
}

export interface PaymentFilters {
  studentId?: string;
  status?: string;
  source?: string;
  month?: number;
  year?: number;
}

export interface MesombCollectPayload {
  invoiceId: string;
  payer: string;
  service: MesombService;
  amount?: number;
  country?: string;
  currency?: string;
  idempotencyKey?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    country?: string;
  };
}
