import { forwardRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onChange, error, className, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    const formatPhoneNumber = (val: string) => {
      // Remove all non-digit characters
      const digits = val.replace(/\D/g, '');
      
      // Brazilian phone format: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
      if (digits.length <= 2) {
        return `(${digits}`;
      } else if (digits.length <= 6) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      } else if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
      } else {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const formattedValue = formatPhoneNumber(rawValue);
      
      // Only update if the new value is valid
      if (formattedValue.length <= 15) { // Max: (XX) XXXXX-XXXX
        onChange?.(formattedValue);
      }
    };

    const getPlainNumber = () => {
      // Get only digits for international format
      const digits = value.replace(/\D/g, '');
      return digits ? `+55${digits}` : '';
    };

    return (
      <div className="space-y-1">
        <div className="relative">
          <span className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-sm transition-colors",
            focused ? "text-primary" : "text-muted-foreground"
          )}>
            🇧🇷 +55
          </span>
          <Input
            ref={ref}
            type="tel"
            value={value}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="(11) 98765-4321"
            className={cn(
              "pl-20",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            data-phone-number={getPlainNumber()}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';