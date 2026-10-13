import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { agencyService, type AgencyItem } from '../../../src/services/agency.service';
import { useAuthStore } from '../../../src/stores/authStore';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
}

interface HelpCategory {
  id: string;
  name: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  description: string;
  articles: HelpArticle[];
}

const CATEGORIES: HelpCategory[] = [
  {
    id: 'children',
    name: 'Gestion des Enfants',
    icon: 'people-outline',
    description: 'Gerez les informations de vos enfants',
    articles: [
      {
        id: 'view-children',
        title: 'Consulter la liste de vos enfants',
        content:
          'Dans la section Enfants, vous pouvez voir tous vos enfants inscrits et leurs informations principales.',
        category: 'children',
        tags: ['enfants', 'liste', 'consultation'],
      },
      {
        id: 'children-details',
        title: "Voir les details d'un enfant",
        content:
          "Cliquez sur un enfant pour voir ses informations detaillees, ses rapports et ses elements associes.",
        category: 'children',
        tags: ['enfant', 'details', 'informations'],
      },
    ],
  },
  {
    id: 'reports',
    name: 'Rapports',
    icon: 'bar-chart-outline',
    description: 'Consultez les rapports de vos enfants',
    articles: [
      {
        id: 'view-reports',
        title: 'Consulter les rapports de vos enfants',
        content:
          'Les rapports mensuels sont disponibles dans Rapports, avec filtres par enfant, mois et annee.',
        category: 'reports',
        tags: ['rapport', 'enfant', 'consultation'],
      },
      {
        id: 'download-report',
        title: 'Telecharger un rapport',
        content:
          "Ouvrez un rapport puis utilisez l'action de telechargement pour recuperer le PDF.",
        category: 'reports',
        tags: ['rapport', 'telechargement', 'pdf'],
      },
    ],
  },
  {
    id: 'payments',
    name: 'Paiements',
    icon: 'wallet-outline',
    description: 'Factures et Mobile Money',
    articles: [
      {
        id: 'make-payment',
        title: 'Effectuer un paiement',
        content:
          'Dans Paiements, ouvrez une facture puis cliquez sur « Payer par Mobile Money ». Renseignez l’opérateur, le numéro (9 chiffres sans +237) et le montant. Après validation, vérifiez votre téléphone pour confirmer la demande. Vous pouvez payer en plusieurs fois.',
        category: 'payments',
        tags: ['paiement', 'facture', 'mobile money'],
      },
      {
        id: 'payment-history',
        title: 'Consulter l’historique des paiements',
        content:
          'L’onglet Historique dans Paiements liste vos versements dans l’ordre d’exécution, Mobile Money ou saisie manuelle.',
        category: 'payments',
        tags: ['paiement', 'historique'],
      },
    ],
  },
];

