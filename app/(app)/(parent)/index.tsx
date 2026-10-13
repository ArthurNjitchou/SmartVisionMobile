import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import { financeService } from '../../../src/services/finance.service';
import { parentService } from '../../../src/services/parent.service';
import { paymentSocket } from '../../../src/services/payment-socket.service';
import { userService } from '../../../src/services/user.service';
import { useAuthStore } from '../../../src/stores/authStore';
import type { Announcement } from '../../../src/types/announcement.types';
import type { ParentChild } from '../../../src/types/parent.types';
import { displayLabel } from '../../../src/utils/displayLabel';
import { formatBirthdateFr, formatDateFr } from '../../../src/utils/dateFormat';
import { resolveMediaUrl } from '../../../src/utils/mediaUrl';

const GREEN = '#274e2b';
const ORANGE = '#c45221';

export default function ParentHomeScreen() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuthStore();
  const parentId = user?.id ?? '';

  const [parentName, setParentName] = useState('');
  const [children, setChildren] = useState<ParentChild[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [childrenError, setChildrenError] = useState('');

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [pendingInvoices, setPendingInvoices] = useState(0);

  const [refreshing, setRefreshing] = useState(false);

  const totalChildren = children.length;

  const loadParentDetails = useCallback(async () => {
    if (!parentId) return;
    try {
      const details = await userService.getUserDetails(parentId);
      const fn = details.firstName ?? '';
      const ln = details.lastName ?? '';
      const full = `${fn} ${ln}`.trim();
      if (full) setParentName(full);
    } catch (e) {
      console.warn('user details', e);
    }
  }, [parentId]);

  const loadChildren = useCallback(async () => {
    if (!parentId) {
      setChildrenError('ID parent introuvable.');
      setLoadingChildren(false);
      return;
    }
    setChildrenError('');
    try {
      const list = await parentService.getParentChildren(parentId);
      setChildren(list);
    } catch (e) {
      console.error(e);
      setChildrenError('Erreur lors du chargement des enfants.');
      setChildren([]);
    } finally {
      setLoadingChildren(false);
    }
  }, [parentId]);

  const loadAnnouncementsFlow = useCallback(async () => {
    setLoadingAnnouncements(true);
    const pagination = { page: 1, limit: 10 };
    try {
      const res = await announcementService.getPublishedForParent(pagination);
      setAnnouncements(res.data ?? []);
    } catch (err) {
      console.error('announcements parent', err);
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  }, [parentId]);

  const loadPendingInvoices = useCallback(async () => {
    if (!parentId) return;
    try {
      const pending = await financeService.getParentInvoices(
        parentId,
        { status: 'PENDING' },
        { page: 1, limit: 1 }
      );
      const partial = await financeService.getParentInvoices(
        parentId,
        { status: 'PARTIAL' },
        { page: 1, limit: 1 }
      );
      setPendingInvoices((pending.meta.totalItems || 0) + (partial.meta.totalItems || 0));
    } catch {
      setPendingInvoices(0);
    }
  }, [parentId]);

  const loadAll = useCallback(async () => {
    await Promise.all([
      loadParentDetails(),
      loadChildren(),
      loadAnnouncementsFlow(),
      loadPendingInvoices(),
    ]);
  }, [loadParentDetails, loadChildren, loadAnnouncementsFlow, loadPendingInvoices]);

  useEffect(() => {
    if (authLoading || !token || !parentId) return;
    loadAll();
  }, [authLoading, token, parentId, loadAll]);

  useEffect(() => {
    paymentSocket.connect();
    return paymentSocket.subscribe((event) => {
      if (event.status === 'SUCCESS' || event.status === 'FAILED') {
        loadPendingInvoices();
      }
    });
  }, [loadPendingInvoices]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const displayName =
    parentName ||
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
    'Parent';

  const previewChildren = children.slice(0, 4);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Bonjour, {displayName} !</Text>
          <Text style={styles.subGreeting}>
            Voici un aperçu de l&apos;activité de vos enfants
          </Text>
        </View>

        {/* Annonces */}
        <View style={styles.sectionTitleRow}>
          <Ionicons name="megaphone-outline" size={20} color={GREEN} />
          <Text style={styles.sectionTitleText}>Annonces</Text>
        </View>

        {loadingAnnouncements ? (
          <View style={styles.cardCenter}>
            <ActivityIndicator size="large" color={GREEN} />
            <Text style={styles.muted}>Chargement des annonces...</Text>
          </View>
        ) : announcements.length === 0 ? (
          <View style={styles.emptyAnnouncements}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="megaphone-outline" size={40} color={GREEN} />
            </View>
            <Text style={styles.emptyTitle}>Aucune annonce disponible</Text>
            <Text style={styles.mutedSmall}>
              Il n&apos;y a pas d&apos;annonces pour le moment. Revenez bientôt !
            </Text>
          </View>
        ) : (
          announcements.map((a) => {
            const img = resolveMediaUrl(a.imagePath);
            return (
              <View key={a.id ?? a.title + a.createdAt} style={styles.announcementCard}>
                {img ? (
                  <Image
                    source={{ uri: img }}
                    style={styles.announcementImage}
                    contentFit="cover"
                  />
                ) : null}
                <View style={styles.announcementBody}>
                  <Text style={styles.announcementTitle}>{a.title}</Text>
                  <Text style={styles.announcementContent} numberOfLines={4}>
                    {a.content}
                  </Text>
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                    <Text style={styles.dateText}>
                      {formatDateFr(a.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* Stat rapide */}
        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.9}
          onPress={() => router.push('/(app)/(parent)/children' as any)}
        >
          <View style={styles.statAccent} />
          <View style={styles.statRow}>
            <View style={styles.statIconBox}>
              <Ionicons name="people-outline" size={26} color={GREEN} />
            </View>
            <View>
              <Text style={styles.statLabel}>Mes enfants</Text>
              <Text style={styles.statValue}>{totalChildren}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.9}
          onPress={() => router.push('/(app)/(parent)/payments' as any)}
        >
          <View style={[styles.statAccent, { backgroundColor: `${ORANGE}18` }]} />
          <View style={styles.statRow}>
            <View style={[styles.statIconBox, { backgroundColor: `${ORANGE}22` }]}>
              <Ionicons name="receipt-outline" size={26} color={ORANGE} />
            </View>
            <View>
              <Text style={styles.statLabel}>Factures à régler</Text>
              <Text style={[styles.statValue, { color: ORANGE }]}>{pendingInvoices}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Accès rapide puis Mes enfants (comme mobile Angular) */}
        <View style={styles.twoCol}>
          <View style={styles.sideColumn}>
            <View style={styles.whiteCard}>
              <Text style={styles.cardHeaderTitle}>Accès rapide</Text>
              <Text style={styles.sideHint}>
                Accédez à vos sections principales
              </Text>

              <QuickLink
                title="Mes enfants"
                subtitle="Gérer mes enfants"
                color={GREEN}
                icon="people"
                onPress={() => router.push('/(app)/(parent)/children' as any)}
              />
              <QuickLink
                title="Mes factures"
                subtitle="Payer par Mobile Money"
                color={ORANGE}
                icon="receipt"
                onPress={() => router.push('/(app)/(parent)/payments' as any)}
              />
              <QuickLink
                title="Mes rapports"
                subtitle="Rapports mensuels"
                color={ORANGE}
                icon="bar-chart"
                onPress={() => router.push('/(app)/(parent)/report' as any)}
              />
              <QuickLink
                title="Mon profil"
                subtitle="Gérer mon compte"
                color="#0D9488"
                icon="person-circle"
                onPress={() => router.push('/(app)/(parent)/profile' as any)}
              />
              <QuickLink
                title="Aide"
                subtitle="Support et assistance"
                color="#9333EA"
                icon="help-circle"
                onPress={() => router.push('/(app)/(parent)/help' as any)}
              />
            </View>
          </View>

          <View style={styles.mainColumn}>
            <View style={styles.whiteCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>Mes enfants</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(app)/(parent)/children' as any)}
                  style={styles.linkBtn}
                >
                  <Text style={styles.linkBtnText}>Voir tous</Text>
                  <Ionicons name="arrow-forward" size={16} color={ORANGE} />
                </TouchableOpacity>
              </View>

              {loadingChildren ? (
                <View style={styles.cardCenter}>
                  <ActivityIndicator size="large" color={ORANGE} />
                  <Text style={styles.muted}>Chargement...</Text>
                </View>
              ) : childrenError ? (
                <Text style={styles.errorInline}>{childrenError}</Text>
              ) : previewChildren.length === 0 ? (
                <View style={styles.cardCenter}>
                  <Ionicons name="happy-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.muted}>Aucun enfant trouvé</Text>
                </View>
              ) : (
                previewChildren.map((child) => (
                  <View key={child.id} style={styles.childRow}>
                    <View style={styles.childAvatar}>
                      <Text style={styles.childAvatarText}>
                        {(child.firstName?.charAt(0) || 'E').toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.childTextWrap}>
                      <Text style={styles.childName} numberOfLines={1}>
                        {child.firstName} {child.lastName}
                      </Text>
                      <Text style={styles.childClass} numberOfLines={1}>
                        {displayLabel(child.studentProfile?.class, 'Non défini')}
                      </Text>
                      <Text style={styles.childBirth} numberOfLines={1}>
                        Né(e) le{' '}
                        {formatBirthdateFr(child.studentProfile?.birthdate)}
                      </Text>
                    </View>
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>Actif</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickLink({
  title,
  subtitle,
  color,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.quickLink, { borderColor: `${color}22` }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.quickIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={22} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.quickTitle, { color: '#1a3a1f' }]}>{title}</Text>
        <Text style={styles.quickSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 15,
    color: '#6B7280',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  cardCenter: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  muted: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  mutedSmall: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyAnnouncements: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${GREEN}18`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
  },
  announcementImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#E5E7EB',
  },
  announcementBody: {
    padding: 16,
  },
  announcementTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  announcementContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
  },
  statAccent: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${GREEN}18`,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: `${GREEN}22`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: GREEN,
  },
  twoCol: {
    gap: 14,
  },
  mainColumn: {},
  sideColumn: {},
  whiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 16,
    marginBottom: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkBtnText: {
    color: ORANGE,
    fontWeight: '600',
    fontSize: 14,
  },
  errorInline: {
    color: '#B91C1C',
    paddingVertical: 16,
    textAlign: 'center',
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  childAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  childAvatarText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  childTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  childName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  childClass: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  childBirth: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  activePill: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#D1FAE5',
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  sideHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  quickSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
