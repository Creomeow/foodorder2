'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { api, apiError } from '../../lib/api';
import { useSession } from '../../store/session';
import { Button } from '../../components/ui';

interface Form {
  name: string;
  phone: string;
}

function TakeawayForm() {
  const router = useRouter();
  const params = useSearchParams();
  const restaurantId = params.get('r') ?? process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_ID ?? '';
  const setTakeaway = useSession((s) => s.setTakeaway);
  const setCustomer = useSession((s) => s.setCustomer);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>();

  const onSubmit = async (values: Form) => {
    setError(null);
    if (!restaurantId) {
      setError('No outlet selected. Open the takeaway link for a specific outlet.');
      return;
    }
    try {
      const { data } = await api.get(`/public/outlet/${restaurantId}/menu`);
      setTakeaway(restaurantId, data.restaurant.name);
      setCustomer(values.name, values.phone);
      router.push('/welcome');
    } catch (err) {
      setError(apiError(err));
    }
  };

  return (
    <div className="flex min-h-screen flex-col px-6 py-10">
      <button onClick={() => router.push('/')} className="mb-6 text-sm text-gray-400">
        ← Back
      </button>
      <h1 className="text-2xl font-bold">Takeaway order</h1>
      <p className="mt-1 text-sm text-gray-500">We&apos;ll text your order number to this number.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
            placeholder="Your name"
            {...register('name', { required: 'Name is required' })}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Phone number</label>
          <input
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand focus:outline-none"
            placeholder="+65 …"
            inputMode="tel"
            {...register('phone', { required: 'Phone is required' })}
          />
          {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Loading menu…' : 'Browse menu'}
        </Button>
      </form>
    </div>
  );
}

export default function Takeaway() {
  return (
    <Suspense>
      <TakeawayForm />
    </Suspense>
  );
}
