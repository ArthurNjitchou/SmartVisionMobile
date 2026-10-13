import type { PaymentStatus } from '../types/finance.types';

export const PAYMENT_FILTER_MONTHS = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
] as const;

export const PAYMENT_FILTER_YEARS = [2024, 2025, 2026, 2027, 2028] as const;

export const PAYMENT_STATUS_FILTER_OPTIONS: {
  value: PaymentStatus | undefined;
  label: string;
}[] = [
  { value: undefined, label: 'Tous les statuts' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'PARTIAL', label: 'Partiel' },
  { value: 'PAID', label: 'Payé' },
];
