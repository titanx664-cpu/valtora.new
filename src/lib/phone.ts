import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min';

export type SupportedCountry = {
  code: CountryCode;
  name: string;
  flag: string;
  callingCode: string;
};

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });

function flagForCountry(countryCode: CountryCode): string {
  return String.fromCodePoint(...[...countryCode].map((letter) => 127397 + letter.charCodeAt(0)));
}

// libphonenumber-js provides the dialing metadata and country validation. PK
// is deliberately first so Pakistan (+92) remains the default after refresh.
export const supportedCountries: readonly SupportedCountry[] = getCountries()
  .map((code) => ({
    code,
    name: countryNames.of(code) ?? code,
    flag: flagForCountry(code),
    callingCode: getCountryCallingCode(code),
  }))
  .sort((left, right) => (left.code === 'PK' ? -1 : right.code === 'PK' ? 1 : left.name.localeCompare(right.name)));

export function countryForCode(code: string): SupportedCountry | undefined {
  return supportedCountries.find((country) => country.code === code);
}

export function normalizePhoneNumber(countryCode: string, input: string): string | null {
  const country = countryForCode(countryCode);
  if (!country) return null;

  const value = input.trim();
  const phone = value.startsWith('+')
    ? parsePhoneNumberFromString(value)
    : parsePhoneNumberFromString(value, country.code);

  return phone?.country === country.code && phone.isValid() ? phone.number : null;
}
