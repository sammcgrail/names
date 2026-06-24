export type Sex = 'M' | 'F' | 'C';
export type View = 'global' | 'us' | 'globe';

export interface USNational {
  minYear: number;
  maxYear: number;
  years: number[];
  totals: { M: Record<string, number>; F: Record<string, number> };
  rankByYear: {
    M: Record<string, [string, number][]>;
    F: Record<string, [string, number][]>;
  };
}

export type NameSeries = Record<string, Record<string, number>>; // name -> {year: count}
export interface USNameSeries {
  M: NameSeries;
  F: NameSeries;
}

export interface USStates {
  minYear: number;
  maxYear: number;
  states: string[];
  totals: { M: Record<string, Record<string, number>>; F: Record<string, Record<string, number>> };
  top: {
    M: Record<string, Record<string, [string, number][]>>; // state -> year -> [name,count][]
    F: Record<string, Record<string, [string, number][]>>;
  };
}

export type GlobalNames = Record<string, { M: string[]; F: string[] }>; // alpha2 -> lists

export interface Country {
  cca2: string;
  cca3: string;
  ccn3: string;
  name: string;
  flag: string;
  region: string;
  subregion: string;
  capital: string;
  latlng: [number, number];
  population?: number;
}

export interface Meta {
  generated: string;
  sources: { name: string; scope: string; license: string; [k: string]: unknown }[];
  usNationalYears: [number, number];
  usStateYears: [number, number];
  globalCountryCount: number;
}
