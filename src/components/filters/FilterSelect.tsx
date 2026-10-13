import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const GREEN = '#274e2b';

export type FilterSelectOption<T> = {
  value: T;
  label: string;
};

type FilterSelectProps<T> = {
  label: string;
  value: T | undefined;
  options: FilterSelectOption<T | undefined>[];
  placeholder?: string;
  onChange: (value: T | undefined) => void;
};

function valuesEqual<T>(a: T | undefined, b: T | undefined): boolean {
  return a === b;
}

export function FilterSelect<T>({
  label,
  value,
  options,
  placeholder = 'Tous',
  onChange,
}: FilterSelectProps<T>) {
  const [open, setOpen] = useState(false);

  const displayLabel = useMemo(() => {
    const match = options.find((option) => valuesEqual(option.value, value));
    if (match) return match.label;
    return placeholder;
  }, [options, placeholder, value]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.triggerText} numberOfLines={1}>
          {displayLabel}
        </Text>
        <Ionicons name="chevron-down" size={18} color={GREEN} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView style={styles.optionsList} keyboardShouldPersistTaps="handled">
              {options.map((option, index) => {
                const selected = valuesEqual(option.value, value);
                return (
                  <TouchableOpacity
                    key={`${String(option.value)}-${index}`}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {option.label}
                    </Text>
                    {selected ? <Ionicons name="checkmark" size={18} color={GREEN} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
              <Text style={styles.closeBtnText}>Fermer</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minWidth: '47%' },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 2,
    borderColor: GREEN,
    borderRadius: 12,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  triggerText: {
    flex: 1,
    color: '#111827',
    fontWeight: '600',
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 36, 18, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '70%',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: GREEN,
    marginBottom: 12,
    textAlign: 'center',
  },
  optionsList: { maxHeight: 320 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  optionSelected: { backgroundColor: '#ECFDF5' },
  optionText: { color: '#374151', fontWeight: '600', fontSize: 15, flex: 1 },
  optionTextSelected: { color: GREEN, fontWeight: '800' },
  closeBtn: {
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: { fontWeight: '700', color: '#374151' },
});
