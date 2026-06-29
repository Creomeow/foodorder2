import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { api, apiError } from '../lib/api';
import { useAuth } from '../store/auth';
import { Button, Input, Field } from '../components/ui';

interface Form {
  email: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuth((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Form>({ defaultValues: { email: '', password: '' } });

  const onSubmit = async (values: Form) => {
    setError(null);
    try {
      const { data } = await api.post('/auth/login', values);
      setAuth(data);
      navigate('/', { replace: true });
    } catch (err) {
      setError(apiError(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-2xl text-white">
            🍽️
          </div>
          <h1 className="text-xl font-bold">Restaurant Admin</h1>
          <p className="text-sm text-gray-500">Sign in to manage your outlets</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Email">
            <Input type="email" autoComplete="username" {...register('email')} />
          </Field>
          <Field label="Password">
            <Input type="password" autoComplete="current-password" {...register('password')} />
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-gray-400">
          Demo: superadmin@foodorder.dev / Admin123!
        </p>
      </div>
    </div>
  );
}
