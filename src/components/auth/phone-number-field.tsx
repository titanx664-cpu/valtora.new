import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { countryForCode, supportedCountries } from '@/lib/phone.ts';

type PhoneNumberFieldProps = {
  countryCode: string;
  number: string;
  onCountryChange: (countryCode: string) => void;
  onNumberChange: (number: string) => void;
};

export function PhoneNumberField({ countryCode, number, onCountryChange, onNumberChange }: PhoneNumberFieldProps) {
  const country = countryForCode(countryCode) ?? supportedCountries[0];

  return (
    <div className="space-y-2">
      <Label htmlFor="phone-number">Phone Number</Label>
      <div className="flex min-w-0 gap-2">
        <select
          aria-label="Country and calling code"
          className="h-9 w-[10.5rem] shrink-0 rounded-md border border-input bg-input px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          value={country.code}
          onChange={(event) => onCountryChange(event.target.value)}
        >
          {supportedCountries.map((option) => (
            <option key={option.code} value={option.code}>
              {option.flag} {option.name} (+{option.callingCode})
            </option>
          ))}
        </select>
        <Input
          id="phone-number"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={country.code === 'PK' ? '300 1234567' : 'Phone number'}
          value={number}
          onChange={(event) => onNumberChange(event.target.value)}
          required
          className="min-w-0 bg-input"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {country.flag} +{country.callingCode} is added automatically.
      </p>
    </div>
  );
}
