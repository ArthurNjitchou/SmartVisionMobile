import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { coursemanipulationService } from '../../../../src/services/coursemanipulation.service';
import { userService } from '../../../../src/services/user.service';
import { useAuthStore } from '../../../../src/stores/authStore';
import type { CourseReportEntryForm } from '../../../../src/types/courseReport.types';
import {
  buildValidWeekDates,
  durationStringToMinutes,
  generateDurationOptions,
  getMondayOfDate,
  minutesToDurationString,
  parseBackendDateToISODate,
  weekStartISO,
} from '../../../../src/utils/courseReportWeek';

type PickerState = { kind: 'date' | 'duration'; index: number } | null;

const GREEN = '#274e2b';
const ORANGE = '#c45221';

export default function TeacherStudentReportCreateScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const teacherId = user?.id ?? '';
  const { studentId: rawStudentId } = useLocalSearchParams<{ studentId?: string }>();
  const studentId = typeof rawStudentId === 'string' ? rawStudentId : '';

  const weekMonday = useMemo(() => getMondayOfDate(new Date()), []);
  const validDates = useMemo(() => buildValidWeekDates(weekMonday), [weekMonday]);
  const durationOptions = useMemo(() => generateDurationOptions(), []);

  const [studentName, setStudentName] = useState('Chargement...');
  const [entries, setEntries] = useState<CourseReportEntryForm[]>([]);
  const [positivePoints, setPositivePoints] = useState('');
  const [negativePoints, setNegativePoints] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [loadingReport, setLoadingReport] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [saveFeedback, setSaveFeedback] = useState<{
    kind: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<Awaited<
    ReturnType<typeof coursemanipulationService.getReportHistory>
  >>(null);

  const [picker, setPicker] = useState<PickerState>(null);

  const clearMessagesLater = useCallback(() => {
    setTimeout(() => {
      setSuccessMessage(null);
      setErrorMessage(null);
    }, 5000);
  }, []);

  const loadStudentName = useCallback(async () => {
    if (!studentId) return;
    try {
      const d = await userService.getUserDetails(studentId);
      const n = `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim();
      setStudentName(n || 'Eleve');
    } catch {
      setStudentName('Eleve');
    }
  }, [studentId]);

  const addEntry = useCallback(() => {
    setEntries((prev) => {
      if (prev.length >= validDates.length) return prev;
      return [...prev, { date: '', duration: '', note: '' }];
    });
  }, [validDates.length]);

  const loadWeeklyReport = useCallback(async (options?: { silent?: boolean }) => {
    if (!teacherId || !studentId) return;
    if (!options?.silent) {
      setLoadingReport(true);
    }
    setErrorMessage(null);
    try {
      const ws = weekStartISO(weekMonday);
      const report = await coursemanipulationService.getWeeklyReport(teacherId, studentId, ws);
      if (report) {
        setPositivePoints(report.positivePoints ?? '');
        setNegativePoints(report.negativePoints ?? '');
        setAdditionalNotes(report.additionalNotes ?? '');
        setEntries(
          (report.entries ?? []).map((e) => ({
            date: parseBackendDateToISODate(e.date),
            duration: minutesToDurationString(e.duration),
            note: e.note ?? '',
          }))
        );
        if (!options?.silent) {
          setSuccessMessage('Bilan charge avec succes.');
          clearMessagesLater();
        }
      } else {
        setPositivePoints('');
        setNegativePoints('');
        setAdditionalNotes('');
        setEntries([{ date: '', duration: '', note: '' }]);
        if (!options?.silent) {
          setSuccessMessage('Aucun bilan pour cette semaine. Remplissez-le pour enregistrer.');
          clearMessagesLater();
        }
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Erreur lors du chargement du bilan.');
      clearMessagesLater();
      setEntries((prev) => (prev.length === 0 ? [{ date: '', duration: '', note: '' }] : prev));
    } finally {
      setLoadingReport(false);
    }
  }, [teacherId, studentId, weekMonday, clearMessagesLater]);

  const loadHistory = useCallback(async () => {
    if (!teacherId || !studentId) return;
    setHistoryLoading(true);
    try {
      const h = await coursemanipulationService.getReportHistory(studentId, teacherId);
      setHistoryData(h);
    } catch (e) {
      console.error(e);
      setHistoryData(null);
    } finally {
      setHistoryLoading(false);
    }
  }, [studentId, teacherId]);

  useEffect(() => {
    loadStudentName();
  }, [loadStudentName]);

  useEffect(() => {
    if (teacherId && studentId) {
      loadWeeklyReport();
    } else {
      setLoadingReport(false);
    }
  }, [teacherId, studentId, loadWeeklyReport]);

  useEffect(() => {
    if (historyOpen) loadHistory();
  }, [historyOpen, loadHistory]);

  const getAvailableDates = (currentEntryDate: string) => {
    const used = entries
      .filter((e) => e.date && e.date !== currentEntryDate)
      .map((e) => e.date);
    return validDates.filter((d) => !used.includes(d.iso));
  };

  const updateEntry = (index: number, patch: Partial<CourseReportEntryForm>) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const onPickDate = (index: number, iso: string) => {
    const duplicate = entries.some((e, i) => i !== index && e.date === iso);
    if (duplicate) {
      setErrorMessage('Cette date est deja utilisee sur une autre ligne.');
      clearMessagesLater();
      setPicker(null);
      return;
    }
    updateEntry(index, { date: iso });
    setPicker(null);
  };

  const onPickDuration = (index: number, dur: string) => {
    updateEntry(index, { duration: dur });
    setPicker(null);
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const weekLabel = useMemo(() => {
    const d = new Date(weekMonday);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [weekMonday]);

  const onSubmit = async () => {
    setSubmitted(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!teacherId || !studentId) {
      setSaveFeedback({
        kind: 'error',
        title: 'Session invalide',
        message: 'Session ou élève invalide.',
      });
      return;
    }

    if (!positivePoints.trim() || !negativePoints.trim() || entries.length === 0) {
      setSaveFeedback({
        kind: 'error',
        title: 'Champs incomplets',
        message:
          'Veuillez remplir les points positifs, les points à améliorer et au moins une journée de cours.',
      });
      return;
    }

    const emptyRow = entries.some((e) => !e.date || !e.duration);
    if (emptyRow) {
      setSaveFeedback({
        kind: 'error',
        title: 'Journées incomplètes',
        message: 'Toutes les journées de cours doivent avoir une date et une durée.',
      });
      return;
    }

    const payloadEntries = entries.map((e) => ({
      date: e.date,
      duration: durationStringToMinutes(e.duration),
      note: e.note.trim() || undefined,
    }));

    setSaving(true);
    try {
      await coursemanipulationService.upsertWeeklyReport({
        studentId,
        teacherId,
        weekStart: weekStartISO(weekMonday),
        positivePoints: positivePoints.trim(),
        negativePoints: negativePoints.trim(),
        additionalNotes: additionalNotes.trim() || undefined,
        entries: payloadEntries,
      });
      setSaveFeedback({
        kind: 'success',
        title: 'Bilan enregistré',
        message:
          'Votre bilan hebdomadaire a bien été mis à jour. Les journées de cours, notes et observations ont été sauvegardées.',
      });
      await loadWeeklyReport({ silent: true });
    } catch (e) {
      console.error(e);
      const status = (e as { response?: { status?: number } })?.response?.status;
      setSaveFeedback({
        kind: 'error',
        title: "Échec de l'enregistrement",
        message:
          status === 404
            ? "Cet élève n'est plus assigné à votre compte (compte supprimé ou réassigné). Retournez à la liste des élèves."
            : "Une erreur est survenue lors de l'enregistrement du bilan. Veuillez réessayer.",
      });
    } finally {
      setSaving(false);
    }
  };

  const weeks = historyData?.data?.weeks ?? [];

  if (!studentId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Text style={styles.err}>Eleve non specifie.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!teacherId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Text style={styles.err}>Compte enseignant introuvable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarBtn} onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={GREEN} />
          <Text style={styles.topBarBack}>Eleves</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          Bilan hebdo
        </Text>
        <TouchableOpacity style={styles.topBarBtn} onPress={() => setHistoryOpen(true)} hitSlop={12}>
          <Ionicons name="time-outline" size={22} color={GREEN} />
        </TouchableOpacity>
      </View>

      {loadingReport ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={styles.muted}>Chargement du bilan...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.headerCard}>
            <View style={styles.strip} />
            <Text style={styles.h1}>Bilan hebdomadaire</Text>
            <View style={styles.badge}>
              <Ionicons name="person-outline" size={16} color={GREEN} />
              <Text style={styles.badgeText}>
                <Text style={styles.badgeMuted}>Eleve : </Text>
                <Text style={styles.badgeName}>{studentName}</Text>
              </Text>
            </View>
            <View style={styles.weekBox}>
              <Ionicons name="calendar-outline" size={18} color="#B45309" />
              <Text style={styles.weekText}>
                <Text style={styles.weekBold}>Semaine du </Text>
                {weekLabel}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Journees de cours</Text>
            {entries.map((entry, i) => (
              <View key={`entry-${i}`} style={styles.entryCard}>
                <View style={styles.entryHead}>
                  <Text style={styles.entryNum}>Jour {i + 1}</Text>
                  <TouchableOpacity onPress={() => removeEntry(i)} style={styles.removeBtn}>
                    <Ionicons name="close" size={20} color="#DC2626" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.fieldLabel}>Date</Text>
                <TouchableOpacity
                  style={styles.selectLike}
                  onPress={() => setPicker({ kind: 'date', index: i })}
                >
                  <Text style={entry.date ? styles.selectValue : styles.selectPlaceholder}>
                    {entry.date
                      ? validDates.find((d) => d.iso === entry.date)?.display ?? entry.date
                      : 'Choisir une date'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#6B7280" />
                </TouchableOpacity>
                {submitted && !entry.date ? (
                  <Text style={styles.fieldError}>Date requise</Text>
                ) : null}

                <Text style={styles.fieldLabel}>Duree</Text>
                <TouchableOpacity
                  style={styles.selectLike}
                  onPress={() => setPicker({ kind: 'duration', index: i })}
                >
                  <Text style={entry.duration ? styles.selectValue : styles.selectPlaceholder}>
                    {entry.duration || 'Choisir la duree'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#6B7280" />
                </TouchableOpacity>
                {submitted && !entry.duration ? (
                  <Text style={styles.fieldError}>Duree requise</Text>
                ) : null}

                <Text style={styles.fieldLabel}>Notes du jour</Text>
                <TextInput
                  style={styles.textarea}
                  placeholder="Contenu traite ce jour..."
                  placeholderTextColor="#9CA3AF"
                  value={entry.note}
                  onChangeText={(t) => updateEntry(i, { note: t })}
                  multiline
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.addBtn, entries.length >= validDates.length && styles.addBtnDisabled]}
              onPress={addEntry}
              disabled={entries.length >= validDates.length}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFF" />
              <Text style={styles.addBtnText}>Ajouter une journee</Text>
            </TouchableOpacity>
            {submitted && entries.length === 0 ? (
              <Text style={styles.fieldError}>Au moins une journee est requise.</Text>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Points positifs</Text>
            <TextInput
              style={styles.textareaLg}
              placeholder="Reussites, progres..."
              placeholderTextColor="#9CA3AF"
              value={positivePoints}
              onChangeText={setPositivePoints}
              multiline
            />
            {submitted && !positivePoints.trim() ? (
              <Text style={styles.fieldError}>Requis</Text>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Points a ameliorer</Text>
            <TextInput
              style={styles.textareaLg}
              placeholder="Defis, axes d'amelioration..."
              placeholderTextColor="#9CA3AF"
              value={negativePoints}
              onChangeText={setNegativePoints}
              multiline
            />
            {submitted && !negativePoints.trim() ? (
              <Text style={styles.fieldError}>Requis</Text>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes additionnelles (optionnel)</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Commentaires supplementaires..."
              placeholderTextColor="#9CA3AF"
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
              multiline
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
            onPress={onSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#FFF" />
                <Text style={styles.submitText}>Enregistrer le bilan</Text>
              </>
            )}
          </TouchableOpacity>

          {successMessage ? (
            <View style={styles.msgOk}>
              <Ionicons name="checkmark-circle" size={22} color="#059669" />
              <Text style={styles.msgOkText}>{successMessage}</Text>
            </View>
          ) : null}
          {errorMessage ? (
            <View style={styles.msgErr}>
              <Ionicons name="alert-circle" size={22} color="#DC2626" />
              <Text style={styles.msgErrText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setHistoryOpen(true)}
        activeOpacity={0.9}
        accessibilityLabel="Historique des rapports"
      >
        <Ionicons name="time-outline" size={26} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={historyOpen} transparent animationType="fade" onRequestClose={() => setHistoryOpen(false)}>
        <View style={styles.historyRoot}>
          <Pressable style={styles.historyBackdrop} onPress={() => setHistoryOpen(false)} />
          <SafeAreaView edges={['top', 'bottom']} style={styles.historyPanel}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Historique</Text>
              <TouchableOpacity onPress={() => setHistoryOpen(false)} style={styles.historyClose}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <Text style={styles.historySub}>Derniers mois</Text>
            {historyLoading ? (
              <View style={styles.historyLoading}>
                <ActivityIndicator size="large" color={ORANGE} />
                <Text style={styles.muted}>Chargement...</Text>
              </View>
            ) : historyData?.data ? (
              <ScrollView style={styles.historyList} contentContainerStyle={styles.historyScroll}>
                <View style={styles.historyStats}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statNum, { color: GREEN }]}>{historyData.data.totalWeeks}</Text>
                    <Text style={styles.statLbl}>Semaines</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statNum, { color: ORANGE }]}>{historyData.data.completedWeeks}</Text>
                    <Text style={styles.statLbl}>Completees</Text>
                  </View>
                </View>
                {weeks.map((w, idx) => (
                  <View
                    key={`${w.weekStart}-${idx}`}
                    style={[
                      styles.weekRow,
                      w.hasEntries && { borderLeftWidth: 4, borderLeftColor: w.completed ? ORANGE : GREEN },
                    ]}
                  >
                    <View
                      style={[
                        styles.weekIcon,
                        { backgroundColor: w.hasEntries ? GREEN : '#EF4444' },
                      ]}
                    >
                      <Ionicons name={w.hasEntries ? 'checkmark' : 'close'} size={16} color="#FFF" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.weekRowTitle} numberOfLines={2}>
                        Semaine du {w.weekStartFormatted}
                      </Text>
                      {w.hasEntries ? (
                        <Text style={styles.weekRowMeta}>
                          {w.entryCount} jour(s) {w.completed ? '· Complet' : ''}
                        </Text>
                      ) : (
                        <Text style={styles.weekRowEmpty}>Non rempli</Text>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.historyEmpty}>
                <Ionicons name="information-circle-outline" size={40} color="#9CA3AF" />
                <Text style={styles.muted}>Aucun historique</Text>
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setPicker(null)}>
          <Pressable style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pickerGrab} />
            <Text style={styles.pickerTitle}>
              {picker?.kind === 'date' ? 'Choisir une date' : 'Choisir la duree'}
            </Text>
            <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
              {picker?.kind === 'date'
                ? getAvailableDates(entries[picker.index]?.date ?? '').map((d) => (
                    <TouchableOpacity
                      key={d.iso}
                      style={styles.pickerRow}
                      onPress={() => onPickDate(picker.index, d.iso)}
                    >
                      <Text style={styles.pickerRowText}>{d.display}</Text>
                    </TouchableOpacity>
                  ))
                : durationOptions.map((dur) => (
                    <TouchableOpacity
                      key={dur}
                      style={styles.pickerRow}
                      onPress={() => picker && onPickDuration(picker.index, dur)}
                    >
                      <Text style={styles.pickerRowText}>{dur}</Text>
                    </TouchableOpacity>
                  ))}
            </ScrollView>
            <TouchableOpacity style={styles.pickerCancel} onPress={() => setPicker(null)}>
              <Text style={styles.pickerCancelText}>Annuler</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={saveFeedback !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveFeedback(null)}
      >
        <Pressable style={styles.feedbackOverlay} onPress={() => setSaveFeedback(null)}>
          <Pressable style={styles.feedbackCard} onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.feedbackStrip,
                { backgroundColor: saveFeedback?.kind === 'success' ? GREEN : '#DC2626' },
              ]}
            />
            <View
              style={[
                styles.feedbackIconWrap,
                { backgroundColor: saveFeedback?.kind === 'success' ? '#D1FAE5' : '#FEE2E2' },
              ]}
            >
              <Ionicons
                name={saveFeedback?.kind === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={40}
                color={saveFeedback?.kind === 'success' ? '#059669' : '#DC2626'}
              />
            </View>
            <Text style={styles.feedbackTitle}>{saveFeedback?.title}</Text>
            <Text style={styles.feedbackMessage}>{saveFeedback?.message}</Text>
            <TouchableOpacity
              style={[
                styles.feedbackBtn,
                { backgroundColor: saveFeedback?.kind === 'success' ? GREEN : '#DC2626' },
              ]}
              onPress={() => setSaveFeedback(null)}
            >
              <Text style={styles.feedbackBtnText}>Compris</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  topBarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 72 },
  topBarBack: { fontSize: 15, fontWeight: '600', color: GREEN },
  topBarTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#111827' },
  scroll: { padding: 16, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { marginTop: 8, color: '#6B7280', fontSize: 14 },
  err: { color: '#B91C1C', fontSize: 15, textAlign: 'center' },
  backBtn: { marginTop: 16, backgroundColor: GREEN, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  backBtnText: { color: '#FFF', fontWeight: '700' },
  headerCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  strip: { height: 4, borderRadius: 2, backgroundColor: GREEN, marginBottom: 12, marginHorizontal: -16 },
  h1: { fontSize: 22, fontWeight: '800', color: GREEN, marginBottom: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    marginBottom: 10,
  },
  badgeText: { flexShrink: 1 },
  badgeMuted: { fontSize: 13, color: '#6B7280' },
  badgeName: { fontSize: 13, fontWeight: '700', color: GREEN },
  weekBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  weekText: { flex: 1, fontSize: 13, color: '#92400E' },
  weekBold: { fontWeight: '700' },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: GREEN, marginBottom: 12 },
  entryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  entryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  entryNum: { fontSize: 14, fontWeight: '600', color: '#374151' },
  removeBtn: { padding: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  selectLike: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  selectValue: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  selectPlaceholder: { fontSize: 14, color: '#9CA3AF', flex: 1 },
  textarea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 72,
    textAlignVertical: 'top',
  },
  textareaLg: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  fieldError: { fontSize: 12, color: '#DC2626', marginBottom: 8, marginTop: -4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: GREEN,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  addBtnDisabled: { opacity: 0.45 },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ORANGE,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  msgOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  msgOkText: { flex: 1, color: '#065F46', fontWeight: '600', fontSize: 14 },
  msgErr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  msgErrText: { flex: 1, color: '#991B1B', fontWeight: '600', fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  historyRoot: { flex: 1 },
  historyBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  historyPanel: {
    flex: 1,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '86%',
    maxWidth: 360,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: GREEN,
  },
  historyTitle: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  historyClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historySub: { fontSize: 12, color: '#D1FAE5', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: GREEN },
  historyLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  historyList: { flex: 1 },
  historyScroll: { padding: 12, paddingBottom: 32 },
  historyStats: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLbl: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  weekIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  weekRowTitle: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  weekRowMeta: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  weekRowEmpty: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  historyEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  pickerGrab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginTop: 10,
    marginBottom: 8,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  pickerList: { maxHeight: 320 },
  pickerRow: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerRowText: { fontSize: 16, color: '#1F2937' },
  pickerCancel: { marginTop: 8, paddingVertical: 14, alignItems: 'center' },
  pickerCancelText: { fontSize: 16, fontWeight: '600', color: ORANGE },
  feedbackOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  feedbackCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    paddingBottom: 24,
    alignItems: 'center',
  },
  feedbackStrip: { height: 6, width: '100%' },
  feedbackIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  feedbackMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: '#4B5563',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  feedbackBtn: {
    minWidth: 160,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
  },
  feedbackBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
