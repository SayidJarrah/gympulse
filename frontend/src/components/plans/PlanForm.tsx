import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import type { MembershipPlanRequest } from '../../types/membershipPlan'

const planFormSchema = z.object({
  name: z.string().min(1, 'Plan name must not be blank.'),
  description: z.string().min(1, 'Description must not be blank.'),
  priceInCents: z
    .number({ invalid_type_error: 'Price must be greater than zero.' })
    .int('Price must be a whole number.')
    .min(1, 'Price must be greater than zero.'),
  durationDays: z
    .number({ invalid_type_error: 'Duration must be at least one day.' })
    .int('Duration must be a whole number.')
    .min(1, 'Duration must be at least one day.'),
})

type PlanFormValues = z.infer<typeof planFormSchema>

interface PlanFormProps {
  initialValues?: MembershipPlanRequest;
  onSubmit: (req: MembershipPlanRequest) => Promise<void>;
  isLoading: boolean;
  serverError: string | null;
  /** Field-level server error keyed by field name. Used when backend returns INVALID_PRICE etc. */
  fieldErrors?: Partial<Record<keyof MembershipPlanRequest, string>>;
  formId: string;
}

export function PlanForm({
  initialValues,
  onSubmit,
  isLoading,
  serverError,
  fieldErrors,
  formId,
}: PlanFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: initialValues
      ? {
          name: initialValues.name,
          description: initialValues.description,
          priceInCents: initialValues.priceInCents,
          durationDays: initialValues.durationDays,
        }
      : undefined,
  })

  // Reset form when initialValues change (e.g., switching between edit targets)
  useEffect(() => {
    if (initialValues) {
      reset({
        name: initialValues.name,
        description: initialValues.description,
        priceInCents: initialValues.priceInCents,
        durationDays: initialValues.durationDays,
      })
    } else {
      reset({ name: '', description: '', priceInCents: undefined, durationDays: undefined })
    }
  }, [initialValues, reset])

  // Propagate field-level server errors into react-hook-form
  useEffect(() => {
    if (fieldErrors) {
      if (fieldErrors.name) setError('name', { message: fieldErrors.name })
      if (fieldErrors.description) setError('description', { message: fieldErrors.description })
      if (fieldErrors.priceInCents) setError('priceInCents', { message: fieldErrors.priceInCents })
      if (fieldErrors.durationDays) setError('durationDays', { message: fieldErrors.durationDays })
    }
  }, [fieldErrors, setError])

  const handleFormSubmit = handleSubmit(async (values) => {
    await onSubmit({
      name: values.name,
      description: values.description,
      priceInCents: values.priceInCents,
      durationDays: values.durationDays,
    })
  })

  return (
    <form id={formId} onSubmit={handleFormSubmit} className="flex flex-col gap-5" noValidate>
      {/* Name field */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="plan-name" className="text-sm font-semibold text-gray-300">
          Plan Name
        </label>
        <input
          id="plan-name"
          type="text"
          placeholder="e.g. Monthly Basic"
          disabled={isLoading}
          className={`w-full rounded-md border bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-60 ${
            errors.name
              ? 'border-red-500/60 focus-visible:ring-red-500'
              : 'border-gray-700 focus-visible:ring-green-500'
          }`}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'plan-name-error' : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p id="plan-name-error" className="text-xs text-red-400" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Description field */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="plan-description" className="text-sm font-semibold text-gray-300">
          Description
        </label>
        <textarea
          id="plan-description"
          rows={3}
          placeholder="Describe what is included in this plan."
          disabled={isLoading}
          className={`w-full resize-none rounded-md border bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-60 ${
            errors.description
              ? 'border-red-500/60 focus-visible:ring-red-500'
              : 'border-gray-700 focus-visible:ring-green-500'
          }`}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'plan-description-error' : undefined}
          {...register('description')}
        />
        {errors.description && (
          <p id="plan-description-error" className="text-xs text-red-400" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Price and Duration side by side on sm+ screens */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Price field */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="plan-price" className="text-sm font-semibold text-gray-300">
            Price (in cents)
          </label>
          <input
            id="plan-price"
            type="number"
            min={1}
            placeholder="2999"
            disabled={isLoading}
            className={`w-full rounded-md border bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-60 ${
              errors.priceInCents
                ? 'border-red-500/60 focus-visible:ring-red-500'
                : 'border-gray-700 focus-visible:ring-green-500'
            }`}
            aria-invalid={!!errors.priceInCents}
            aria-describedby="plan-price-helper plan-price-error"
            {...register('priceInCents', { valueAsNumber: true })}
          />
          <p id="plan-price-helper" className="text-xs text-gray-400">
            e.g. 2999 for $29.99
          </p>
          {errors.priceInCents && (
            <p id="plan-price-error" className="text-xs text-red-400" role="alert">
              {errors.priceInCents.message}
            </p>
          )}
        </div>

        {/* Duration field */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="plan-duration" className="text-sm font-semibold text-gray-300">
            Duration (days)
          </label>
          <input
            id="plan-duration"
            type="number"
            min={1}
            placeholder="30"
            disabled={isLoading}
            className={`w-full rounded-md border bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-60 ${
              errors.durationDays
                ? 'border-red-500/60 focus-visible:ring-red-500'
                : 'border-gray-700 focus-visible:ring-green-500'
            }`}
            aria-invalid={!!errors.durationDays}
            aria-describedby="plan-duration-helper plan-duration-error"
            {...register('durationDays', { valueAsNumber: true })}
          />
          <p id="plan-duration-helper" className="text-xs text-gray-400">
            Number of days the membership is valid.
          </p>
          {errors.durationDays && (
            <p id="plan-duration-error" className="text-xs text-red-400" role="alert">
              {errors.durationDays.message}
            </p>
          )}
        </div>
      </div>

      {/* Server-side inline error banner (non-field errors like PLAN_HAS_ACTIVE_SUBSCRIBERS) */}
      {serverError && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {serverError}
        </div>
      )}
    </form>
  )
}
