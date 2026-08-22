/**
 * Data standardization and formatting utilities for Masonic Member records
 */

export const formatFullName = (value: string): string => {
  return value.toUpperCase();
};

export const cleanFullName = (value: string): string => {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
};

export const formatCIM = (value: string): string => {
  return value.replace(/[^0-9A-Za-z]/g, '').trim().toUpperCase();
};

export const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export const formatEmail = (value: string): string => {
  return value.trim().toLowerCase();
};

export const formatDisplayDate = (value?: string): string => {
  if (!value) return '---';
  const clean = value.trim();
  if (!clean) return '---';
  if (clean.includes('-')) {
    const parts = clean.split('T')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      if (year.length === 4) {
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
    }
  }
  return clean;
};
