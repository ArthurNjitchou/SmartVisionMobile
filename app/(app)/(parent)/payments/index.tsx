import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PayInvoiceModal } from '../../../../src/components/payments/PayInvoiceModal';
import { PaymentFiltersPanel } from '../../../../src/components/payments/PaymentFiltersPanel';
import { parentService } from '../../../../src/services/parent.service';
import { financeService } from '../../../../src/services/finance.service';
import { paymentSocket } from '../../../../src/services/payment-socket.service';
import { useAuthStore } from '../../../../src/stores/authStore';
import type { Invoice, Payment, PaymentStatus } from '../../../../src/types/finance.types';
import type { ParentChild } from '../../../../src/types/parent.types';
import { formatDateShort, formatDateTimeFr, formatXaf } from '../../../../src/utils/dateFormat';

const GREEN = '#274e2b';
const ORANGE = '#c45221';

function personName(user?: { firstName?: string; lastName?: string } | null): string {
  if (!user) return '';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim();
}

function statusLabel(status?: string): string {
  if (status === 'PAID') return 'Payée';
  if (status === 'PARTIAL') return 'Partielle';
  return 'En attente';
}

function paymentStatusLabel(status?: string): string {
  if (status === 'PAID') return 'Payé';
  if (status === 'PARTIAL') return 'Partiel';
  return 'En attente';
}

function remainingOf(invoice: Invoice): number {
  if (invoice.remainingAmount != null) return Number(invoice.remainingAmount);
  const paid = (invoice.payments || [])
    .filter((payment) => payment.status === 'PAID')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return Math.max(0, Number(invoice.amount || 0) - paid);
}

function paidOf(invoice: Invoice): number {
  if (invoice.paidAmount != null) return Number(invoice.paidAmount);
  return Math.max(0, Number(invoice.amount || 0) - remainingOf(invoice));
}

function hideProviderName(text?: string): string {
  return String(text || '').replace(/MeSomb/gi, 'Mobile Money').replace(/\s{2,}/g, ' ').trim();
}

