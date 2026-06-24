import { sex, SEX_LABEL } from '../state';
import type { Country, GlobalNames } from '../types';
import { fmtInt } from '../utils/format';
import { namesFor } from '../utils/names';
import { NameList } from './NameList';

export function CountryDrawer({
  country,
  global,
  onClose,
}: {
  country: Country;
  global: GlobalNames;
  onClose: () => void;
}) {
  const s = sex.value;
  const hasData = !!global[country.cca2];
  const names = namesFor(global, country.cca2, s, 20);

  return (
    <div class="drawer">
      <button class="close" aria-label="Close" onClick={onClose}>
        ✕
      </button>
      <div class="title">
        <span class="flag">{country.flag}</span>
        <div style={{ minWidth: 0 }}>
          <h3>{country.name}</h3>
          <div class="sub">
            {country.region}
            {country.capital ? ' · ' + country.capital : ''}
            {country.population ? ' · ' + fmtInt(country.population) + ' people' : ''}
          </div>
        </div>
      </div>
      {hasData ? (
        <>
          <div class="section-title" style="margin-top:14px">
            Top {SEX_LABEL[s].toLowerCase()} given names
          </div>
          <NameList names={names} />
          <p class="hint" style="margin-top:10px">
            Ranked by popularity. Click another country, the globe, or the map to compare.
          </p>
        </>
      ) : (
        <p class="hint" style="margin-top:14px">
          No name data available for {country.name} in the global dataset.
        </p>
      )}
    </div>
  );
}
