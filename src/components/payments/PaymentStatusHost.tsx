import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  paymentSocket,
  type PaymentRealtimePayload,
} from '../../services/payment-socket.service';
import { useAuthStore } from '../../stores/authStore';
import { hideProviderName } from '../../utils/payment-flow.utils';

const GREEN = '#274e2b';

export function PaymentStatusHost() {
  const token = useAuthStore((state) => state.token);
  const [payload, setPayload] = useState<PaymentRealtimePayload | null>(null);

  useEffect(() => {
    if (!token) {
      paymentSocket.disconnect();
      return;
    }
    paymentSocket.connect();
    const unsubscribe = paymentSocket.subscribe((event) => {
      if (event.status === 'PENDING') return;
      if (event.invoiceId && event.invoiceId === paymentSocket.activeInvoiceId) return;
      setPayload(event);
    });
    return unsubscribe;
  }, [token]);

  if (!payload) return null;

  const success = payload.status === 'SUCCESS';
  const pending = payload.status === 'PENDING';
  const title = success
    ? 'Paiement confirmé'
    : pending
      ? 'Paiement en cours'
      : 'Paiement échoué';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setPayload(null)}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.icon, success ? styles.ok : pending ? styles.pending : styles.ko]}>
            <Ionicons
              name={success ? 'checkmark-circle' : pending ? 'hourglass' : 'close-circle'}
              size={36}
              color={success ? '#166534' : pending ? '#92400E' : '#B91C1C'}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.text}>{hideProviderName(payload.message)}</Text>
          <TouchableOpacity style={styles.btn} onPress={() => setPayload(null)}>
            <Text style={styles.btnText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  ok: { backgroundColor: '#DCFCE7' },
  pending: { backgroundColor: '#FEF3C7' },
  ko: { backgroundColor: '#FEE2E2' },
  title: { fontSize: 20, fontWeight: '800', color: GREEN, textAlign: 'center' },
  text: { color: '#374151', marginTop: 10, textAlign: 'center' },
  btn: {
    marginTop: 20,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  btnText: { color: '#FFF', fontWeight: '800' },
});
