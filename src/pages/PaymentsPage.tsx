import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Payment, RidePartner } from '@/types/models'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type PaymentDraft = {
  partner_id: string
  amount: string
  date: string
  description: string
}

export function PaymentsPage() {
  const [partners, setPartners] = useState<RidePartner[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<PaymentDraft>({
    partner_id: '',
    amount: '0.00',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
  })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [{ data: p, error: pe }, { data: pay, error: pae }] = await Promise.all([
        supabase.from('ride_partners').select('*').order('created_at', { ascending: true }),
        supabase.from('payments').select('*').order('date', { ascending: false }).limit(50),
      ])
      if (pe) throw pe
      if (pae) throw pae
      const partnersData = (p ?? []) as RidePartner[]
      setPartners(partnersData)
      setPayments((pay ?? []) as Payment[])
      if (!draft.partner_id && partnersData[0]) setDraft((d) => ({ ...d, partner_id: partnersData[0].id }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canSave = useMemo(() => Boolean(draft.partner_id) && Number(draft.amount) > 0, [draft.partner_id, draft.amount])

  async function addPayment() {
    setBusy(true)
    setError(null)
    try {
      const payload = {
        partner_id: draft.partner_id,
        amount: draft.amount,
        date: draft.date,
        description: draft.description.trim() ? draft.description.trim() : null,
      }
      const { error: e } = await supabase.from('payments').insert(payload)
      if (e) throw e
      setDraft((d) => ({ ...d, amount: '0.00', description: '' }))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add payment')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">Advance payments create credits; end-of-month payments reduce debit.</p>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add payment</CardTitle>
          <CardDescription>This increases partner balance (credits).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Partner</Label>
            <Select value={draft.partner_id} onValueChange={(v) => setDraft((d) => ({ ...d, partner_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a partner" />
              </SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={draft.amount}
              onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="e.g. March prepayment"
            />
          </div>

          <div>
            <Button disabled={busy || loading || !canSave} onClick={addPayment}>
              {busy ? 'Saving…' : 'Add payment'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Partner</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.date}</TableCell>
                <TableCell>{partners.find((x) => x.id === p.partner_id)?.name ?? p.partner_id}</TableCell>
                <TableCell className="max-w-[20rem] truncate">{p.description ?? ''}</TableCell>
                <TableCell className="text-right">{p.amount}</TableCell>
              </TableRow>
            ))}
            {!payments.length ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground">
                  No payments yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
