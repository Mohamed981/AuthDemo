import { type InputHTMLAttributes, forwardRef, useId } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, hint, ...inputProps }, ref) => {
    const id = useId();
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {error ? (
          <p id={`${id}-error`} className="field-error" role="alert">
            {error}
          </p>
        ) : hint ? (
          <p id={`${id}-hint`} className="field-hint">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
FormField.displayName = 'FormField';
