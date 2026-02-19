import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/hooks/useSession'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function AuthPage() {
  const { session, loading } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const canSubmit = useMemo(() => email.trim() && password.length >= 6, [email, password])

  async function doLogin() {
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const { error: e } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (e) throw e
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  async function doSignup() {
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const { error: e } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      if (e) throw e
      setInfo('Account created. You can now log in.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signup failed')
    } finally {
      setBusy(false)
    }
  }

  if (!loading && session) return <Navigate to="/" replace />

  return (
    <div className="min-h-dvh grid place-items-center bg-[radial-gradient(1000px_500px_at_20%_-10%,hsl(var(--muted))_0%,transparent_70%),radial-gradient(800px_400px_at_100%_0%,hsl(var(--muted))_0%,transparent_65%)] p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>RideLedger</CardTitle>
          <CardDescription>Track rides and handle advance payments without awkward chats.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            {error ? <div className="mt-4 text-sm text-destructive">{error}</div> : null}
            {info ? <div className="mt-4 text-sm text-muted-foreground">{info}</div> : null}

            <TabsContent value="login" className="mt-4">
              <Button className="w-full" disabled={!canSubmit || busy} onClick={doLogin}>
                {busy ? 'Please wait…' : 'Login'}
              </Button>
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <Button className="w-full" disabled={!canSubmit || busy} onClick={doSignup}>
                {busy ? 'Please wait…' : 'Create account'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">Supabase Auth email/password (MVP).</CardFooter>
      </Card>
    </div>
  )
}
