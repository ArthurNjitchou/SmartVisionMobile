import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { parentService } from '../../../../src/services/parent.service';
import { userService } from '../../../../src/services/user.service';
import { useAuthStore } from '../../../../src/stores/authStore';
import type { ParentChild } from '../../../../src/types/parent.types';
import { displayLabel } from '../../../../src/utils/displayLabel';
import { formatBirthdateFr, getAgeFromBirthdate } from '../../../../src/utils/dateFormat';

type TeacherAssignment = {
  teacher?: {
    firstName?: string;
    lastName?: string;
  };
  courseOffering?: {
    frequency?: string | number;
    courseandoffering?: Array<{
      course?: {
        name?: string;
      };
    }>;
  };
};

type DetailedChild = ParentChild & {
  courseAssignments?: TeacherAssignment[];
};

export default function ParentChildrenListScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<DetailedChild | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const parentId = user?.id ?? '';

  const load = useCallback(async () => {
    if (!parentId) {
      setError('Compte parent introuvable.');
      setLoading(false);
      return;
    }
    setError('');
    try {
      const list = await parentService.getParentChildren(parentId);
      setChildren(list);
      setCurrentPage(1);
    } catch (e) {
      console.error(e);
      setError('Erreur lors du chargement des enfants.');
      setChildren([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parentId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const filteredChildren = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return children;
    return children.filter((child) => {
      const fullName = `${child.firstName || ''} ${child.lastName || ''}`.toLowerCase();
      return fullName.includes(query);
    });
  }, [children, searchTerm]);

  const totalChildren = filteredChildren.length;
  const totalPages = Math.max(1, Math.ceil(totalChildren / pageSize));

  const paginatedChildren = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredChildren.slice(start, start + pageSize);
  }, [currentPage, filteredChildren]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const getInitials = (firstName?: string, lastName?: string) =>
    `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'E';

  const getSection = (child: ParentChild | DetailedChild) =>
    displayLabel(child.studentProfile?.section, 'Non définie');

  const getSchoolName = (child: ParentChild | DetailedChild) =>
    displayLabel(child.studentProfile?.school?.name, 'Non definie');
  const getSchoolAddress = (child: ParentChild | DetailedChild) =>
    displayLabel(child.studentProfile?.school?.address, 'Non definie');
  const getSchoolCity = (child: ParentChild | DetailedChild) =>
    displayLabel(child.studentProfile?.school?.city, 'Non definie');
  const getSchoolZone = (child: ParentChild | DetailedChild) =>
    displayLabel(child.studentProfile?.school?.zone, 'Non definie');

  const getClassLabel = (child: ParentChild | DetailedChild) =>
    displayLabel(child.studentProfile?.class, 'Non definie');

  const openModal = async (child: ParentChild) => {
    try {
      setModalLoading(true);
      const detail = await userService.getUserDetails(child.id);
      setSelectedChild((detail as DetailedChild) || (child as DetailedChild));
      setIsModalOpen(true);
    } catch (e) {
      console.error(e);
      setError("Erreur lors du chargement des details de l'enfant.");
      setSelectedChild(child as DetailedChild);
      setIsModalOpen(true);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedChild(null);
  };

  const createReport = (childId: string) => {
    router.push({
      pathname: '/(app)/(parent)/report',
      params: { childId },
    } as any);
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    for (let i = startPage; i <= endPage; i++) pages.push(i);
    return pages;
  };

  if (!parentId) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <Text style={styles.errorText}>{error || 'Session invalide.'}</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={['bottom']}>
        <ActivityIndicator size="large" color="#c45221" />
        <Text style={styles.muted}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Ionicons name="people" size={28} color="#FFF" />
          </View>
          <View style={styles.headerTextCol}>
            <Text style={styles.pageDescription}>
              Consultez la scolarité de vos enfants, leurs écoles et accédez aux rapports depuis cette liste.
            </Text>
          </View>
        </View>

        <View style={styles.statsBar}>
          <View>
            <Text style={styles.statsLabel}>Vous suivez actuellement</Text>
            <Text style={styles.statsValue}>
              {totalChildren} <Text style={styles.statsUnit}>enfant{totalChildren > 1 ? 's' : ''}</Text>
            </Text>
          </View>
          <View style={styles.statsIconWrap}>
            <Ionicons name="body-outline" size={36} color="#FFF" />
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#6B7280" />
          <TextInput
            placeholder="Recherche par nom"
            placeholderTextColor="#9CA3AF"
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchInput}
          />
        </View>

        {error ? <Text style={styles.banner}>{error}</Text> : null}

        {totalChildren === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="happy-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Aucun enfant trouve</Text>
            <Text style={styles.muted}>Les enfants lies a votre compte apparaitront ici.</Text>
            <TouchableOpacity
              style={styles.helpBtn}
              onPress={() => router.push('/(app)/(parent)/help' as any)}
            >
              <Ionicons name="person-add-outline" size={16} color="#FFF" />
              <Text style={styles.helpBtnText}>Contacter l'administration</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              {paginatedChildren.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardAvatar}>
                      <Text style={styles.cardAvatarText}>{getInitials(item.firstName, item.lastName)}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.cardName} numberOfLines={1}>
                        {item.firstName} {item.lastName}
                      </Text>
                    </View>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Actif</Text>
                    </View>
                  </View>

                  <View style={styles.detailsBlock}>
                    <DetailRow
                      icon="school-outline"
                      color="#274e2b"
                      label="Classe"
                      value={getClassLabel(item)}
                    />
                    <DetailRow
                      icon="layers-outline"
                      color="#c45221"
                      label="Section"
                      value={getSection(item)}
                    />
                    <DetailRow
                      icon="calendar-outline"
                      color="#2563EB"
                      label="Age"
                      value={`${getAgeFromBirthdate(item.studentProfile?.birthdate)} ans`}
                    />
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => openModal(item)}>
                      <Ionicons name="eye-outline" size={16} color="#FFF" />
                      <Text style={styles.actionText}>Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={() => createReport(item.id)}>
                      <Ionicons name="bar-chart-outline" size={16} color="#FFF" />
                      <Text style={styles.actionText}>Rapports</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {totalPages > 1 && (
              <View style={styles.pagination}>
                <Pressable
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <Ionicons name="chevron-back" size={16} color="#FFF" />
                </Pressable>
                <View style={styles.pageNumbers}>
                  {getPageNumbers().map((page) => (
                    <Pressable
                      key={page}
                      style={[styles.pageNumber, page === currentPage && styles.pageNumberActive]}
                      onPress={() => setCurrentPage(page)}
                    >
                      <Text style={[styles.pageNumberText, page === currentPage && styles.pageNumberTextActive]}>
                        {page}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <Ionicons name="chevron-forward" size={16} color="#FFF" />
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          <View style={styles.modalCard}>
            {modalLoading ? (
              <View style={styles.cardCenter}>
                <ActivityIndicator size="large" color="#c45221" />
                <Text style={styles.muted}>Chargement des details...</Text>
              </View>
            ) : selectedChild ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarText}>
                      {getInitials(selectedChild.firstName, selectedChild.lastName)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalName}>
                      {selectedChild.firstName} {selectedChild.lastName}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={closeModal}>
                    <Ionicons name="close" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalContent}
                  showsVerticalScrollIndicator
                  nestedScrollEnabled
                >
                  <DetailBox title="Classe" value={getClassLabel(selectedChild)} />
                  <DetailBox title="Section" value={getSection(selectedChild)} />
                  <DetailBox
                    title="Age"
                    value={`${getAgeFromBirthdate(selectedChild.studentProfile?.birthdate)} ans`}
                  />
                  <DetailBox title="Date de naissance" value={formatBirthdateFr(selectedChild.studentProfile?.birthdate)} />

                  <View style={styles.schoolSection}>
                    <View style={styles.schoolSectionHeader}>
                      <View style={styles.schoolSectionIcon}>
                        <Ionicons name="school-outline" size={22} color="#c45221" />
                      </View>
                      <Text style={styles.schoolSectionTitle}>Informations scolaires</Text>
                    </View>
                    <SchoolInfoRow icon="business-outline" label="Ecole" value={getSchoolName(selectedChild)} />
                    <SchoolInfoRow icon="location-outline" label="Adresse de l'ecole" value={getSchoolAddress(selectedChild)} />
                    <SchoolInfoRow icon="map-outline" label="Ville" value={getSchoolCity(selectedChild)} />
                    <SchoolInfoRow icon="navigate-outline" label="Zone" value={getSchoolZone(selectedChild)} />
                  </View>

                  <Text style={styles.modalSectionTitle}>Enseignants</Text>
                  {selectedChild.courseAssignments?.length ? (
                    selectedChild.courseAssignments.map((assignment, idx) => {
                      const teacherFirst = assignment.teacher?.firstName || '';
                      const teacherLast = assignment.teacher?.lastName || '';
                      const courseName = displayLabel(
                        assignment.courseOffering?.courseandoffering?.[0]?.course,
                        'Matiere non specifiee'
                      );
                      const frequency = displayLabel(
                        assignment.courseOffering?.frequency,
                        'Frequence non specifiee'
                      );
                      return (
                        <View key={`${teacherFirst}-${idx}`} style={styles.teacherRow}>
                          <View style={styles.teacherAvatar}>
                            <Text style={styles.teacherAvatarText}>{getInitials(teacherFirst, teacherLast)}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.teacherName}>
                              {teacherFirst} {teacherLast}
                            </Text>
                            <Text style={styles.teacherCourse}>{courseName}</Text>
                            <Text style={styles.teacherFreq}>{frequency} fois/semaine</Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.noTeacher}>Aucun enseignant assigne</Text>
                  )}
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  color,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIconWrap, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function DetailBox({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.detailBox}>
      <Text style={styles.detailBoxLabel}>{title}</Text>
      <Text style={styles.detailBoxValue}>{value}</Text>
    </View>
  );
}

function SchoolInfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.schoolInfoRow}>
      <Ionicons name={icon} size={18} color="#c45221" style={styles.schoolInfoIcon} />
      <View style={{ flex: 1 }}>
        <Text style={styles.schoolInfoLabel}>{label}</Text>
        <Text style={styles.schoolInfoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#274e2b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextCol: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 56,
  },
  pageDescription: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: '#4B5563',
  },
  statsBar: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#274e2b',
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsLabel: {
    color: '#D1FAE5',
    fontSize: 12,
  },
  statsValue: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 30,
  },
  statsUnit: {
    fontSize: 18,
    fontWeight: '500',
  },
  statsIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#c45221',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 42,
    color: '#111827',
  },
  banner: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#FEF2F2',
    color: '#B91C1C',
    borderRadius: 8,
    overflow: 'hidden',
  },
  grid: {
    gap: 10,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  cardAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#274e2b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  detailsBlock: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#274e2b',
    borderRadius: 10,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#c45221',
    borderRadius: 10,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#D1FAE5',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 6,
  },
  muted: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  helpBtn: {
    marginTop: 14,
    backgroundColor: '#c45221',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helpBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
  pagination: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pageBtn: {
    backgroundColor: '#274e2b',
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.45,
  },
  pageNumbers: {
    flexDirection: 'row',
    gap: 6,
  },
  pageNumber: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageNumberActive: {
    backgroundColor: '#274e2b',
    borderColor: '#274e2b',
  },
  pageNumberText: {
    color: '#4B5563',
    fontWeight: '600',
  },
  pageNumberTextActive: {
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    maxHeight: '88%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF',
  },
  modalHeader: {
    backgroundColor: '#274e2b',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#c45221',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalName: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 17,
  },
  // flexShrink : sans lui le ScrollView s'étend à la taille de son contenu, dépasse le
  // maxHeight de la carte (overflow hidden) et n'est alors plus scrollable.
  modalScroll: {
    flexShrink: 1,
  },
  modalContent: {
    padding: 14,
    paddingBottom: 28,
    gap: 10,
  },
  detailBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailBoxLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailBoxValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  schoolSection: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: 'rgba(196, 82, 33, 0.2)',
    gap: 12,
  },
  schoolSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  schoolSectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(196, 82, 33, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  schoolSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  schoolInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  schoolInfoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  schoolInfoLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  schoolInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  modalSectionTitle: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  teacherAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#274e2b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teacherAvatarText: {
    color: '#FFF',
    fontWeight: '700',
  },
  teacherName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  teacherCourse: {
    fontSize: 12,
    color: '#4B5563',
  },
  teacherFreq: {
    fontSize: 11,
    color: '#6B7280',
  },
  noTeacher: {
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 2,
  },
  errorText: {
    color: '#B91C1C',
    textAlign: 'center',
  },
  cardCenter: {
    alignItems: 'center',
    paddingVertical: 24,
  },
});
