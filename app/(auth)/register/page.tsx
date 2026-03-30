'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { saveTokens } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: '',
    username: '',
    display_name: '',
    password: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)

    try {
      const { data } = await api.post('/auth/register', form)
      saveTokens(data.user, data.access_token, data.refresh_token)
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Registration failed. Please try again.'
      setError(msg)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="pb-2">
          <h1 className="font-display text-4xl uppercase tracking-wider text-terra">
            Esportorium
          </h1>
          <p className="text-sm text-text-secondary">Create your account</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="your_handle"
                value={form.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="display_name">Display name</Label>
              <Input
                id="display_name"
                name="display_name"
                type="text"
                placeholder="Your Name"
                value={form.display_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-terra text-primary-foreground hover:bg-terra-dark"
              disabled={isPending}
            >
              {isPending ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center border-t bg-transparent py-4 text-sm text-text-secondary">
          Already have an account?&nbsp;
          <Link href="/login" className="font-medium text-terra hover:underline">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
