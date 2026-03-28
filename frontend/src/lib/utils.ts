import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(dt: string): string {
  return new Date(dt).toLocaleString('vi-VN');
}

export function formatValue(value: number, unit: string): string {
  // Pad unit with a space only when it's a word unit (e.g. "Lux"), not a symbol
  const needsSpace = unit && /^[A-Za-z]/.test(unit);
  return `${value}${needsSpace ? ' ' : ''}${unit}`;
}
