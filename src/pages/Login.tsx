import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/store/auth.store'
import { authApi } from '@/api/auth.ts'

const loginSchema = z.object({
  username: z.string().min(1, 'El usuario es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function Login() {
  const [error, setError] = useState<string | null>(null)
  const setAuth = useAuthStore((state) => state.setAuth)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

const onSubmit = async (data: LoginForm) => {
  try {
    setError(null)
    const response = await authApi.login({
      ...data,
      deviceId: crypto.randomUUID(),  // genera un ID único por dispositivo
      rememberMe: false,
    })
    setAuth(response)
    window.location.href = '/dashboard'
  } catch (err: any) {
    const msg = err.response?.data?.message
    setError(msg ?? 'Usuario o contraseña incorrectos')
  }
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md px-4">

        {/* Logo / Marca */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">ERP</h1>
          <p className="text-zinc-400 mt-1 text-sm">Accede a tu espacio de trabajo</p>
        </div>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Iniciar sesión</CardTitle>
            <CardDescription className="text-zinc-400">
              Introduce tus credenciales para continuar
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-zinc-300">Usuario</Label>
                <Input
                  id="username"
                  placeholder="admin"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-zinc-500"
                  {...register('username')}
                />
                {errors.username && (
                  <p className="text-red-400 text-xs">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-zinc-300">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-zinc-500"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-red-400 text-xs">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-white text-zinc-900 hover:bg-zinc-200 font-medium"
              >
                {isSubmitting
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
                  : 'Entrar'
                }
              </Button>

            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}