import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(dt: string): string {
  return new Date(dt).toLocaleString('vi-VN');
}

export function formatValue(value: number, unit: string): string {
  // Round to 1 decimal place to match hardware precision (avoids float noise like 25.500000953)
  const rounded    = Math.round(value * 10) / 10;
  const needsSpace = unit && /^[A-Za-z]/.test(unit);
  return `${rounded}${needsSpace ? ' ' : ''}${unit}`;
}
