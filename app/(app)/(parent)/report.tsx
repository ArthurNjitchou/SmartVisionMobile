import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parentService } from '../../../src/services/parent.service';
import { reportService } from '../../../src/services/report.service';
import { useAuthStore } from '../../../src/stores/authStore';
import type { ParentChild } from '../../../src/types/parent.types';
import type { ReportItem } from '../../../src/types/report.types';

const GREEN = '#274e2b';
const ORANGE = '#c45221';

const MONTHS = [
  { value: '1', label: 'Janvier' },
  { value: '2', label: 'Fevrier' },
  { value: '3', label: 'Mars' },
  { value: '4', label: 'Avril' },
  { value: '5', label: 'Mai' },
  { value: '6', label: 'Juin' },
  { value: '7', label: 'Juillet' },
  { value: '8', label: 'Aout' },
  { value: '9', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Decembre' },
];

function formatReportDate(dateString?: string): string {
  if (!dateString) return 'Date inconnue';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ParentReportScreen() {
  const { user } = useAuthStore();
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  const parentId = user?.id ?? '';

  const [children, setChildren] = useState<ParentChild[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);

  useEffect(() => {
    if (typeof childId === 'string' && childId) {
      setSelectedChildId(childId);
    }
  }, [childId]);

  useEffect(() => {
    const loadChildren = async () => {
      if (!parentId) return;
      try {
        const list = await parentService.getParentChildren(parentId);
        setChildren(list);
      } catch (err) {
        console.error('load children report', err);
      }
    };
    loadChildren();
  }, [parentId]);

  const loadReports = async () => {
    if (!parentId) {
      setErrorMessage("Erreur: ID du parent introuvable.");
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const list = await reportService.getAllReportFiles({
        status: 'SENTPARENT',
        page: 1,
        limit: 100,
      });
      setReports(list);
    } catch (err) {
      console.error('load reports', err);
      setErrorMessage('Erreur lors du chargement des rapports.');
      setReports([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [parentId]);

  const filteredReports = useMemo(() => {
    let filtered = [...reports];

    if (selectedChildId) {
      filtered = filtered.filter((r) => r.studentId === selectedChildId || r.student?.id === selectedChildId);
    }

    if (selectedMonth) {
      filtered = filtered.filter((r) => {
        const d = new Date(r.createdAt);
        return d.getMonth() + 1 === Number(selectedMonth);
      });
    }

    if (selectedYear) {
      filtered = filtered.filter((r) => {
        const d = new Date(r.createdAt);
        return d.getFullYear() === Number(selectedYear);
      });
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter((r) => {
        const studentName = `${r.student?.firstName || ''} ${r.student?.lastName || ''}`.toLowerCase();
        const teacherName = `${r.teacher?.firstName || ''} ${r.teacher?.lastName || ''}`.toLowerCase();
        const description = (r.description || '').toLowerCase();
        const fileName = (r.filename || '').toLowerCase();
        return (
          studentName.includes(term) ||
          teacherName.includes(term) ||
          description.includes(term) ||
          fileName.includes(term)
        );
      });
    }

    return filtered;
  }, [reports, selectedChildId, selectedMonth, selectedYear, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / itemsPerPage));
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(start, start + itemsPerPage);
  }, [currentPage, filteredReports]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [currentPage, totalPages]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  }, []);

  const clearFilters = () => {
    setSelectedChildId('');
    setSelectedMonth('');
    setSelectedYear('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const openModal = (report: ReportItem) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedReport(null);
    setIsModalOpen(false);
  };

  const openReportLink = async (report: ReportItem) => {
    if (!report.filepath) return;
    const canOpen = await Linking.canOpenURL(report.filepath);
    if (canOpen) {
      await Linking.openURL(report.filepath);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.pageDescription}>
            Filtrez par enfant, mois ou année, puis consultez ou téléchargez les rapports disponibles pour vos enfants.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Filtres</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterRow}>
              <FilterChip
                label={`Enfant: ${
                  selectedChildId
                    ? children.find((c) => c.id === selectedChildId)?.firstName || 'Selection'
                    : 'Tous'
                }`}
                onPress={() =>
                  setSelectedChildId((prev) => {
                    if (!children.length) return '';
                    if (!prev) return children[0].id;
                    const idx = children.findIndex((c) => c.id === prev);
                    const next = children[(idx + 1) % (children.length + 1)];
                    return next?.id || '';
                  })
                }
              />
              <FilterChip
                label={`Mois: ${
                  selectedMonth
                    ? MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth
                    : 'Tous'
                }`}
                onPress={() =>
                  setSelectedMonth((prev) => {
                    if (!prev) return '1';
                    const n = Number(prev) + 1;
                    return n > 12 ? '' : String(n);
                  })
                }
              />
              <FilterChip
                label={`Annee: ${selectedYear || 'Toutes'}`}
                onPress={() =>
                  setSelectedYear((prev) => {
                    if (!prev) return String(years[0]);
                    const idx = years.findIndex((y) => String(y) === prev);
                    if (idx < 0 || idx === years.length - 1) return '';
                    return String(years[idx + 1]);
                  })
                }
              />
            </View>
          </ScrollView>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color="#9CA3AF" />
            <TextInput
              value={searchTerm}
              onChangeText={(text) => {
                setSearchTerm(text);
                setCurrentPage(1);
              }}
              placeholder="Rechercher un rapport..."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
            />
          </View>

          <View style={styles.filtersActions}>
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
              <Text style={styles.clearBtnText}>Effacer les filtres</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.listHeader}>
            <Text style={styles.cardTitle}>Rapports</Text>
            <View style={styles.listHeaderRight}>
              <Text style={styles.countText}>{filteredReports.length} rapport(s)</Text>
              <TouchableOpacity onPress={loadReports}>
                <Ionicons name="refresh" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.centerBlock}>
              <ActivityIndicator size="large" color={ORANGE} />
              <Text style={styles.muted}>Chargement des rapports...</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.centerBlock}>
              <Ionicons name="alert-circle-outline" size={36} color="#DC2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadReports}>
                <Text style={styles.retryBtnText}>Reessayer</Text>
              </TouchableOpacity>
            </View>
          ) : filteredReports.length === 0 ? (
            <View style={styles.centerBlock}>
              <Ionicons name="document-text-outline" size={36} color="#9CA3AF" />
              <Text style={styles.muted}>Aucun rapport trouve</Text>
            </View>
          ) : (
            <View>
              {paginatedReports.map((report) => (
                <View key={report.id} style={styles.reportRow}>
                  <View style={styles.reportTop}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {`${report.student?.firstName?.charAt(0) || 'E'}${
                          report.student?.lastName?.charAt(0) || ''
                        }`.toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportName}>
                        {report.student
                          ? `${report.student.firstName || ''} ${report.student.lastName || ''}`.trim()
                          : 'Enfant inconnu'}
                      </Text>
                      <Text style={styles.reportMeta}>
                        Rapport de {formatReportDate(report.createdAt)}
                      </Text>
                      <Text style={styles.reportMetaSmall}>
                        Enseignant:{' '}
                        {report.teacher
                          ? `${report.teacher.firstName || ''} ${report.teacher.lastName || ''}`.trim()
                          : 'Inconnu'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.reportDesc}>{report.description || 'Sans description'}</Text>
                  <Text style={styles.reportFile}>{report.filename || 'Fichier PDF'}</Text>

                  <View style={styles.reportActions}>
                    <TouchableOpacity style={styles.viewBtn} onPress={() => openModal(report)}>
                      <Ionicons name="eye-outline" size={16} color="#FFF" />
                      <Text style={styles.actionText}>Voir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.downloadBtn} onPress={() => openReportLink(report)}>
                      <Ionicons name="download-outline" size={16} color="#FFF" />
                      <Text style={styles.actionText}>Telecharger</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {totalPages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    disabled={currentPage === 1}
                    onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  >
                    <Text style={styles.pageBtnText}>Precedent</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageText}>
                    {currentPage} / {totalPages}
                  </Text>
                  <TouchableOpacity
                    disabled={currentPage === totalPages}
                    onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  >
                    <Text style={styles.pageBtnText}>Suivant</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal transparent visible={isModalOpen} animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          <View style={styles.modalCard}>
            {selectedReport && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedReport.filename || 'Rapport PDF'}</Text>
                  <TouchableOpacity onPress={closeModal}>
                    <Ionicons name="close" size={22} color="#FFF" />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalBody}
                  showsVerticalScrollIndicator
                  nestedScrollEnabled
                >
                  <Text style={styles.modalText}>
                    {selectedReport.student
                      ? `${selectedReport.student.firstName || ''} ${selectedReport.student.lastName || ''}`.trim()
                      : 'Enfant inconnu'}
                  </Text>
                  <Text style={styles.modalSubText}>{formatReportDate(selectedReport.createdAt)}</Text>
                  <Text style={styles.modalSubText}>{selectedReport.description || 'Sans description'}</Text>
                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.viewBtn} onPress={() => openReportLink(selectedReport)}>
                      <Ionicons name="open-outline" size={16} color="#FFF" />
                      <Text style={styles.actionText}>Ouvrir le PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.downloadBtn} onPress={() => openReportLink(selectedReport)}>
                      <Ionicons name="download-outline" size={16} color="#FFF" />
                      <Text style={styles.actionText}>Telecharger</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FilterChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.filterChip} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.filterChipText}>{label}</Text>
      <Ionicons name="chevron-down" size={14} color="#6B7280" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 28 },
  header: { marginBottom: 14 },
  pageDescription: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 10 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  filterChipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  searchWrap: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    gap: 6,
  },
  searchInput: { flex: 1, height: 40, color: '#111827' },
  filtersActions: { marginTop: 10, alignItems: 'flex-end' },
  clearBtn: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  clearBtnText: { color: '#4B5563', fontWeight: '600', fontSize: 12 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  listHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countText: { color: '#6B7280', fontSize: 12 },
  centerBlock: { alignItems: 'center', paddingVertical: 28 },
  muted: { marginTop: 8, color: '#6B7280', textAlign: 'center' },
  errorText: { marginTop: 8, color: '#DC2626', textAlign: 'center' },
  retryBtn: { marginTop: 10, backgroundColor: GREEN, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  retryBtnText: { color: '#FFF', fontWeight: '600' },
  reportRow: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  reportTop: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GREEN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#FFF', fontWeight: '700' },
  reportName: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  reportMeta: { fontSize: 12, color: '#4B5563', marginTop: 2 },
  reportMetaSmall: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  reportDesc: { marginTop: 10, fontSize: 13, color: '#374151', lineHeight: 18 },
  reportFile: { marginTop: 6, fontSize: 12, color: '#6B7280' },
  reportActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: GREEN,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ORANGE,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
  pagination: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageBtn: { backgroundColor: GREEN, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  pageBtnDisabled: { opacity: 0.45 },
  pageBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  pageText: { fontWeight: '700', color: '#374151' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: { backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden', maxHeight: '88%' },
  modalScroll: { flexShrink: 1 },
  modalHeader: {
    backgroundColor: GREEN,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { color: '#FFF', fontWeight: '700', flex: 1, marginRight: 8 },
  modalBody: { padding: 14, gap: 8 },
  modalText: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  modalSubText: { fontSize: 13, color: '#4B5563' },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
