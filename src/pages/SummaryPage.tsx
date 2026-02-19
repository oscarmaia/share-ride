import { useEffect, useMemo, useState } from 'react'
import { format, parseISO, startOfMonth } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Payment, Ride, RidePartner } from '@/types/models'
import { monthRange } from '@/lib/month'
import { fmt2, fmtSigned2, num } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Row = {
  partner: RidePartner
  ridesTotal: number
  paymentsTotal: number
  net: number
  balanceToDate: number
}

export function SummaryPage() {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [partners, setPartners] = useState<RidePartner[]>([])
  const [rides, setRides] = useState<Ride[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const { data: p, error: pe } = await supabase.from('ride_partners').select('*').order('created_at', { ascending: true })
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
      setRides((r ?? []) as Ride[])
      setPayments((pay ?? []) as Payment[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  const rows = useMemo<Row[]>(() => {
    const monthDate = startOfMonth(parseISO(`${month}-01`))
    const { start, endExclusive } = monthRange(monthDate)

    const ridesAllBy = new Map<string, number>()
    const ridesMonthBy = new Map<string, number>()
    for (const r of rides) {
      const amt = num(r.amount)
      ridesAllBy.set(r.partner_id, (ridesAllBy.get(r.partner_id) ?? 0) + amt)
      if (r.date >= start && r.date < endExclusive) ridesMonthBy.set(r.partner_id, (ridesMonthBy.get(r.partner_id) ?? 0) + amt)
    }

    const paidAllBy = new Map<string, number>()
    const paidMonthBy = new Map<string, number>()
    for (const p of payments) {
      const amt = num(p.amount)
      paidAllBy.set(p.partner_id, (paidAllBy.get(p.partner_id) ?? 0) + amt)
      if (p.date >= start && p.date < endExclusive) paidMonthBy.set(p.partner_id, (paidMonthBy.get(p.partner_id) ?? 0) + amt)
    }

    return partners.map((partner) => {
      const ridesTotal = ridesMonthBy.get(partner.id) ?? 0
      const paymentsTotal = paidMonthBy.get(partner.id) ?? 0
      const net = paymentsTotal - ridesTotal
      const balanceToDate = (paidAllBy.get(partner.id) ?? 0) - (ridesAllBy.get(partner.id) ?? 0)
      return { partner, ridesTotal, paymentsTotal, net, balanceToDate }
    })
  }, [month, partners, payments, rides])

  const shareText = useMemo(() => {
    const lines: string[] = []
    lines.push(`Ride summary for ${month}`)
    for (const r of rows) {
      const bal = r.balanceToDate
      const status = bal >= 0 ? 'CREDIT' : 'DEBIT'
      lines.push(`${r.partner.name}: rides ${fmt2(r.ridesTotal)} | paid ${fmt2(r.paymentsTotal)} | net ${fmtSigned2(r.net)} | balance ${fmtSigned2(bal)} (${status})`)
    }
    return lines.join('\n')
  }, [month, rows])

  async function copyShare() {
    setBusy(true)
    try {
      await navigator.clipboard.writeText(shareText)
    } finally {
      setBusy(false)
    }
  }

  const whatsappHref = useMemo(() => {
    return `https://wa.me/?text=${encodeURIComponent(shareText)}`
  }, [shareText])

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Monthly summary</h1>
          <p className="text-sm text-muted-foreground">Credits carry over. Balance is total paid minus total charged.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input
            type="month"
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <Button variant="outline" disabled={busy} onClick={copyShare}>
            Copy
          </Button>
          <Button asChild>
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </Button>
        </div>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      {!rows.length ? (
        <Card>
          <CardHeader>
            <CardTitle>No partners</CardTitle>
            <CardDescription>Add a partner first.</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead className="text-right">Rides</TableHead>
                <TableHead className="text-right">Payments</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.partner.id}>
                  <TableCell className="font-medium">{r.partner.name}</TableCell>
                  <TableCell className="text-right">{fmt2(r.ridesTotal)}</TableCell>
                  <TableCell className="text-right">{fmt2(r.paymentsTotal)}</TableCell>
                  <TableCell className={['text-right', r.net >= 0 ? 'text-emerald-600' : 'text-rose-600'].join(' ')}>
                    {fmtSigned2(r.net)}
                  </TableCell>
                  <TableCell
                    className={['text-right font-semibold', r.balanceToDate >= 0 ? 'text-emerald-600' : 'text-rose-600'].join(' ')}
                  >
                    {fmtSigned2(r.balanceToDate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Share text</CardTitle>
          <CardDescription>Paste in WhatsApp or SMS.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">{shareText}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
