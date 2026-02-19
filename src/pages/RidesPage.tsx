import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Ride, RidePartner } from '@/types/models'
import { num, fmt2 } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type RideDraft = {
  partner_id: string
  date: string
  outbound: boolean
  return_ride: boolean
}

export function RidesPage() {
  const [partners, setPartners] = useState<RidePartner[]>([])
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<RideDraft>({
    partner_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    outbound: true,
    return_ride: false,
  })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [{ data: p, error: pe }, { data: r, error: re }] = await Promise.all([
        supabase.from('ride_partners').select('*').order('created_at', { ascending: true }),
        supabase.from('rides').select('*').order('date', { ascending: false }).limit(50),
      ])
      if (pe) throw pe
      if (re) throw re
      const partnersData = (p ?? []) as RidePartner[]
      setPartners(partnersData)
      setRides((r ?? []) as Ride[])
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

  const selectedPartner = useMemo(
    () => partners.find((p) => p.id === draft.partner_id) ?? null,
    [partners, draft.partner_id],
  )

  const chargePreview = useMemo(() => {
    if (!selectedPartner) return 0
    return (draft.outbound ? num(selectedPartner.price_out) : 0) + (draft.return_ride ? num(selectedPartner.price_back) : 0)
  }, [draft.outbound, draft.return_ride, selectedPartner])

  async function addRide() {
    if (!selectedPartner) return
    if (!draft.outbound && !draft.return_ride) {
      setError('Select outbound and/or return.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const amount = chargePreview
      const payload = {
        partner_id: draft.partner_id,
        date: draft.date,
        outbound: draft.outbound,
        return_ride: draft.return_ride,
        amount: fmt2(amount),
      }
      const { error: e } = await supabase.from('rides').insert(payload)
      if (e) throw e
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add ride')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rides</h1>
        <p className="text-sm text-muted-foreground">Mark rides; charge is deducted from balance immediately (as a ride charge).</p>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add ride</CardTitle>
          <CardDescription>Charge preview: {fmt2(chargePreview)}</CardDescription>
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
            <Label htmlFor="date">Date</Label>
            <input
              id="date"
              type="date"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={draft.date}
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={draft.outbound} onCheckedChange={(v) => setDraft((d) => ({ ...d, outbound: Boolean(v) }))} />
              Outbound
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.return_ride}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, return_ride: Boolean(v) }))}
              />
              Return
            </label>
          </div>

          <div>
            <Button disabled={busy || loading || !partners.length || !draft.partner_id} onClick={addRide}>
              {busy ? 'Saving…' : 'Add ride'}
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
              <TableHead className="text-right">Charge</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rides.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.date}</TableCell>
                <TableCell>{partners.find((p) => p.id === r.partner_id)?.name ?? r.partner_id}</TableCell>
                <TableCell className="text-right">{r.amount}</TableCell>
              </TableRow>
            ))}
            {!rides.length ? (
              <TableRow>
                <TableCell colSpan={3} className="text-sm text-muted-foreground">
                  No rides yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
