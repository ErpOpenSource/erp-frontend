import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import client from '@/api/client'
import { Loader2, User, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Schemas Zod ───────────────────────────────────────────
const profileSchema = z.object({
  username:   z.string().min(3, 'Mínimo 3 caracteres'),
  email:      z.string().email('Email inválido'),
  department: z.string().optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Introduce tu contraseña actual'),
  newPassword:     z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})

type ProfileForm   = z.infer<typeof profileSchema>
type PasswordForm  = z.infer<typeof passwordSchema>

// ── Página principal ──────────────────────────────────────
export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-400 mt-0.5">Gestiona tu información personal y credenciales</p>
      </div>

      {/* Avatar + info básica */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {user?.username?.slice(0, 2).toUpperCase() ?? 'U'}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{user?.username}</p>
          <p className="text-sm text-gray-400">{user?.roles?.join(', ')}</p>
          <p className="text-xs text-gray-300 mt-0.5">{user?.departments?.join(', ')}</p>
        </div>
      </div>

      <ProfileForm userId={user?.id} />
      <PasswordForm />
    </div>
  )
}

// ── Formulario de datos personales ────────────────────────
function ProfileForm({ userId }: { userId?: string }) {
  const queryClient = useQueryClient()
  const setAuth     = useAuthStore((s) => s.setAuth)
  const [saved, setSaved] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data } = await client.get('/auth/users/me')
      return data.data ?? data
    },
    enabled: !!userId,
  })

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      username:   profile?.username ?? '',
      email:      profile?.email ?? '',
      department: profile?.departments?.[0] ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const { data: res } = await client.put('/auth/users/me', data)
      return res
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-center h-40">
        <Loader2 size={18} className="animate-spin text-gray-200" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <User size={15} className="text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700">Datos personales</h2>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Field label="Usuario" error={errors.username?.message}>
          <input {...register('username')} className={inputClass(!!errors.username)} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input {...register('email')} type="email" className={inputClass(!!errors.email)} />
        </Field>
        <Field label="Departamento" error={errors.department?.message}>
          <input {...register('department')} className={inputClass(!!errors.department)} />
        </Field>

        {mutation.isError && <ErrorBanner message="Error al guardar los cambios" />}

        <div className="flex items-center justify-end gap-3 pt-1">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 size={14} />
              Guardado
            </span>
          )}
          <button
            type="submit"
            disabled={!isDirty || mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Formulario de cambio de contraseña ───────────────────
function PasswordForm() {
  const [saved, setSaved] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const mutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      await client.post('/auth/users/me/change-password', {
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
      })
    },
    onSuccess: () => {
      reset()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound size={15} className="text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700">Cambiar contraseña</h2>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Field label="Contraseña actual" error={errors.currentPassword?.message}>
          <input {...register('currentPassword')} type="password" className={inputClass(!!errors.currentPassword)} />
        </Field>
        <Field label="Nueva contraseña" error={errors.newPassword?.message}>
          <input {...register('newPassword')} type="password" className={inputClass(!!errors.newPassword)} />
        </Field>
        <Field label="Confirmar contraseña" error={errors.confirmPassword?.message}>
          <input {...register('confirmPassword')} type="password" className={inputClass(!!errors.confirmPassword)} />
        </Field>

        {mutation.isError && <ErrorBanner message="Contraseña actual incorrecta" />}

        <div className="flex items-center justify-end gap-3 pt-1">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 size={14} />
              Contraseña actualizada
            </span>
          )}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40"
          >
            {mutation.isPending && <Loader2 size={13} className="animate-spin" />}
            Cambiar contraseña
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Helpers UI ────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={11} />{error}
        </p>
      )}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
      <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
      <p className="text-sm text-red-600">{message}</p>
    </div>
  )
}

const inputClass = (hasError: boolean) => cn(
  'w-full h-9 px-3 text-sm bg-white border rounded-lg outline-none transition-all',
  'focus:ring-2 focus:ring-offset-0',
  hasError
    ? 'border-red-300 focus:ring-red-100'
    : 'border-gray-200 focus:ring-gray-100 focus:border-gray-300'
)