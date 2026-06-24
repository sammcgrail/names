import { signal } from '@preact/signals';
import type { Sex, View } from './types';

export const view = signal<View>('global');
export const sex = signal<Sex>('C');

// alpha-2 country code currently focused (search box / globe click / map click)
export const selectedCountry = signal<string | null>(null);
// 2-letter US state currently focused
export const selectedState = signal<string | null>(null);

// US time scrubber
export const usYear = signal<number>(2024);
export const usPlaying = signal<boolean>(false);

// shared country search query string
export const query = signal<string>('');

export const SEX_LABEL: Record<Sex, string> = { M: 'Male', F: 'Female', C: 'Combined' };