export default function ParentPaymentsScreen() {
  const { user } = useAuthStore();
  const parentId = user?.id ?? '';
  const [tab, setTab] = useState<'invoices' | 'history'>('invoices');

  const [children, setChildren] = useState<ParentChild[]>([]);
  const [studentId, setStudentId] = useState<string | undefined>();
  const [status, setStatus] = useState<PaymentStatus | undefined>();
  const [month, setMonth] = useState<number | undefined>();
  const [year, setYear] = useState<number | undefined>(new Date().getFullYear());

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (!parentId) return;
    parentService.getParentChildren(parentId).then(setChildren).catch(() => setChildren([]));
  }, [parentId]);

  const filters = useMemo(
    () => ({ studentId, status, month, year }),
    [studentId, status, month, year]
  );

  const load = useCallback(async () => {
    if (!parentId) {
      setErrorMessage('Compte parent introuvable.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    const clean = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')
    );
    try {
      if (tab === 'invoices') {
        const result = await financeService.getParentInvoices(parentId, clean, { page, limit: 10 });
        setInvoices(result.data);
        setTotalPages(result.meta.totalPages || 1);
      } else {
        const result = await financeService.getParentPayments(parentId, clean, { page, limit: 10 });
        setPayments(result.data);
        setTotalPages(result.meta.totalPages || 1);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage(tab === 'invoices'
        ? 'Erreur lors du chargement des factures.'
        : 'Erreur lors du chargement des paiements.');
      setInvoices([]);
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parentId, filters, page, tab]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    paymentSocket.connect();
    return paymentSocket.subscribe((event) => {
      if (event.status === 'SUCCESS') {
        setErrorMessage('');
        setSuccessMessage(
          event.remainingAmount && event.remainingAmount > 0
            ? 'Paiement enregistré. Vous pouvez régler le reste plus tard.'
            : 'Paiement Mobile Money confirmé.'
        );
        load();
        return;
      }
      if (event.status === 'FAILED') {
        setSuccessMessage('');
        setErrorMessage(event.message || 'Le paiement Mobile Money n’a pas abouti. Vous pouvez réessayer.');
        load();
      }
    });
  }, [load]);

  const resetFilters = () => {
    setPage(1);
    setStudentId(undefined);
    setStatus(undefined);
    setMonth(undefined);
    setYear(new Date().getFullYear());
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'invoices' && styles.tabActive]} onPress={() => { setTab('invoices'); setPage(1); }}>
          <Text style={[styles.tabText, tab === 'invoices' && styles.tabTextActive]}>Factures</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'history' && styles.tabActive]} onPress={() => { setTab('history'); setPage(1); }}>
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>Historique</Text>
        </TouchableOpacity>
      </View>

      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <PaymentFiltersPanel
        variant="parent"
        students={children}
        studentId={studentId}
        status={status}
        month={month}
        year={year}
        onStudentChange={(value) => {
          setPage(1);
          setStudentId(value);
        }}
        onStatusChange={(value) => {
          setPage(1);
          setStatus(value);
        }}
        onMonthChange={(value) => {
          setPage(1);
          setMonth(value);
        }}
        onYearChange={(value) => {
          setPage(1);
          setYear(value);
        }}
        onReset={resetFilters}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={styles.muted}>Chargement...</Text>
        </View>
      ) : tab === 'invoices' ? (
        invoices.length === 0 ? (
          <Text style={styles.empty}>Aucune facture trouvée avec les filtres actuels.</Text>
        ) : (
          invoices.map((invoice) => {
            const teacher = personName(invoice.teacher) || personName(invoice.contract?.teacher);
            const student = personName(invoice.contract?.student);
            return (
              <View key={invoice.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>Facture #{invoice.id.slice(0, 8)}</Text>
                  <View style={[styles.badge, badgeStyle(invoice.paymentStatus)]}>
                    <Text style={styles.badgeText}>{statusLabel(invoice.paymentStatus)}</Text>
                  </View>
                </View>
                {student ? <Text style={styles.meta}>Élève : {student}</Text> : null}
                {teacher ? <Text style={styles.meta}>Enseignant : {teacher}</Text> : null}
                <Text style={styles.amount}>{formatXaf(invoice.amount)}</Text>
                <View style={styles.progressRow}>
                  <Text style={styles.paid}>Payé {formatXaf(paidOf(invoice))}</Text>
                  <Text style={styles.remain}>Reste {formatXaf(remainingOf(invoice))}</Text>
                </View>
                <Text style={styles.meta}>Émise : {formatDateShort(invoice.issueDate)}</Text>
                <Text style={styles.meta}>Échéance : {formatDateShort(invoice.dueDate)}</Text>
                <View style={styles.readOnlyBox}>
                  <Text style={styles.readOnlyLabel}>Description</Text>
                  <Text style={styles.readOnlyText}>{invoice.description?.trim() || 'Aucune description'}</Text>
                </View>
                {(invoice.payments || []).filter((payment) => payment.status === 'PAID').map((payment, index) => (
                  <View key={payment.id || String(index)} style={styles.receiptBox}>
                    <Text style={styles.meta}>Reçu {formatXaf(payment.amount || 0)}</Text>
                    <Text style={styles.meta}>Référence interne : {payment.internalTransactionId || payment.id || '—'}</Text>
                    <Text style={styles.meta}>N° transaction Mobile Money : {payment.operatorTransactionId || '—'}</Text>
                  </View>
                ))}
                <TouchableOpacity style={styles.payBtn} onPress={() => setSelectedInvoice(invoice)}>
                  <Ionicons name="phone-portrait-outline" size={18} color="#111827" />
                  <Text style={styles.payBtnText}>Payer par Mobile Money</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )
      ) : payments.length === 0 ? (
        <Text style={styles.empty}>Aucun paiement trouvé avec les filtres actuels.</Text>
      ) : (
        payments.map((payment) => (
          <View key={payment.id} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{formatXaf(payment.amount)}</Text>
              <View style={[styles.badge, badgeStyle(payment.status)]}>
                <Text style={styles.badgeText}>{paymentStatusLabel(payment.status)}</Text>
              </View>
            </View>
            <View style={[styles.source, payment.source === 'MESOMB' ? styles.sourceMesomb : styles.sourceManual]}>
              <Text style={styles.sourceText}>{payment.source === 'MESOMB' ? 'Mobile Money' : 'Manuel'}</Text>
            </View>
            {personName(payment.invoice?.contract?.student) ? (
              <Text style={styles.meta}>Élève : {personName(payment.invoice?.contract?.student)}</Text>
            ) : null}
            {personName(payment.teacher) || personName(payment.invoice?.contract?.teacher) ? (
              <Text style={styles.meta}>
                Enseignant : {personName(payment.teacher) || personName(payment.invoice?.contract?.teacher)}
              </Text>
            ) : null}
            <Text style={styles.meta}>Effectué le {formatDateTimeFr(payment.createdAt)}</Text>
            {payment.description ? <Text style={styles.meta}>{hideProviderName(payment.description)}</Text> : null}
            <Text style={styles.meta}>Référence interne : {payment.internalTransactionId || payment.id}</Text>
            <Text style={styles.meta}>N° transaction Mobile Money : {payment.operatorTransactionId || '—'}</Text>
          </View>
        ))
      )}

      {totalPages > 1 ? (
        <View style={styles.pager}>
          <TouchableOpacity disabled={page <= 1} onPress={() => setPage((p) => p - 1)} style={styles.pageBtn}>
            <Text style={styles.pageBtnText}>Précédent</Text>
          </TouchableOpacity>
          <Text style={styles.pageLabel}>{page} / {totalPages}</Text>
          <TouchableOpacity disabled={page >= totalPages} onPress={() => setPage((p) => p + 1)} style={styles.pageBtn}>
            <Text style={styles.pageBtnText}>Suivant</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <PayInvoiceModal
        visible={!!selectedInvoice}
        invoice={selectedInvoice}
        parentId={parentId}
        onClose={() => setSelectedInvoice(null)}
        onSuccess={(payload) => {
          setErrorMessage('');
          setSuccessMessage(
            payload?.remainingAmount > 0
              ? 'Paiement enregistré. Vous pouvez régler le reste plus tard.'
              : 'Paiement enregistré. Merci !'
          );
          load();
        }}
      />
    </ScrollView>
  );
}

function badgeStyle(status?: string) {
  if (status === 'PAID') return { backgroundColor: '#D1FAE5' };
  if (status === 'PARTIAL') return { backgroundColor: '#DBEAFE' };
  return { backgroundColor: '#FEE2E2' };
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 36 },
  tabs: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 4, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: GREEN },
  tabText: { fontWeight: '700', color: GREEN },
  tabTextActive: { color: '#FFF' },
  success: { backgroundColor: '#ECFDF5', color: '#166534', padding: 10, borderRadius: 10, marginBottom: 10 },
  error: { backgroundColor: '#FEF2F2', color: '#B91C1C', padding: 10, borderRadius: 10, marginBottom: 10 },
  center: { alignItems: 'center', paddingVertical: 28 },
  muted: { marginTop: 8, color: '#6B7280' },
  empty: { textAlign: 'center', color: GREEN, fontWeight: '700', paddingVertical: 28 },
  card: { backgroundColor: '#FFF', borderWidth: 2, borderColor: ORANGE, borderRadius: 14, padding: 14, marginBottom: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontWeight: '800', color: GREEN, fontSize: 16, flex: 1, paddingRight: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#111827' },
  meta: { color: '#4B5563', marginTop: 3 },
  amount: { fontSize: 20, fontWeight: '800', color: GREEN, marginVertical: 8 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  paid: { color: '#15803D', fontWeight: '700' },
  remain: { color: ORANGE, fontWeight: '700' },
  readOnlyBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  readOnlyLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  readOnlyText: { color: '#475569', fontSize: 13, lineHeight: 18 },
  payBtn: { marginTop: 12, backgroundColor: ORANGE, borderRadius: 10, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  payBtnText: { fontWeight: '800', color: '#111827' },
  source: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 6 },
  sourceMesomb: { backgroundColor: '#D1FAE5' },
  sourceManual: { backgroundColor: '#FEF3C7' },
  sourceText: { fontSize: 11, fontWeight: '800', color: '#111827' },
  receiptBox: { marginTop: 8, padding: 8, borderRadius: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E5E7EB' },
  pager: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 8 },
  pageBtn: { backgroundColor: ORANGE, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  pageBtnText: { fontWeight: '800', color: '#111827' },
  pageLabel: { fontWeight: '700', color: GREEN },
});
