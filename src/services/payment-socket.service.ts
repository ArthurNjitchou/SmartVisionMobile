import { io, Socket } from 'socket.io-client';
import { getBaseURL } from '../constants/config';
import { authStorage } from '../utils/storage';

export type PaymentRealtimeStatus = 'SUCCESS' | 'FAILED' | 'PENDING';

export interface PaymentRealtimePayload {
  userId: string;
  status: PaymentRealtimeStatus;
  eventType: string;
  invoiceId: string | null;
  localTransactionId: string;
  message: string;
  paidAmount?: number;
  remainingAmount?: number;
}

type Listener = (payload: PaymentRealtimePayload) => void;
type DeactivationListener = () => void;

class PaymentSocketService {
  private socket: Socket | null = null;
  private listeners = new Set<Listener>();
  private deactivationListeners = new Set<DeactivationListener>();
  private seen = new Set<string>();
  activeInvoiceId: string | null = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Compte désactivé par un administrateur (événement en cours de session ou handshake refusé). */
  onAccountDeactivated(listener: DeactivationListener): () => void {
    this.deactivationListeners.add(listener);
    return () => this.deactivationListeners.delete(listener);
  }

  private notifyDeactivated() {
    this.disconnect();
    this.deactivationListeners.forEach((listener) => listener());
  }

  setActiveInvoice(invoiceId: string | null) {
    this.activeInvoiceId = invoiceId;
  }

  async connect() {
    const token = await authStorage.getToken();
    if (!token) return;
    if (this.socket?.connected) return;

    if (this.socket) {
      this.socket.auth = { token };
      this.socket.connect();
      return;
    }

    this.socket = io(getBaseURL(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    this.socket.on('account:deactivated', () => this.notifyDeactivated());
    this.socket.on('connect_error', (error: Error) => {
      if (error?.message === 'ACCOUNT_DISABLED') this.notifyDeactivated();
    });

    this.socket.on('payment:status', (payload: PaymentRealtimePayload) => {
      const key = `${payload?.localTransactionId}:${payload?.status}:${payload?.eventType}`;
      if (!payload?.localTransactionId || this.seen.has(key)) return;
      this.seen.add(key);
      this.listeners.forEach((listener) => listener(payload));
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const paymentSocket = new PaymentSocketService();