export default function ParentHelpScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const scrollRef = useRef<ScrollView>(null);
  const [agenciesSectionY, setAgenciesSectionY] = useState(0);

  const [agencies, setAgencies] = useState<AgencyItem[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  useEffect(() => {
    const loadUserAgencies = async () => {
      if (!user?.id) return;
      setLoadingAgencies(true);
      try {
        const result = await agencyService.getAllUserAgencywithdetails(user.id);
        setAgencies(result);
      } catch (err) {
        console.error('agencies help', err);
        setAgencies([]);
      } finally {
        setLoadingAgencies(false);
      }
    };
    loadUserAgencies();
  }, [user?.id]);

  const filteredArticles = useMemo(() => {
    if (selectedCategory) {
      const category = CATEGORIES.find((c) => c.id === selectedCategory);
      return category ? [...category.articles] : [];
    }
    return CATEGORIES.flatMap((c) => c.articles);
  }, [selectedCategory]);

  const resetBrowse = () => {
    setSelectedCategory('');
    setSelectedArticle(null);
  };

  const goBack = () => {
    if (selectedArticle) {
      setSelectedArticle(null);
      return;
    }
    if (selectedCategory) {
      setSelectedCategory('');
      return;
    }
    router.push('/(app)/(parent)' as any);
  };

  const selectedCategoryName =
    CATEGORIES.find((c) => c.id === selectedCategory)?.name || '';

  const scrollToAgencies = () => {
    scrollRef.current?.scrollTo({ y: agenciesSectionY, animated: true });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.pageDescription}>
            Parcourez les thèmes ci-dessous pour lire les guides, puis contactez vos agences en bas de page si besoin.
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerBtn, styles.headerPrimaryBtn]}
              onPress={scrollToAgencies}
              disabled={agencies.length === 0}
            >
              <Ionicons name="business-outline" size={16} color="#FFF" />
              <Text style={styles.headerPrimaryText}>Contacter l&apos;agence</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, styles.headerSecondaryBtn]}
              onPress={() => router.push('/(app)/(parent)' as any)}
            >
              <Text style={styles.headerSecondaryText}>Retour</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.filterHint}>Filtrer par thème</Text>
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chips}>
                <FilterChip
                  label="Toutes les categories"
                  active={!selectedCategory}
                  onPress={() => {
                    setSelectedCategory('');
                    setSelectedArticle(null);
                  }}
                />
                {CATEGORIES.map((category) => (
                  <FilterChip
                    key={category.id}
                    label={category.name}
                    active={selectedCategory === category.id}
                    onPress={() => {
                      setSelectedCategory(category.id);
                      setSelectedArticle(null);
                    }}
                  />
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.clearBtn} onPress={resetBrowse}>
              <Text style={styles.clearBtnText}>Réinitialiser</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!selectedArticle ? (
          <>
            {!selectedCategory ? (
              <View style={styles.grid}>
                {CATEGORIES.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.categoryCard}
                    activeOpacity={0.9}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryIcon}>
                        <Ionicons name={category.icon} size={20} color="#FFF" />
                      </View>
                      <Text style={styles.categoryName}>{category.name}</Text>
                    </View>
                    <Text style={styles.categoryDesc}>{category.description}</Text>
                    <View style={styles.categoryFooter}>
                      <Text style={styles.categoryCount}>
                        {category.articles.length} articles
                      </Text>
                      <Ionicons name="arrow-forward" size={14} color="#c45221" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <TouchableOpacity onPress={goBack}>
                    <Ionicons name="arrow-back" size={20} color="#6B7280" />
                  </TouchableOpacity>
                  <Text style={styles.sectionTitle}>{selectedCategoryName}</Text>
                </View>
                <View style={styles.articleList}>
                  {filteredArticles.map((article) => (
                    <TouchableOpacity
                      key={article.id}
                      style={styles.articleCard}
                      onPress={() => setSelectedArticle(article)}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.articleTitle}>{article.title}</Text>
                      <Text style={styles.articleExcerpt} numberOfLines={3}>
                        {article.content}
                      </Text>
                      <View style={styles.tagRow}>
                        {article.tags.map((tag) => (
                          <Text key={`${article.id}-${tag}`} style={styles.tag}>
                            {tag}
                          </Text>
                        ))}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <TouchableOpacity onPress={goBack}>
                <Ionicons name="arrow-back" size={20} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>{selectedArticle.title}</Text>
            </View>
            <Text style={styles.articleDetail}>{selectedArticle.content}</Text>
          </View>
        )}

        <View
          style={styles.agencySection}
          onLayout={(event) => setAgenciesSectionY(event.nativeEvent.layout.y)}
        >
          <View style={styles.agencyHeader}>
            <View style={styles.agencyIconWrap}>
              <Ionicons name="business-outline" size={24} color="#FFF" />
            </View>
            <View>
              <Text style={styles.agencyTitle}>Vos agences</Text>
              <Text style={styles.agencySubtitle}>
                Informations de contact de vos agences
              </Text>
            </View>
          </View>

          {loadingAgencies ? (
            <View style={styles.agencyState}>
              <ActivityIndicator size="large" color="#FFF" />
              <Text style={styles.agencyStateText}>Chargement des agences...</Text>
            </View>
          ) : agencies.length === 0 ? (
            <View style={styles.agencyState}>
              <Ionicons name="business-outline" size={36} color="#D1FAE5" />
              <Text style={styles.agencyStateText}>Aucune agence associee</Text>
            </View>
          ) : (
            <View style={styles.agencyList}>
              {agencies.map((agency, index) => (
                <View key={agency.id || `${agency.name}-${index}`} style={styles.agencyCard}>
                  <Text style={styles.agencyCardTitle}>{agency.name || 'Agence'}</Text>
                  {!!agency.description && (
                    <Text style={styles.agencyCardDesc}>{agency.description}</Text>
                  )}
                  {!!agency.address && (
                    <View style={styles.agencyRow}>
                      <Ionicons name="location-outline" size={15} color="#FFF" />
                      <Text style={styles.agencyText}>{agency.address}</Text>
                    </View>
                  )}
                  {!!agency.phone && (
                    <TouchableOpacity
                      style={styles.agencyRow}
                      onPress={() => Linking.openURL(`tel:${agency.phone}`).catch(() => {})}
                    >
                      <Ionicons name="call-outline" size={15} color="#FFF" />
                      <Text style={styles.agencyText}>{agency.phone}</Text>
                    </TouchableOpacity>
                  )}
                  {!!agency.manager && (
                    <View style={styles.agencyRow}>
                      <Ionicons name="person-outline" size={15} color="#FFF" />
                      <Text style={styles.agencyText}>Manager: {agency.manager}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 14,
  },
  pageDescription: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    color: '#4B5563',
  },
  headerActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  headerBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerPrimaryBtn: {
    backgroundColor: '#274e2b',
    opacity: 1,
  },
  headerPrimaryText: {
    color: '#FFF',
    fontWeight: '600',
  },
  headerSecondaryBtn: {
    backgroundColor: '#6B7280',
  },
  headerSecondaryText: {
    color: '#FFF',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 14,
  },
  filterHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  filterRow: {
    marginTop: 4,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
  },
  chipActive: {
    backgroundColor: '#274e2b',
    borderColor: '#274e2b',
  },
  chipText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFF',
  },
  clearBtn: {
    marginTop: 8,
    alignSelf: 'flex-end',
    backgroundColor: '#6B7280',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  clearBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
  grid: {
    gap: 10,
    marginBottom: 14,
  },
  categoryCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#274e2b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  categoryDesc: {
    color: '#6B7280',
    marginBottom: 10,
  },
  categoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryCount: {
    color: '#c45221',
    fontWeight: '600',
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  articleList: {
    gap: 8,
  },
  articleCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  articleExcerpt: {
    color: '#4B5563',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#274e2b',
    color: '#FFF',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    overflow: 'hidden',
  },
  articleDetail: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 22,
  },
  agencySection: {
    marginTop: 4,
    backgroundColor: '#274e2b',
    borderRadius: 16,
    padding: 14,
  },
  agencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  agencyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agencyTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
  },
  agencySubtitle: {
    color: '#D1FAE5',
    fontSize: 12,
  },
  agencyState: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  agencyStateText: {
    color: '#FFF',
    marginTop: 8,
  },
  agencyList: {
    gap: 10,
  },
  agencyCard: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    padding: 12,
  },
  agencyCardTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  agencyCardDesc: {
    color: '#ECFDF5',
    marginBottom: 8,
  },
  agencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
  },
  agencyText: {
    color: '#FFF',
    flex: 1,
  },
});
