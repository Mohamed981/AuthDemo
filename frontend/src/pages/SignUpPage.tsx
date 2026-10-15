import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { type SignUpValues, signUpSchema } from '../auth/schemas';
import { AuthCard } from '../components/AuthCard';
import { FormField } from '../components/FormField';
import { userFacingError } from '../lib/errorMessage';

export function SignUpPage() {
  const { signUp } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema), mode: 'onTouched' });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await signUp(values);
    } catch (error) {
      setServerError(userFacingError(error, 'sign up'));
    }
  });

  return (
    <AuthCard
      title="Create an account"
      subtitle="It takes less than a minute."
      footer={
        <>
          Already have an account? <Link to="/signin">Sign in</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        {serverError && (
          <div className="form-error" role="alert">
            {serverError}
          </div>
        )}
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormField
          label="Name"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters, with a letter, a number and a special character."
          error={errors.password?.message}
          {...register('password')}
        />
        <button type="submit" className="button" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
    </AuthCard>
  );
}
