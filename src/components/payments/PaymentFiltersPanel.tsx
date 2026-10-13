import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  PAYMENT_FILTER_MONTHS,
  PAYMENT_FILTER_YEARS,
  PAYMENT_STATUS_FILTER_OPTIONS,
} from '../../constants/payment-filters';
import type { PaymentStatus } from '../../types/finance.types';
import type { ParentChild } from '../../types/parent.types';
import { FilterSelect } from '../filters/FilterSelect';

const GREEN = '#274e2b';

type BaseProps = {
  status: PaymentStatus | undefined;
  month: number | undefined;
  year: number | undefined;
  onStatusChange: (value: PaymentStatus | undefined) => void;
  onMonthChange: (value: number | undefined) => void;
  onYearChange: (value: number | undefined) => void;
  onReset: () => void;
};

type ParentProps = BaseProps & {
  variant: 'parent';
  students: ParentChild[];
  studentId: string | undefined;
  onStudentChange: (value: string | undefined) => void;
};

type TeacherProps = BaseProps & {
  variant: 'teacher';
};

export type PaymentFiltersPanelProps = ParentProps | TeacherProps;

export function PaymentFiltersPanel(props: PaymentFiltersPanelProps) {
  const monthOptions = useMemo(
    () => [
      { value: undefined as number | undefined, label: 'Tous les mois' },
      ...PAYMENT_FILTER_MONTHS.map((item) => ({ value: item.value, label: item.label })),
    ],
    []
  );

  const yearOptions = useMemo(
    () => [
      { value: undefined as number | undefined, label: 'Toutes les années' },
      ...PAYMENT_FILTER_YEARS.map((item) => ({ value: item, label: String(item) })),
    ],
    []
  );

  const studentOptions = useMemo(() => {
    if (props.variant !== 'parent') return [];
    return [
      { value: undefined as string | undefined, label: 'Tous les élèves' },
      ...props.students.map((child) => ({
        value: child.id,
        label: `${child.firstName} ${child.lastName}`.trim(),
      })),
    ];
  }, [props]);

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <Text style={styles.title}>Filtres</Text>
        <TouchableOpacity onPress={props.onReset} hitSlop={8}>
          <Text style={styles.reset}>Réinitialiser</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {props.variant === 'parent' ? (
          <FilterSelect
            label="Élève"
            value={props.studentId}
            options={studentOptions}
            onChange={props.onStudentChange}
          />
        ) : null}

        <FilterSelect
          label="Statut"
          value={props.status}
          options={PAYMENT_STATUS_FILTER_OPTIONS}
          onChange={props.onStatusChange}
        />

        <FilterSelect
          label="Mois"
          value={props.month}
          options={monthOptions}
          onChange={props.onMonthChange}
        />

        <FilterSelect
          label="Année"
          value={props.year}
          options={yearOptions}
          onChange={props.onYearChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontWeight: '800', color: GREEN, fontSize: 15 },
  reset: { fontWeight: '700', color: '#c45221', fontSize: 13 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
