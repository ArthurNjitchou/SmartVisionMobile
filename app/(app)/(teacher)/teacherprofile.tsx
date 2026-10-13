import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { ACCOUNT_DELETION_URL, CONTACT_EMAIL, PRIVACY_POLICY_URL } from '../../../src/constants/config';
import { userService } from '../../../src/services/user.service';
import { useAuthStore } from '../../../src/stores/authStore';
import type { UserDetailsResponse } from '../../../src/types/announcement.types';
import { formatDateFr } from '../../../src/utils/dateFormat';

function formatGender(gender?: string): string {
  if (!gender) return 'Non renseigne';
  const genderMap: Record<string, string> = {
    Male: 'Homme',
    male: 'Homme',
    MALE: 'Homme',
    Female: 'Femme',
    female: 'Femme',
    FEMALE: 'Femme',
    M: 'Homme',
    F: 'Femme',
  };
  return genderMap[gender] || gender;
}

export default function TeacherProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const teacherId = user?.id ?? '';
  const [userDetails, setUserDetails] = useState<UserDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadUserDetails = async () => {
      if (!teacherId) {
        setErrorMessage("Erreur : ID de l'enseignant non trouve.");
        return;
      }
      setLoading(true);
      setErrorMessage('');
      try {
        const details = await userService.getUserDetails(teacherId);
        setUserDetails(details);
      } catch (err) {
        console.error('teacher profile', err);
        setErrorMessage('Erreur lors du chargement des informations.');
      } finally {
        setLoading(false);
      }
    };
    loadUserDetails();
  }, [teacherId]);

  const initials = useMemo(() => {
    const first = userDetails?.firstName?.charAt(0) || '';
    const last = userDetails?.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || 'T';
  }, [userDetails?.firstName, userDetails?.lastName]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.pageDescription}>
            Identité, coordonnées et parcours professionnel : tout ce que les agences voient sur votre fiche enseignant.
          </Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#c45221" />
            <Text style={styles.centerText}>Chargement de votre profil...</Text>
          </View>
        ) : null}

        {!!errorMessage && !loading ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={22} color="#DC2626" />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Erreur de chargement</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          </View>
        ) : null}

        {!loading && !errorMessage ? (
          <>
            <View style={styles.profileCard}>
              <View style={styles.profileBanner} />
              <View style={styles.profileBody}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <Text style={styles.name}>
                  {userDetails?.firstName || ''} {userDetails?.lastName || ''}
                </Text>
                <View style={styles.roleRow}>
                  <Ionicons name="school-outline" size={14} color="#6B7280" />
                  <Text style={styles.roleText}>Enseignant</Text>
                </View>
                <View style={styles.statusPill}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Compte actif</Text>
                </View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Informations personnelles</Text>
              <InfoRow icon="person-outline" label="Prenom" value={userDetails?.firstName} />
              <InfoRow icon="person-outline" label="Nom" value={userDetails?.lastName} />
              <InfoRow icon="mail-outline" label="Email" value={userDetails?.email} />
              <InfoRow icon="call-outline" label="Telephone" value={userDetails?.phone} />
              <InfoRow
                icon="male-female-outline"
                label="Genre"
                value={formatGender(userDetails?.gender)}
              />
              <InfoRow icon="home-outline" label="Domicile" value={userDetails?.domicile} />
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Informations professionnelles</Text>
              <InfoRow
                icon="briefcase-outline"
                label="Profession"
                value={userDetails?.teacherProfile?.profession}
              />
              <InfoRow
                icon="time-outline"
                label="Annees d'experience"
                value={
                  userDetails?.teacherProfile?.experienceYears !== undefined
                    ? String(userDetails.teacherProfile.experienceYears)
                    : undefined
                }
              />
              <InfoRow
                icon="school-outline"
                label="Niveau autorise"
                value={userDetails?.teacherProfile?.authorizedLevel}
              />
              <InfoRow
                icon="grid-outline"
                label="Section"
                value={userDetails?.teacherProfile?.section}
              />
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Informations du compte</Text>
              <InfoRow
                icon="people-outline"
                label="Type de compte"
                value={userDetails?.role || 'Enseignant'}
              />
              <InfoRow
                icon="calendar-outline"
                label="Date de creation"
                value={formatDateFr(userDetails?.createdAt)}
              />
              <InfoRow
                icon="refresh-outline"
                label="Derniere mise a jour"
                value={formatDateFr(userDetails?.updatedAt)}
              />
            </View>

            <TouchableOpacity
              style={[styles.logoutBtn, loggingOut && styles.logoutBtnDisabled]}
              activeOpacity={0.85}
              disabled={loggingOut}
              onPress={async () => {
                if (loggingOut) return;
                setLoggingOut(true);
                try {
                  await logout();
                  router.replace('/(auth)/login' as any);
                } catch {
                  setLoggingOut(false);
                }
              }}
            >
              {loggingOut ? (
                <ActivityIndicator size="small" color="#B91C1C" />
              ) : (
                <Ionicons name="log-out-outline" size={20} color="#B91C1C" />
              )}
              <Text style={styles.logoutText}>{loggingOut ? 'Deconnexion...' : 'Deconnexion'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.privacyLinkBtn}
              onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
              activeOpacity={0.7}
            >
              <Text style={styles.privacyLinkText}>Politique de confidentialité</Text>
            </TouchableOpacity>

            <Text style={styles.deletionInfoText}>
              Pour demander la suppression de votre compte, écrivez à{' '}
              <Text
                style={styles.deletionInfoLink}
                onPress={() =>
                  Linking.openURL(
                    `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Suppression de compte SmartVision')}`
                  )
                }
              >
                {CONTACT_EMAIL}
              </Text>
              {' '}depuis l&apos;adresse email de votre compte.{' '}
              <Text
                style={styles.deletionInfoLink}
                onPress={() => WebBrowser.openBrowserAsync(ACCOUNT_DELETION_URL)}
              >
                En savoir plus
              </Text>
            </Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={18} color="#6B7280" />
        <View>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value || 'Non renseigne'}</Text>
        </View>
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
    marginBottom: 8,
  },
  centered: { alignItems: 'center', paddingVertical: 40 },
  centerText: { marginTop: 8, color: '#6B7280' },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  errorTitle: { color: '#B91C1C', fontWeight: '700' },
  errorText: { color: '#B91C1C', marginTop: 2 },
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 14,
  },
  profileBanner: { height: 64, backgroundColor: '#274e2b' },
  profileBody: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginTop: -36,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFF',
    backgroundColor: '#274e2b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  roleText: { color: '#6B7280' },
  statusPill: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  statusText: { color: '#15803D', fontSize: 12, fontWeight: '600' },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  infoRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  infoLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoLabel: { color: '#6B7280', fontSize: 12, marginBottom: 2 },
  infoValue: { color: '#111827', fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    marginTop: 2,
  },
  logoutBtnDisabled: { opacity: 0.85 },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#B91C1C' },
  privacyLinkBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 14,
  },
  privacyLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#274e2b',
    textDecorationLine: 'underline',
  },
  deletionInfoText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 12,
  },
  deletionInfoLink: {
    color: '#274e2b',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
