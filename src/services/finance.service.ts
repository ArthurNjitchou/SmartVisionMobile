import api from './api';
import { API_ENDPOINTS } from '../constants/config';
import type {
  Invoice,
  InvoiceFilters,
  MesombCollectPayload,
  PaginationMeta,
  Payment,
  PaymentFilters,
} from '../types/finance.types';

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

function asPaginated<T>(body: any): PaginatedResult<T> {
  if (Array.isArray(body)) {
    return { data: body as T[], meta: {} };
  }
  return {
    data: Array.isArray(body?.data) ? body.data : [],
    meta: body?.meta ?? {},
  };
}

export const financeService = {
  async getParentInvoices(
    parentId: string,
    filters: InvoiceFilters,
    pagination: { page: number; limit: number }
  ): Promise<PaginatedResult<Invoice>> {
    const { data } = await api.post(
      API_ENDPOINTS.INVOICE.parentInvoices(parentId),
      { ...filters, ...pagination }
    );
    return asPaginated<Invoice>(data);
  },

  async getParentPayments(
    parentId: string,
    filters: PaymentFilters,
    pagination: { page: number; limit: number }
  ): Promise<PaginatedResult<Payment>> {
    const { data } = await api.post(
      API_ENDPOINTS.PAYMENT.parentPayments(parentId),
      { ...filters, ...pagination }
    );
    return asPaginated<Payment>(data);
  },

  async getTeacherInvoices(
    teacherId: string,
    filters: InvoiceFilters,
    pagination: { page: number; limit: number }
  ): Promise<PaginatedResult<Invoice>> {
    const { data } = await api.post(
      API_ENDPOINTS.INVOICE.teacherInvoices(teacherId),
      { ...filters, ...pagination }
    );
    return asPaginated<Invoice>(data);
  },

  async getTeacherPayments(
    teacherId: string,
    filters: PaymentFilters,
    pagination: { page: number; limit: number }
  ): Promise<PaginatedResult<Payment>> {
    const { data } = await api.post(
      API_ENDPOINTS.PAYMENT.teacherPayments(teacherId),
      { ...filters, ...pagination }
    );
    return asPaginated<Payment>(data);
  },

  async getFilteredPayments(
    filters: PaymentFilters & { parentId?: string; teacherId?: string },
    pagination: { page: number; limit: number }
  ): Promise<PaginatedResult<Payment>> {
    const { data } = await api.post(API_ENDPOINTS.PAYMENT.FILTER, {
      ...filters,
      ...pagination,
    });
    return asPaginated<Payment>(data);
  },

  async collectMoney(payload: MesombCollectPayload): Promise<any> {
    const { data } = await api.post(API_ENDPOINTS.PAYMENT.MESOMB_COLLECT, payload, {
      timeout: 120000,
    });
    const result = data?.data ?? data;
    const message = data?.message;
    if (message && result && typeof result === 'object' && !Array.isArray(result)) {
      return { ...result, _responseMessage: message };
    }
    return result;
  },
};
