import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { type SignInValues, signInSchema } from '../auth/schemas';
import { AuthCard } from '../components/AuthCard';
import { FormField } from '../components/FormField';
import { userFacingError } from '../lib/errorMessage';

export function SignInPage() {
  const { signIn } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema), mode: 'onTouched' });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await signIn(values);
    } catch (error) {
      setServerError(userFacingError(error, 'sign in'));
    }
  });

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue."
      footer={
        <>
          New here? <Link to="/signup">Create an account</Link>
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
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <button type="submit" className="button" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthCard>
  );
}
