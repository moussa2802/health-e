import React, { useState, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { validateEmail } from '../../utils/emailValidation';

interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
}

const EmailInput: React.FC<EmailInputProps> = ({
  value,
  onChange,
  id,
  placeholder = 'votre@email.com',
  className = '',
  autoComplete = 'email',
  required,
  disabled,
}) => {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);

  const handleBlur = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setSuggestion(null);
      setFormatError(null);
      return;
    }
    const result = validateEmail(trimmed);
    if (!result.valid && result.error) {
      setFormatError(result.error);
      setSuggestion(null);
    } else if (result.suggestion) {
      setSuggestion(result.suggestion);
      setFormatError(null);
    } else {
      setSuggestion(null);
      setFormatError(null);
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    if (suggestion) setSuggestion(null);
    if (formatError) setFormatError(null);
  }, [onChange, suggestion, formatError]);

  const acceptSuggestion = useCallback(() => {
    if (suggestion) {
      onChange(suggestion);
      setSuggestion(null);
    }
  }, [suggestion, onChange]);

  return (
    <div>
      <input
        id={id}
        type="email"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
      />
      {formatError && (
        <div className="flex items-center gap-1.5 mt-1.5 text-danger">
          <AlertCircle size={13} className="flex-shrink-0" />
          <span className="text-xs">{formatError}</span>
        </div>
      )}
      {suggestion && (
        <div className="mt-1.5 px-3 py-2 rounded-lg bg-warm-amber/10 border border-warm-amber/20">
          <p className="text-xs text-ink-soft m-0">
            Vouliez-vous dire{' '}
            <button
              type="button"
              onClick={acceptSuggestion}
              className="font-semibold text-accent hover:underline bg-transparent border-none cursor-pointer p-0 text-xs"
            >
              {suggestion}
            </button>
            {' '}?
          </p>
        </div>
      )}
    </div>
  );
};

export default EmailInput;
