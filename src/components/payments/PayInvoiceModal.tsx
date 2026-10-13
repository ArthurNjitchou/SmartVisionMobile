import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { financeService } from '../../services/finance.service';
import { paymentSocket, type PaymentRealtimePayload } from '../../services/payment-socket.service';
import { userService } from '../../services/user.service';
import type { Invoice, MesombService } from '../../types/finance.types';
import { formatDateShort, formatXaf } from '../../utils/dateFormat';
import { createIdempotencyKey, shouldRotateIdempotencyKey } from '../../utils/idempotency';
import {
  friendlyMobileMoneyFailureMessage,
  operatorMismatchMessage,
} from '../../utils/cameroon-mobile-money';
import {
  extractCollectErrorData,
  hideProviderName,
  isPaymentInProgressError,
  resolvePendingMessage,
  shouldTreatCollectAsPending,
} from '../../utils/payment-flow.utils';

const GREEN = '#274e2b';
const ORANGE = '#c45221';

function paidAmountOf(invoice: Invoice): number {
  if (invoice.paidAmount != null) return Number(invoice.paidAmount);
  return (invoice.payments || [])
    .filter((payment) => payment.status === 'PAID')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

function remainingAmountOf(invoice: Invoice): number {
  if (invoice.remainingAmount != null) return Number(invoice.remainingAmount);
  return Math.max(0, Number(invoice.amount || 0) - paidAmountOf(invoice));
}

export function normalizePhone(value: string): string {
  let phone = String(value || '').replace(/[\s.\-()]/g, '');
  if (phone.startsWith('+')) phone = phone.slice(1);
  if (phone.startsWith('237') && phone.length >= 12) phone = phone.slice(3);
  if (phone.startsWith('0') && phone.length === 10) phone = phone.slice(1);
  return phone;
}

export function PayInvoiceModal({
  visible,
  invoice,
  parentId,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  invoice: Invoice | null;
  parentId: string;
  onClose: () => void;
  onSuccess: (payload: any) => void;
}) {
  const remaining = invoice ? remainingAmountOf(invoice) : 0;
  const paid = invoice ? paidAmountOf(invoice) : 0;
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState('');
  const [service, setService] = useState<MesombService>('MTN');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [waitingPhoneConfirm, setWaitingPhoneConfirm] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [successPayload, setSuccessPayload] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [localTransactionId, setLocalTransactionId] = useState('');

  useEffect(() => {
    if (!visible || !invoice) return;
    setAmount(remaining > 0 ? String(Math.round(remaining)) : '');
    setPayer('');
    setSubmitting(false);
    setWaitingPhoneConfirm(false);
    setCompleted(false);
    setSuccessPayload(null);
    setErrorMessage('');
    setInfoMessage('');
    setLocalTransactionId('');
    setIdempotencyKey(createIdempotencyKey(`inv-${invoice.id}`));
    paymentSocket.setActiveInvoice(invoice.id);
    paymentSocket.connect();

    userService.getUserDetails(parentId).then((details) => {
      setFirstName(details?.firstName || '');
      setLastName(details?.lastName || '');
      setEmail(details?.email || '');
    }).catch(() => {
      setErrorMessage('Impossible de préremplir vos informations. Saisissez-les manuellement.');
    });

    return () => {
      paymentSocket.setActiveInvoice(null);
    };
  }, [visible, invoice?.id, parentId]);

  useEffect(() => {
    if (!visible || !invoice) return;
    const unsubscribe = paymentSocket.subscribe((event: PaymentRealtimePayload) => {
      const matchesInvoice = event.invoiceId === invoice.id;
      const matchesTx = !!localTransactionId && event.localTransactionId === localTransactionId;
      if (!matchesInvoice && !matchesTx) return;

      if (event.status === 'SUCCESS') {
        setSubmitting(false);
        setWaitingPhoneConfirm(false);
        setCompleted(true);
        setSuccessPayload(event);
        setErrorMessage('');
        setInfoMessage('');
        return;
      }
      if (event.status === 'FAILED') {
        setSubmitting(false);
        setWaitingPhoneConfirm(false);
        setErrorMessage(
          friendlyMobileMoneyFailureMessage(payer, service, event.message)
        );
        setInfoMessage('');
        setIdempotencyKey(createIdempotencyKey(`inv-${invoice.id}`));
        return;
      }
      setErrorMessage('');
      setSubmitting(true);
      setInfoMessage(resolvePendingMessage(event.message));
      setWaitingPhoneConfirm(true);
    });
    return unsubscribe;
  }, [visible, invoice?.id, localTransactionId, payer, service]);

  const operatorMismatch = useMemo(
    () => operatorMismatchMessage(normalizePhone(payer), service),
    [payer, service]
  );

  const formValid = useMemo(() => {
    const value = Number(amount);
    return (
      value > 0 &&
      /^6\d{8}$/.test(normalizePhone(payer)) &&
      !!service &&
      !operatorMismatch &&
      !!firstName.trim() &&
      !!lastName.trim() &&
      !!email.trim()
    );
  }, [amount, payer, service, operatorMismatch, firstName, lastName, email]);

  const enterAwaitingConfirmation = (message?: string) => {
    setErrorMessage('');
    setInfoMessage(resolvePendingMessage(message));
    setSubmitting(true);
    setWaitingPhoneConfirm(true);
  };

  const handleCollectResponse = (payload: any) => {
    if (payload?.localTransactionId) {
      setLocalTransactionId(payload.localTransactionId);
    }
    if (payload?.status === 'SUCCESS' && payload?.mesomb?.isTransactionSuccess !== false) {
      setSubmitting(false);
      setWaitingPhoneConfirm(false);
      setCompleted(true);
      setSuccessPayload(payload);
      setInfoMessage('');
      return;
    }
    if (shouldTreatCollectAsPending(payload)) {
      enterAwaitingConfirmation(payload?.mesomb?.message || payload?._responseMessage);
      return;
    }
    if (payload?.status === 'FAILED') {
      setSubmitting(false);
      setWaitingPhoneConfirm(false);
      setErrorMessage(mesombFailureMessage(payload, normalizePhone(payer), service));
      setInfoMessage('');
      if (shouldRotateIdempotencyKey(undefined, payload)) {
        setIdempotencyKey(createIdempotencyKey(`inv-${invoice!.id}`));
      }
      return;
    }
    enterAwaitingConfirmation(payload?.mesomb?.message || payload?._responseMessage);
  };

  const submit = async () => {
    if (!invoice || !formValid || submitting || completed) return;
    setSubmitting(true);
    setWaitingPhoneConfirm(true);
    setErrorMessage('');
    setInfoMessage('');
    const phone = normalizePhone(payer);
    const mismatch = operatorMismatchMessage(phone, service);
    if (mismatch) {
      setSubmitting(false);
      setWaitingPhoneConfirm(false);
      setErrorMessage(mismatch);
      return;
    }
    try {
      const payload = await financeService.collectMoney({
        invoiceId: invoice.id,
        amount: Number(amount),
        payer: phone,
        service,
        country: 'CM',
        currency: 'XAF',
        idempotencyKey,
        customer: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone,
          country: 'CM',
        },
      });
      handleCollectResponse(payload);
    } catch (err: any) {
      const { code, data, message } = extractCollectErrorData(err);
      if (isPaymentInProgressError(code)) {
        enterAwaitingConfirmation(
          'Un paiement est déjà en cours. Vérifiez votre téléphone : validez ou annulez la demande, puis actualisez vos factures.'
        );
        return;
      }
      if (data?.localTransactionId || data?.status === 'PENDING') {
        if (data.localTransactionId) {
          setLocalTransactionId(data.localTransactionId);
        }
        enterAwaitingConfirmation(data?.message || data?.mesomb?.message || message);
        return;
      }
      setSubmitting(false);
      setWaitingPhoneConfirm(false);
      setErrorMessage(
        err?.response?.data?.message ||
          friendlyMobileMoneyFailureMessage(phone, service)
      );
      setInfoMessage('');
      if (shouldRotateIdempotencyKey(err, data)) {
        setIdempotencyKey(createIdempotencyKey(`inv-${invoice.id}`));
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => { if (!submitting) onClose(); }}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Payer par Mobile Money</Text>
            <Text style={styles.headerSub}>MTN ou Orange — paiement en une ou plusieurs tranches</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={submitting}>
            <Ionicons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.statsRow}>
            <StatBox label="Total" value={formatXaf(invoice?.amount)} border={GREEN} />
            <StatBox label="Déjà payé" value={formatXaf(paid)} border="#16A34A" />
            <StatBox label="Reste" value={formatXaf(remaining)} border={ORANGE} />
          </View>

          <View style={styles.invoiceInfoSection}>
            <Text style={styles.invoiceInfoTitle}>Informations facture</Text>
            <View style={styles.invoiceInfoGrid}>
              <View style={styles.invoiceInfoItem}>
                <Text style={styles.invoiceInfoLabel}>Émission</Text>
                <Text style={styles.invoiceInfoValue}>{formatDateShort(invoice?.issueDate)}</Text>
              </View>
              <View style={styles.invoiceInfoItem}>
                <Text style={styles.invoiceInfoLabel}>Échéance</Text>
                <Text style={styles.invoiceInfoValue}>{formatDateShort(invoice?.dueDate)}</Text>
              </View>
            </View>
            <View style={styles.invoiceInfoItemFull}>
              <Text style={styles.invoiceInfoLabel}>Description</Text>
              <Text style={styles.invoiceInfoValue}>{invoice?.description?.trim() || 'Aucune description'}</Text>
            </View>
          </View>

          {completed ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Paiement validé</Text>
              <Text style={styles.successText}>La transaction a bien été confirmée sur votre téléphone.</Text>
            </View>
          ) : null}

          {errorMessage ? <Text style={styles.errorBox}>{errorMessage}</Text> : null}
          {infoMessage ? <Text style={styles.infoBox}>{infoMessage}</Text> : null}
          {submitting && !waitingPhoneConfirm && !completed ? (
            <Text style={styles.progressBox}>
              Confirmation en cours. Validez ou annulez la demande sur votre téléphone. Le résultat s’affichera ici dès confirmation.
            </Text>
          ) : null}

          {!completed ? (
            <>
              <Field label="Montant de cette tranche (XAF)">
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="Montant"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
                <Text style={styles.hint}>Reste à payer : {formatXaf(remaining)}</Text>
              </Field>

              <Text style={styles.label}>Opérateur</Text>
              <View style={styles.ops}>
                {(['MTN', 'ORANGE'] as MesombService[]).map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.opBtn, service === item && styles.opBtnActive]}
                    onPress={() => setService(item)}
                  >
                    <Text style={[styles.opText, service === item && styles.opTextActive]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Field label="Numéro Mobile Money">
                <TextInput
                  value={payer}
                  onChangeText={setPayer}
                  keyboardType="phone-pad"
                  placeholder="670000000"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
                <Text style={styles.hint}>Saisissez le numéro qui recevra la demande (9 chiffres, sans +237). Seul ce numéro saisi sera utilisé.</Text>
                {operatorMismatch ? <Text style={styles.mismatch}>{operatorMismatch}</Text> : null}
              </Field>

              <Field label="Prénom">
                <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} placeholderTextColor="#9CA3AF" />
              </Field>
              <Field label="Nom">
                <TextInput value={lastName} onChangeText={setLastName} style={styles.input} placeholderTextColor="#9CA3AF" />
              </Field>
              <Field label="Email">
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  placeholderTextColor="#9CA3AF"
                />
              </Field>
            </>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {completed ? (
            <TouchableOpacity
              style={styles.okBtn}
              onPress={() => {
                onSuccess(successPayload);
                onClose();
              }}
            >
              <Text style={styles.okText}>Compris</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.payBtn, (!formValid || submitting) && styles.disabled]}
                onPress={submit}
                disabled={!formValid || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#111827" />
                ) : (
                  <Ionicons name="checkmark-circle" size={20} color="#111827" />
                )}
                <Text style={styles.payText}>{submitting ? 'Confirmation en cours...' : 'Payer maintenant'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={waitingPhoneConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setWaitingPhoneConfirm(false)}
      >
        <View style={styles.waitOverlay}>
          <View style={styles.waitCard}>
            <View style={styles.waitIcon}>
              <Ionicons name="phone-portrait" size={36} color="#92400E" />
            </View>
            <Text style={styles.waitTitle}>Vérifiez votre téléphone</Text>
            <Text style={styles.waitText}>
              Une demande de paiement a été envoyée au numéro saisi. Validez la transaction avec votre code secret
              Mobile Money. Si vous n’avez pas reçu la demande, composez {ussdCodeFor(service)} sur votre téléphone
              ({ussdOperatorLabel(service)}). Si vous annulez, le paiement ne sera pas enregistré.
            </Text>
            <TouchableOpacity style={styles.waitOkBtn} onPress={() => setWaitingPhoneConfirm(false)}>
              <Text style={styles.waitOkText}>OK</Text>
            </TouchableOpacity>
            <Text style={styles.waitHint}>
              Vous pouvez fermer ce message. Le paiement continue : un spinner restera sur le bouton jusqu’à la réponse.
            </Text>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

function ussdCodeFor(service: MesombService): string {
  return service === 'MTN' ? '*126#' : '#150*50#';
}

function ussdOperatorLabel(service: MesombService): string {
  return service === 'MTN' ? 'MTN Money' : 'Orange Money';
}

function mesombFailureMessage(payload: any, phone: string, service: MesombService): string {
  const message = hideProviderName(
    payload?.mesomb?.message || payload?.mesomb?.transaction?.message || ''
  );
  return friendlyMobileMoneyFailureMessage(phone, service, message);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function StatBox({ label, value, border }: { label: string; value: string; border: string }) {
  return (
    <View style={[styles.statBox, { borderColor: border }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: border }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFF' },
  header: {
    backgroundColor: GREEN,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.85)', marginTop: 4, fontSize: 12 },
  closeBtn: { padding: 6 },
  body: { padding: 16, paddingBottom: 28 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox: { flex: 1, borderWidth: 2, borderRadius: 12, padding: 8, alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#6B7280' },
  statValue: { fontWeight: '800', fontSize: 13, marginTop: 4, textAlign: 'center' },
  invoiceInfoSection: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  invoiceInfoTitle: { fontWeight: '800', color: '#475569', marginBottom: 10, fontSize: 13 },
  invoiceInfoGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  invoiceInfoItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
  },
  invoiceInfoItemFull: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
  },
  invoiceInfoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  invoiceInfoValue: { color: '#475569', fontWeight: '600', marginTop: 4, fontSize: 13 },
  successBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#22C55E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  successTitle: { fontWeight: '800', color: '#166534' },
  successText: { color: '#166534', marginTop: 4 },
  errorBox: { backgroundColor: '#FEF2F2', color: '#B91C1C', padding: 10, borderRadius: 10, marginBottom: 10 },
  infoBox: { backgroundColor: '#FFFBEB', color: '#92400E', padding: 10, borderRadius: 10, marginBottom: 10 },
  progressBox: { backgroundColor: '#F0F9FF', color: '#0C4A6E', padding: 10, borderRadius: 10, marginBottom: 10 },
  waitOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 36, 18, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  waitCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  waitIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  waitTitle: { fontSize: 20, fontWeight: '800', color: GREEN, textAlign: 'center' },
  waitText: { color: '#374151', fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 10 },
  waitOkBtn: {
    marginTop: 20,
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
  },
  waitOkText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  waitHint: { color: '#6B7280', fontSize: 12, marginTop: 12, textAlign: 'center' },
  label: { fontWeight: '700', color: GREEN, marginBottom: 6 },
  input: {
    borderWidth: 2,
    borderColor: GREEN,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    fontWeight: '600',
  },
  hint: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  mismatch: { fontSize: 13, color: '#DC2626', fontWeight: '700', marginTop: 8 },
  ops: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  opBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: GREEN,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  opBtnActive: { backgroundColor: GREEN },
  opText: { fontWeight: '800', color: GREEN },
  opTextActive: { color: '#FFF' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F9FAFB',
  },
  cancelBtn: { flex: 1, borderWidth: 2, borderColor: '#6B7280', borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  cancelText: { fontWeight: '700', color: '#374151' },
  payBtn: {
    flex: 2,
    backgroundColor: ORANGE,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  payText: { fontWeight: '800', color: '#111827' },
  disabled: { opacity: 0.5 },
  okBtn: { flex: 1, backgroundColor: GREEN, borderRadius: 12, alignItems: 'center', paddingVertical: 14 },
  okText: { color: '#FFF', fontWeight: '800' },
});
