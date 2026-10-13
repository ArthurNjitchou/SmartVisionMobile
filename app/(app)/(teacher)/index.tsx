import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { announcementService } from '../../../src/services/announcement.service';
import { agencyService } from '../../../src/services/agency.service';
import { coursemanipulationService } from '../../../src/services/coursemanipulation.service';
import { userService } from '../../../src/services/user.service';
import { useAuthStore } from '../../../src/stores/authStore';
import type { Announcement } from '../../../src/types/announcement.types';
import { formatDateFr } from '../../../src/utils/dateFormat';
import { resolveMediaUrl } from '../../../src/utils/mediaUrl';

const GREEN = '#274e2b';
const ORANGE = '#c45221';

export default function TeacherHomeScreen() {
  const { user } = useAuthStore();
  const teacherId = user?.id ?? '';
  const router = useRouter();

  const [teacherName, setTeacherName] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const totalStudents = students.length;
  const activeOffers = offers.length;

  const loadTeacherDetails = useCallback(async () => {
    if (!teacherId) return;
    try {
      const details = await userService.getUserDetails(teacherId);
      const full = `${details.firstName || ''} ${details.lastName || ''}`.trim();
      if (full) setTeacherName(full);
    } catch (e) {
      console.error('teacher details', e);
    }
  }, [teacherId]);

  const loadDashboardData = useCallback(async () => {
    if (!teacherId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [studentsRes, offersRes] = await Promise.all([
        coursemanipulationService.getStudentsOfTeacher(teacherId),
        coursemanipulationService.getTeacherCourseOffering(teacherId, 1, 10),
      ]);
      setStudents(Array.isArray(studentsRes) ? studentsRes : []);
      setOffers(Array.isArray(offersRes.data) ? offersRes.data : []);
    } catch (e) {
      console.error('teacher dashboard', e);
      setStudents([]);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  const loadAnnouncements = useCallback(async () => {
    if (!teacherId) return;
    setLoadingAnnouncements(true);
    try {
      const agencies = await agencyService.getAllUserAgencywithdetails(teacherId);
      const agencyIds = agencies.map((a) => a.id).filter(Boolean) as string[];
      if (agencyIds.length) {
        const res = await announcementService.getPublishedAnnouncementsByRoleAndAgency(
          'teacher',
          agencyIds,
          { page: 1, limit: 10 }
        );
        setAnnouncements(res.data ?? []);
      } else {
        const res = await announcementService.getPublishedAnnouncementsByRole('teacher', {
          page: 1,
          limit: 10,
        });
        setAnnouncements(res.data ?? []);
      }
    } catch (e) {
      console.error('teacher announcements', e);
      try {
        const res = await announcementService.getPublishedAnnouncementsByRole('teacher', {
          page: 1,
          limit: 10,
        });
        setAnnouncements(res.data ?? []);
      } catch {
        setAnnouncements([]);
      }
    } finally {
      setLoadingAnnouncements(false);
    }
  }, [teacherId]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadTeacherDetails(), loadDashboardData(), loadAnnouncements()]);
  }, [loadTeacherDetails, loadDashboardData, loadAnnouncements]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const previewStudents = useMemo(() => students.slice(0, 4), [students]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Bonjour, {teacherName || 'Enseignant'} !</Text>
          <Text style={styles.subtitle}>
            Voici un apercu de votre activite d&apos;enseignement
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="megaphone-outline" size={18} color={GREEN} />
          <Text style={styles.sectionTitle}>Annonces</Text>
        </View>
        {loadingAnnouncements ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={styles.muted}>Chargement des annonces...</Text>
          </View>
        ) : announcements.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="megaphone-outline" size={36} color={GREEN} />
            <Text style={styles.emptyTitle}>Aucune annonce disponible</Text>
          </View>
        ) : (
          announcements.map((announcement, idx) => {
            const image = resolveMediaUrl(announcement.imagePath);
            return (
              <View key={announcement.id || `${announcement.title}-${idx}`} style={styles.announceCard}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.announceImage} contentFit="cover" />
                ) : null}
                <View style={styles.announceBody}>
                  <Text style={styles.announceTitle}>{announcement.title}</Text>
                  <Text style={styles.announceContent} numberOfLines={3}>
                    {announcement.content}
                  </Text>
                  <Text style={styles.announceDate}>{formatDateFr(announcement.createdAt)}</Text>
                </View>
              </View>
            );
          })
        )}

        <View style={styles.statsGrid}>
          <StatCard
            title="Mes eleves"
            value={String(totalStudents)}
            color={GREEN}
            icon="people-outline"
            onPress={() => router.push('/(app)/(teacher)/students' as any)}
          />
          <StatCard
            title="Offres actives"
            value={String(activeOffers)}
            color={ORANGE}
            icon="briefcase-outline"
            onPress={() => router.push('/(app)/(teacher)/teacheroffers' as any)}
          />
        </View>

        <View style={styles.twoCol}>
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>Mes eleves</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/(teacher)/students' as any)}>
                <Text style={styles.link}>Voir tous</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <View style={styles.centerBlock}>
                <ActivityIndicator size="large" color={ORANGE} />
                <Text style={styles.muted}>Chargement des informations...</Text>
              </View>
            ) : previewStudents.length === 0 ? (
              <View style={styles.centerBlock}>
                <Ionicons name="school-outline" size={34} color="#9CA3AF" />
                <Text style={styles.muted}>Aucun eleve trouve</Text>
              </View>
            ) : (
              previewStudents.map((student) => (
                <View key={student.studentId} style={styles.studentRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(student.firstName?.charAt(0) || 'E').toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.studentName} numberOfLines={1}>
                      {student.firstName} {student.lastName}
                    </Text>
                    <Text style={styles.studentMeta} numberOfLines={1}>
                      {student.studentProfile?.class || 'Non defini'}
                    </Text>
                    <Text style={styles.studentMetaSmall} numberOfLines={1}>
                      Parent: {student.parents?.[0]?.firstName || '-'} {student.parents?.[0]?.lastName || ''}
                    </Text>
                  </View>
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>Actif</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Acces rapide</Text>
            <QuickAction
              icon="people-outline"
              color={GREEN}
              title="Mes eleves"
              subtitle="Gerer mes etudiants"
              onPress={() => router.push('/(app)/(teacher)/students' as any)}
            />
            <QuickAction
              icon="wallet-outline"
              color="#0D9488"
              title="Mes paiements"
              subtitle="Versements reçus"
              onPress={() => router.push('/(app)/(teacher)/payments' as any)}
            />
            <QuickAction
              icon="briefcase-outline"
              color={ORANGE}
              title="Mes offres"
              subtitle="Gerer mes opportunites"
              onPress={() => router.push('/(app)/(teacher)/teacheroffers' as any)}
            />
            <QuickAction
              icon="document-text-outline"
              color="#d97706"
              title="Rapports de cours"
              subtitle="Creer un rapport"
              onPress={() => router.push('/(app)/(teacher)/students' as any)}
            />
            <QuickAction
              icon="help-circle-outline"
              color="#9333EA"
              title="Aide"
              subtitle="Support et assistance"
              onPress={() => router.push('/(app)/(teacher)/teacherhelp' as any)}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  title,
  value,
  color,
  icon,
  onPress,
}: {
  title: string;
  value: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.statIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View>
        <Text style={styles.statLabel}>{title}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
    </TouchableOpacity>
  );
}

function QuickAction({
  icon,
  color,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quick} onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.quickIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={18} color="#FFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickSub}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 28 },
  header: { marginBottom: 14 },
  title: { fontSize: 24, fontWeight: '800', color: '#1F2937' },
  subtitle: { marginTop: 2, color: '#6B7280' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  centerBlock: { alignItems: 'center', paddingVertical: 20 },
  muted: { marginTop: 8, color: '#6B7280', textAlign: 'center' },
  emptyCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    alignItems: 'center',
    padding: 18,
    marginBottom: 10,
  },
  emptyTitle: { marginTop: 8, color: '#374151', fontWeight: '600' },
  announceCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  announceImage: { width: '100%', height: 140, backgroundColor: '#E5E7EB' },
  announceBody: { padding: 12 },
  announceTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  announceContent: { color: '#374151', marginBottom: 8 },
  announceDate: { color: '#9CA3AF', fontSize: 12 },
  statsGrid: { gap: 10, marginTop: 6, marginBottom: 10 },
  statCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 12, color: '#6B7280' },
  statValue: { fontSize: 24, fontWeight: '800' },
  twoCol: { gap: 10 },
  card: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  link: { color: ORANGE, fontWeight: '600' },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { color: '#FFF', fontWeight: '700' },
  studentName: { fontWeight: '700', color: '#1F2937' },
  studentMeta: { color: '#6B7280', fontSize: 12, marginTop: 1 },
  studentMetaSmall: { color: '#9CA3AF', fontSize: 11, marginTop: 1 },
  pill: { backgroundColor: '#D1FAE5', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  pillText: { color: '#065F46', fontSize: 11, fontWeight: '600' },
  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  quickIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  quickTitle: { fontWeight: '700', color: '#1F2937' },
  quickSub: { color: '#6B7280', fontSize: 12 },
});
