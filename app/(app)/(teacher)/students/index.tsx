import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  coursemanipulationService,
  type TeacherStudentData,
} from '../../../../src/services/coursemanipulation.service';
import { useAuthStore } from '../../../../src/stores/authStore';

export default function TeacherStudentsScreen() {
  const { user } = useAuthStore();
  const teacherId = user?.id ?? '';
  const router = useRouter();

  const [students, setStudents] = useState<TeacherStudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [selectedStudent, setSelectedStudent] = useState<TeacherStudentData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadStudents = async () => {
    if (!teacherId) {
      setError("Erreur : ID de l'enseignant non trouve.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const list = await coursemanipulationService.getStudentsOfTeacher(teacherId);
      setStudents(list);
    } catch (e) {
      console.error(e);
      setError('Erreur lors du chargement des eleves.');
      setStudents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [teacherId]);

  const filteredStudents = useMemo(() => {
    let filtered = [...students];
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter((s) => {
        const fullName = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
        return fullName.includes(term);
      });
    }
    return filtered;
  }, [students, searchTerm]);

  const totalStudents = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalStudents / pageSize));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage]);

  const clearFilters = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStudents();
  };

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'E';

  const calculateAge = (birthdate?: string | null) => {
    if (!birthdate) return 'Non disponible';
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? `${age} ans` : 'Non disponible';
  };

  const getSection = (student: TeacherStudentData) => student.studentProfile?.section || 'Non definie';
  const getDomicile = (student: TeacherStudentData) => student.domicile || 'Non disponible';
  const getSchoolName = (student: TeacherStudentData) => student.studentProfile?.school?.name || 'Non disponible';
  const getSchoolAddress = (student: TeacherStudentData) => {
    const school = student.studentProfile?.school;
    if (!school) return 'Non disponible';
    return [school.address, school.city].filter(Boolean).join(', ') || 'Non disponible';
  };

  const openModal = (student: TeacherStudentData) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedStudent(null);
    setIsModalOpen(false);
  };

  const createReport = (studentId: string) => {
    router.push({
      pathname: '/(app)/(teacher)/students/report-create',
      params: { studentId },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.pageDescription}>
            Retrouvez les élèves qui vous sont assignés, recherchez par nom et ouvrez un bilan depuis la fiche.
          </Text>
        </View>

        {!loading && !error ? (
          <View style={styles.statsBar}>
            <View>
              <Text style={styles.statsLabel}>Vous accompagnez actuellement</Text>
              <Text style={styles.statsValue}>
                {totalStudents} <Text style={styles.statsUnit}>eleve{totalStudents > 1 ? 's' : ''}</Text>
              </Text>
            </View>
            <View style={styles.statsIcon}>
              <Ionicons name="people-outline" size={34} color="#FFF" />
            </View>
          </View>
        ) : null}

        <View style={styles.filters}>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              value={searchTerm}
              onChangeText={(t) => {
                setSearchTerm(t);
                setCurrentPage(1);
              }}
              placeholder="Recherche par nom"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
            />
          </View>
          {searchTerm.trim() ? (
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
              <Text style={styles.clearBtnText}>Effacer la recherche</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#c45221" />
            <Text style={styles.muted}>Chargement de vos eleves...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : paginated.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="school-outline" size={44} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Aucun eleve trouve</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {paginated.map((student) => (
              <View key={student.studentId} style={styles.card}>
                <View style={styles.cardHead}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(student.firstName, student.lastName)}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {student.firstName} {student.lastName}
                    </Text>
                  </View>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>Actif</Text>
                  </View>
                </View>
                <View style={styles.details}>
                  <Detail label="Classe" value={student.studentProfile?.class || 'Non definie'} color="#274e2b" />
                  <Detail label="Section" value={getSection(student)} color="#c45221" />
                  <Detail label="Quartier" value={getDomicile(student)} color="#2563eb" />
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.viewBtn} onPress={() => openModal(student)}>
                    <Ionicons name="eye-outline" size={16} color="#FFF" />
                    <Text style={styles.btnText}>Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reportBtn} onPress={() => createReport(student.studentId)}>
                    <Ionicons name="document-text-outline" size={16} color="#FFF" />
                    <Text style={styles.btnText}>Rapport</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {totalPages > 1 && !loading && !error ? (
          <View style={styles.pagination}>
            <TouchableOpacity
              onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={[styles.pageBtn, currentPage === 1 && styles.pageDisabled]}
            >
              <Text style={styles.pageBtnText}>Precedent</Text>
            </TouchableOpacity>
            <Text style={styles.pageText}>{currentPage} / {totalPages}</Text>
            <TouchableOpacity
              onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={[styles.pageBtn, currentPage === totalPages && styles.pageDisabled]}
            >
              <Text style={styles.pageBtnText}>Suivant</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          <View style={styles.modalCard}>
            {selectedStudent ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </Text>
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
                  <Detail label="Classe" value={selectedStudent.studentProfile?.class || 'Non definie'} color="#274e2b" />
                  <Detail label="Section" value={getSection(selectedStudent)} color="#c45221" />
                  <Detail label="Age" value={calculateAge(selectedStudent.studentProfile?.birthdate)} color="#7c3aed" />
                  <Detail label="Quartier / Localisation" value={getDomicile(selectedStudent)} color="#2563eb" />
                  <Detail label="Ecole" value={getSchoolName(selectedStudent)} color="#c45221" />
                  <Detail label="Adresse ecole" value={getSchoolAddress(selectedStudent)} color="#c45221" />
                  <Detail
                    label="Parents / Tuteurs"
                    value={
                      selectedStudent.parents?.length
                        ? selectedStudent.parents.map((p) => `${p.firstName} ${p.lastName}`).join(', ')
                        : 'Aucun parent enregistre'
                    }
                    color="#274e2b"
                  />
                </ScrollView>
                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                    <Text style={styles.closeBtnText}>Fermer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.reportBtn}
                    onPress={() => {
                      createReport(selectedStudent.studentId);
                      closeModal();
                    }}
                  >
                    <Text style={styles.btnText}>Creer un rapport</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Detail({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
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
  },
  statsBar: {
    borderRadius: 14,
    backgroundColor: '#274e2b',
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsLabel: { color: '#D1FAE5', fontSize: 12 },
  statsValue: { color: '#FFF', fontWeight: '800', fontSize: 30 },
  statsUnit: { fontSize: 18, fontWeight: '500' },
  statsIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#c45221', alignItems: 'center', justifyContent: 'center' },
  filters: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 10, gap: 6 },
  searchInput: { flex: 1, height: 40, color: '#111827' },
  clearBtn: { alignSelf: 'flex-end', backgroundColor: '#6B7280', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 8 },
  clearBtnText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
  centered: { alignItems: 'center', paddingVertical: 32 },
  muted: { marginTop: 8, color: '#6B7280' },
  errorBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, padding: 12 },
  errorText: { color: '#B91C1C' },
  emptyTitle: { marginTop: 8, color: '#374151', fontWeight: '700' },
  grid: { gap: 10 },
  card: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#274e2b', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { color: '#FFF', fontWeight: '700' },
  name: { fontWeight: '700', color: '#1F2937' },
  pill: { backgroundColor: '#D1FAE5', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  pillText: { color: '#065F46', fontSize: 11, fontWeight: '600' },
  details: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, gap: 6, marginBottom: 8 },
  detailRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  detailLabel: { color: '#6B7280', fontSize: 11 },
  detailValue: { color: '#111827', fontWeight: '600', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8 },
  viewBtn: { flex: 1, backgroundColor: '#274e2b', borderRadius: 8, minHeight: 40, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  reportBtn: { flex: 1, backgroundColor: '#c45221', borderRadius: 8, minHeight: 40, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  pagination: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageBtn: { backgroundColor: '#274e2b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  pageDisabled: { opacity: 0.45 },
  pageBtnText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
  pageText: { color: '#374151', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden', maxHeight: '88%' },
  modalScroll: { flexShrink: 1 },
  modalHeader: { backgroundColor: '#274e2b', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { color: '#FFF', fontWeight: '700', flex: 1, marginRight: 8 },
  modalBody: { padding: 12, paddingBottom: 16, gap: 8 },
  modalFooter: { flexDirection: 'row', gap: 8, padding: 12 },
  closeBtn: { flex: 1, backgroundColor: '#E5E7EB', borderRadius: 8, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: '#374151', fontWeight: '600' },
});
