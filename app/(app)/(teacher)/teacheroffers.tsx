import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { coursemanipulationService } from '../../../src/services/coursemanipulation.service';
import { useAuthStore } from '../../../src/stores/authStore';
import { convertMinutesToDuration } from '../../../src/utils/duration.utils';

const GREEN = '#274e2b';
const ORANGE = '#c45221';

type Offer = {
  id: string;
  status?: string;
  level?: string;
  remuneration?: number;
  duration?: number;
  frequency?: number;
  quarter?: string;
  description?: string;
  agency?: { name?: string };
  courseandoffering?: Array<{ course?: { name?: string } }>;
};

export default function TeacherOffersScreen() {
  const { user } = useAuthStore();
  const teacherId = user?.id ?? '';
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [appliedOffers, setAppliedOffers] = useState<Set<string>>(new Set());
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchOffers = async (targetPage = currentPage) => {
    if (!teacherId) return;
    setLoadingOffers(true);
    try {
      const res = await coursemanipulationService.getTeacherCourseOffering(
        teacherId,
        targetPage,
        itemsPerPage
      );
      const list = Array.isArray(res.data) ? (res.data as Offer[]) : [];
      setOffers(list);
      const page = res.meta?.currentPage ?? targetPage;
      setCurrentPage(page);
      setTotalPages(res.meta?.totalPages || 1);
      setTotalItems(res.meta?.totalItems || list.length);
      if (!selectedOffer || !list.find((o) => o.id === selectedOffer.id)) {
        setSelectedOffer(list[0] || null);
      }
    } catch (err) {
      console.error('offers fetch', err);
      setOffers([]);
      setSelectedOffer(null);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoadingOffers(false);
    }
  };

  const fetchOfferIds = async () => {
    if (!teacherId) return;
    try {
      const response = await coursemanipulationService.getTeacherPostulations(teacherId);
      const ids = response
        .map((p: any) => p.courseOffering?.id)
        .filter((id: string | undefined): id is string => !!id);
      setAppliedOffers(new Set(ids));
    } catch (err) {
      console.error('teacher postulations', err);
      setAppliedOffers(new Set());
    }
  };

  useEffect(() => {
    (async () => {
      await fetchOfferIds();
      await fetchOffers(1);
    })();
  }, [teacherId]);

  const isApplied = (offerId: string) => appliedOffers.has(offerId);

  const toggleApplication = async (offer: Offer) => {
    const offerId = offer.id;
    setPendingActionId(offerId);
    try {
      if (isApplied(offerId)) {
        await coursemanipulationService.deleteTeacherPostulation(teacherId, offerId);
        setAppliedOffers((prev) => {
          const next = new Set(prev);
          next.delete(offerId);
          return next;
        });
      } else {
        await coursemanipulationService.createPostulation(teacherId, offerId);
        setAppliedOffers((prev) => new Set([...prev, offerId]));
      }
    } catch (err) {
      console.error('toggle postulation', err);
    } finally {
      setPendingActionId(null);
    }
  };

  const getCourseNames = (offer: Offer): string => {
    if (!offer.courseandoffering?.length) return 'Cours non specifie';
    const names = offer.courseandoffering
      .map((co) => co.course?.name)
      .filter((n): n is string => !!n);
    return names.length ? names.join(', ') : 'Cours non specifie';
  };

  const getOfferStatusLabel = (status?: string): string => {
    switch (status) {
      case 'PENDING':
        return 'En attente';
      case 'ACCEPTED':
        return 'Acceptee';
      case 'INPROGRESS':
        return 'En cours';
      case 'REJECTED':
        return 'Rejetee';
      case 'INTERRUPTED':
        return 'Interrompue';
      case 'TERMINATED':
        return 'Terminee';
      default:
        return 'Inconnu';
    }
  };

  const statusStyle = (status?: string) => {
    switch (status) {
      case 'PENDING':
        return { backgroundColor: '#FEF3C7', color: '#92400E' };
      case 'ACCEPTED':
        return { backgroundColor: '#D1FAE5', color: '#065F46' };
      case 'REJECTED':
        return { backgroundColor: '#FEE2E2', color: '#991B1B' };
      case 'INPROGRESS':
        return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
      default:
        return { backgroundColor: '#E5E7EB', color: '#374151' };
    }
  };

  const selectedStatus = useMemo(
    () => statusStyle(selectedOffer?.status),
    [selectedOffer?.status]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <View style={styles.iconBox}>
              <Ionicons name="briefcase-outline" size={20} color="#FFF" />
            </View>
            <View style={styles.titleTextCol}>
              <Text style={styles.pageDescription}>
                Parcourez les missions publiées par les agences, consultez le détail et postulez ou retirez votre
                candidature.
              </Text>
            </View>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total des offres</Text>
            <Text style={styles.totalValue}>{totalItems}</Text>
          </View>
        </View>

        {loadingOffers ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={styles.muted}>Chargement des offres...</Text>
          </View>
        ) : offers.length === 0 ? (
          <View style={styles.centerBlock}>
            <Ionicons name="briefcase-outline" size={40} color="#9CA3AF" />
            <Text style={styles.muted}>Aucune offre de cours trouvee.</Text>
          </View>
        ) : (
          <View style={styles.listColumn}>
            {offers.map((offer) => {
              const active = selectedOffer?.id === offer.id;
              const applied = isApplied(offer.id);
              const status = statusStyle(offer.status);
              return (
                <TouchableOpacity
                  key={offer.id}
                  style={[styles.offerItem, active && styles.offerItemActive]}
                  onPress={() => setSelectedOffer(offer)}
                  activeOpacity={0.9}
                >
                  <View style={styles.offerTop}>
                    <Text
                      style={[styles.offerCourse, active && styles.offerCourseActive]}
                      numberOfLines={1}
                    >
                      {getCourseNames(offer)}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: status.backgroundColor },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: status.color }]}>
                        {getOfferStatusLabel(offer.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.offerMeta, active && styles.offerMetaActive]}>
                    Niveau: {offer.level || 'Non defini'}
                  </Text>
                  <Text style={[styles.offerMeta, active && styles.offerMetaActive]}>
                    Remuneration: {offer.remuneration || 0} FCFA
                  </Text>
                  <Text style={[styles.offerMeta, active && styles.offerMetaActive]}>
                    Frequence: {offer.frequency || 0} fois/semaine
                  </Text>
                  <Text style={[styles.offerMeta, active && styles.offerMetaActive]}>
                    Quartier: {offer.quarter || 'Non defini'}
                  </Text>
                  {applied ? (
                    <View style={styles.appliedRow}>
                      <Ionicons name="checkmark-circle" size={14} color={GREEN} />
                      <Text style={styles.appliedText}>Deja postule</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}

            {totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  onPress={() => fetchOffers(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                >
                  <Text style={styles.pageBtnText}>Precedent</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>
                  Page {currentPage} / {totalPages}
                </Text>
                <TouchableOpacity
                  onPress={() => fetchOffers(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={[
                    styles.pageBtn,
                    currentPage === totalPages && styles.pageBtnDisabled,
                  ]}
                >
                  <Text style={styles.pageBtnText}>Suivant</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!selectedOffer}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOffer(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {selectedOffer ? (
              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScroll}
                showsVerticalScrollIndicator
                nestedScrollEnabled
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.detailTitle}>Details de l'offre</Text>
                  <TouchableOpacity onPress={() => setSelectedOffer(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color="#374151" />
                  </TouchableOpacity>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: selectedStatus.backgroundColor, alignSelf: 'flex-start' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: selectedStatus.color }]}>
                    {getOfferStatusLabel(selectedOffer.status)}
                  </Text>
                </View>
                <Text style={styles.remuneration}>
                  {selectedOffer.remuneration || 0} FCFA
                </Text>
                <Detail label="Cours" value={getCourseNames(selectedOffer)} />
                <Detail label="Niveau" value={selectedOffer.level || 'Non specifie'} />
                <Detail
                  label="Duree"
                  value={convertMinutesToDuration(selectedOffer.duration || 0)}
                />
                <Detail
                  label="Frequence"
                  value={`${selectedOffer.frequency || 0} fois/semaine`}
                />
                <Detail label="Quartier" value={selectedOffer.quarter || 'Non specifie'} />
                <Detail
                  label="Agence"
                  value={selectedOffer.agency?.name || 'Non specifiee'}
                />
                {selectedOffer.description ? (
                  <View style={styles.descBlock}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.detailValue}>{selectedOffer.description}</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.applyBtn,
                    isApplied(selectedOffer.id) ? styles.cancelBtn : styles.applyGreenBtn,
                  ]}
                  onPress={() => toggleApplication(selectedOffer)}
                  disabled={pendingActionId === selectedOffer.id}
                >
                  {pendingActionId === selectedOffer.id ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons
                        name={
                          isApplied(selectedOffer.id)
                            ? 'close-circle-outline'
                            : 'paper-plane-outline'
                        }
                        size={16}
                        color="#FFF"
                      />
                      <Text style={styles.applyBtnText}>
                        {isApplied(selectedOffer.id)
                          ? 'Annuler la candidature'
                          : 'Postuler a cette offre'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 28 },
  header: {
    marginBottom: 14,
    gap: 12,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  titleTextCol: { flex: 1 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageDescription: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: '#4B5563',
  },
  totalBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  totalValue: { color: GREEN, fontSize: 22, fontWeight: '800' },
  centerBlock: { alignItems: 'center', paddingVertical: 40 },
  muted: { marginTop: 8, color: '#6B7280' },
  listColumn: {},
  offerItem: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  offerItemActive: {
    borderColor: GREEN,
    backgroundColor: '#F0FDF4',
  },
  offerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  offerCourse: { fontWeight: '700', color: '#111827', flex: 1 },
  offerCourseActive: { color: GREEN },
  offerMeta: { color: '#4B5563', fontSize: 12, marginTop: 2 },
  offerMetaActive: { color: '#1F2937' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700' },
  appliedRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  appliedText: { color: GREEN, fontSize: 12, fontWeight: '600' },
  pagination: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageBtn: {
    backgroundColor: GREEN,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pageBtnDisabled: { opacity: 0.45 },
  pageBtnText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
  pageInfo: { color: '#374151', fontWeight: '600', fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '88%',
    backgroundColor: '#FFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  // flexShrink : permet au ScrollView de rester dans le maxHeight de la carte et de défiler.
  modalScrollView: {
    flexShrink: 1,
  },
  modalScroll: {
    padding: 14,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', flex: 1 },
  remuneration: { color: ORANGE, fontSize: 24, fontWeight: '800', marginBottom: 10 },
  detailRow: { marginBottom: 7 },
  detailLabel: { color: '#6B7280', fontSize: 12 },
  detailValue: { color: '#111827', fontWeight: '600' },
  descBlock: {
    marginTop: 6,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  applyBtn: {
    marginTop: 12,
    borderRadius: 10,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  applyGreenBtn: { backgroundColor: GREEN },
  cancelBtn: { backgroundColor: '#EF4444' },
  applyBtnText: { color: '#FFF', fontWeight: '700' },
});
