import { useEffect, useMemo, useState } from 'react'
import { eachDayOfInterval, format, isWeekend, lastDayOfMonth, parseISO, startOfMonth } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Ride, RidePartner } from '@/types/models'
import { num, fmt2 } from '@/lib/money'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type RideDraft = {
  partner_id: string
  date: string
  outbound: boolean
  return_ride: boolean
}

type RideEditDraft = {
  id: string
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
  const [monthBusy, setMonthBusy] = useState(false)
  const [monthMsg, setMonthMsg] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [edit, setEdit] = useState<RideEditDraft | null>(null)
  const [draft, setDraft] = useState<RideDraft>({
    partner_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    outbound: true,
    return_ride: false,
  })

  const [monthDraft, setMonthDraft] = useState(() => ({
    month: format(new Date(), 'yyyy-MM'),
    outbound: true,
    return_ride: false,
  }))

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

  const editPartner = useMemo(() => {
    if (!edit) return null
    return partners.find((p) => p.id === edit.partner_id) ?? null
  }, [edit, partners])

  const chargePreview = useMemo(() => {
    if (!selectedPartner) return 0
    return (draft.outbound ? num(selectedPartner.price_out) : 0) + (draft.return_ride ? num(selectedPartner.price_back) : 0)
  }, [draft.outbound, draft.return_ride, selectedPartner])

  const monthChargePreview = useMemo(() => {
    if (!selectedPartner) return 0
    return (monthDraft.outbound ? num(selectedPartner.price_out) : 0) + (monthDraft.return_ride ? num(selectedPartner.price_back) : 0)
  }, [monthDraft.outbound, monthDraft.return_ride, selectedPartner])

  const editChargePreview = useMemo(() => {
    if (!editPartner || !edit) return 0
    return (edit.outbound ? num(editPartner.price_out) : 0) + (edit.return_ride ? num(editPartner.price_back) : 0)
  }, [edit, editPartner])

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

  async function addMonthWeekdays() {
    if (!selectedPartner) return
    if (!monthDraft.outbound && !monthDraft.return_ride) {
      setMonthMsg('Select outbound and/or return.')
      return
    }

    setMonthBusy(true)
    setMonthMsg(null)
    setError(null)
    try {
      const monthStart = startOfMonth(parseISO(`${monthDraft.month}-01`))
      const monthEnd = lastDayOfMonth(monthStart)
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
        .filter((d) => !isWeekend(d))
        .map((d) => format(d, 'yyyy-MM-dd'))

      if (!days.length) {
        setMonthMsg('No weekdays found for that month.')
        return
      }

      const { data: existing, error: exErr } = await supabase
        .from('rides')
        .select('id,date')
        .eq('partner_id', selectedPartner.id)
        .gte('date', days[0])
        .lte('date', days[days.length - 1])
      if (exErr) throw exErr

      const existingDates = new Set<string>(((existing ?? []) as Array<{ date: string }>).map((r) => r.date))
      const toInsert = days
        .filter((d) => !existingDates.has(d))
        .map((d) => ({
          partner_id: selectedPartner.id,
          date: d,
          outbound: monthDraft.outbound,
          return_ride: monthDraft.return_ride,
          amount: fmt2(monthChargePreview),
        }))

      let inserted = 0
      const chunkSize = 200
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize)
        if (!chunk.length) continue
        const { error: insErr } = await supabase.from('rides').insert(chunk)
        if (insErr) throw insErr
        inserted += chunk.length
      }

      const skipped = days.length - inserted
      setMonthMsg(`Added ${inserted} weekday rides. Skipped ${skipped} existing dates.`)
      await load()
    } catch (e) {
      setMonthMsg(e instanceof Error ? e.message : 'Failed to add month rides')
    } finally {
      setMonthBusy(false)
    }
  }

  function openEdit(r: Ride) {
    setEditError(null)
    setEdit({
      id: r.id,
      partner_id: r.partner_id,
      date: r.date,
      outbound: r.outbound,
      return_ride: r.return_ride,
    })
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!edit) return
    if (!editPartner) {
      setEditError('Partner not found for this ride.')
      return
    }
    if (!edit.outbound && !edit.return_ride) {
      setEditError('Select outbound and/or return.')
      return
    }

    setEditBusy(true)
    setEditError(null)
    try {
      const amount = editChargePreview
      const { error: e } = await supabase
        .from('rides')
        .update({
          date: edit.date,
          outbound: edit.outbound,
          return_ride: edit.return_ride,
          amount: fmt2(amount),
        })
        .eq('id', edit.id)
      if (e) throw e
      setEditOpen(false)
      setEdit(null)
      await load()
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to update ride')
    } finally {
      setEditBusy(false)
    }
  }

  async function deleteRide(id: string) {
    if (!confirm('Delete this ride?')) return
    setBusy(true)
    setError(null)
    try {
      const { error: e } = await supabase.from('rides').delete().eq('id', id)
      if (e) throw e
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete ride')
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add entire month (weekdays)</CardTitle>
          <CardDescription>
            Adds Mon–Fri rides for the selected partner. Charge per day preview: {fmt2(monthChargePreview)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="month">Month</Label>
            <input
              id="month"
              type="month"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={monthDraft.month}
              onChange={(e) => setMonthDraft((d) => ({ ...d, month: e.target.value }))}
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={monthDraft.outbound}
                onCheckedChange={(v) => setMonthDraft((d) => ({ ...d, outbound: Boolean(v) }))}
              />
              Outbound
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={monthDraft.return_ride}
                onCheckedChange={(v) => setMonthDraft((d) => ({ ...d, return_ride: Boolean(v) }))}
              />
              Return
            </label>
          </div>

          {monthMsg ? <div className="text-sm text-muted-foreground">{monthMsg}</div> : null}

          <div>
            <Button disabled={monthBusy || loading || !selectedPartner} onClick={addMonthWeekdays}>
              {monthBusy ? 'Adding…' : 'Add weekdays for month'}
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
              <TableHead>Legs</TableHead>
              <TableHead className="text-right">Charge</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rides.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.date}</TableCell>
                <TableCell>{partners.find((p) => p.id === r.partner_id)?.name ?? r.partner_id}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.outbound ? 'Out' : ''}
                  {r.outbound && r.return_ride ? ' + ' : ''}
                  {r.return_ride ? 'Back' : ''}
                </TableCell>
                <TableCell className="text-right">{r.amount}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => openEdit(r)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" disabled={busy} onClick={() => deleteRide(r.id)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!rides.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-sm text-muted-foreground">
                  No rides yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit ride</DialogTitle>
            <DialogDescription>
              Charge is recalculated using the partner's current prices. Preview: {fmt2(editChargePreview)}
            </DialogDescription>
          </DialogHeader>

          {editError ? <div className="text-sm text-destructive">{editError}</div> : null}

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Partner</Label>
              <div className="h-10 rounded-md border bg-muted/20 px-3 text-sm flex items-center">
                {editPartner?.name ?? '—'}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit_date">Date</Label>
              <input
                id="edit_date"
                type="date"
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={edit?.date ?? ''}
                onChange={(e) => setEdit((d) => (d ? { ...d, date: e.target.value } : d))}
              />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(edit?.outbound)}
                  onCheckedChange={(v) => setEdit((d) => (d ? { ...d, outbound: Boolean(v) } : d))}
                />
                Outbound
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(edit?.return_ride)}
                  onCheckedChange={(v) => setEdit((d) => (d ? { ...d, return_ride: Boolean(v) } : d))}
                />
                Return
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false)
                setEdit(null)
                setEditError(null)
              }}
            >
              Cancel
            </Button>
            <Button disabled={!edit || editBusy} onClick={saveEdit}>
              {editBusy ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
