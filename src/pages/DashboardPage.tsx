import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Payment, Ride, RidePartner } from '@/types/models'
import { num, fmtSigned2 } from '@/lib/money'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type PartnerBalance = {
  partner: RidePartner
  totalPaid: number
  totalCharged: number
  balance: number
}

export function DashboardPage() {
  const [partners, setPartners] = useState<RidePartner[]>([])
  const [rides, setRides] = useState<Ride[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data: p, error: pe } = await supabase
        .from('ride_partners')
        .select('*')
        .order('created_at', { ascending: true })
      if (pe) throw pe

      const partnersData = (p ?? []) as RidePartner[]
      setPartners(partnersData)

      const ids = partnersData.map((x) => x.id)
      if (!ids.length) {
        setRides([])
        setPayments([])
        return
      }

      const [{ data: r, error: re }, { data: pay, error: pae }] = await Promise.all([
        supabase.from('rides').select('*').in('partner_id', ids),
        supabase.from('payments').select('*').in('partner_id', ids),
      ])
      if (re) throw re
      if (pae) throw pae

      setRides(((r ?? []) as Ride[]).sort((a, b) => b.date.localeCompare(a.date)))
      setPayments(((pay ?? []) as Payment[]).sort((a, b) => b.date.localeCompare(a.date)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const balances = useMemo<PartnerBalance[]>(() => {
    const paidBy = new Map<string, number>()
    for (const p of payments) paidBy.set(p.partner_id, (paidBy.get(p.partner_id) ?? 0) + num(p.amount))

    const chargedBy = new Map<string, number>()
    for (const r of rides) chargedBy.set(r.partner_id, (chargedBy.get(r.partner_id) ?? 0) + num(r.amount))

    return partners.map((partner) => {
      const totalPaid = paidBy.get(partner.id) ?? 0
      const totalCharged = chargedBy.get(partner.id) ?? 0
      const balance = totalPaid - totalCharged
      return { partner, totalPaid, totalCharged, balance }
    })
  }, [partners, payments, rides])

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Balance is payments minus ride charges. Positive = credit.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/partners">Manage partners</Link>
          </Button>
          <Button asChild>
            <Link to="/rides">Add ride</Link>
          </Button>
        </div>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      {!balances.length ? (
        <Card>
          <CardHeader>
            <CardTitle>No partners yet</CardTitle>
            <CardDescription>Add a partner to start tracking rides and payments.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/partners">Add your first partner</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {balances.map(({ partner, balance, totalCharged, totalPaid }) => (
            <Card key={partner.id}>
              <CardHeader>
                <CardTitle className="text-base">{partner.name}</CardTitle>
                <CardDescription>
                  Prices: out {partner.price_out} / back {partner.price_back}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <div className="text-sm text-muted-foreground">Balance</div>
                  <div className={['font-semibold', balance >= 0 ? 'text-emerald-600' : 'text-rose-600'].join(' ')}>
                    {fmtSigned2(balance)}
                  </div>
                </div>
                <div className="flex items-baseline justify-between text-sm">
                  <div className="text-muted-foreground">Paid</div>
                  <div>{totalPaid.toFixed(2)}</div>
                </div>
                <div className="flex items-baseline justify-between text-sm">
                  <div className="text-muted-foreground">Charged</div>
                  <div>{totalCharged.toFixed(2)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
