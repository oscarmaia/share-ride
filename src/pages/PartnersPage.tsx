import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { RidePartner } from '@/types/models'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type PartnerDraft = {
  name: string
  price_out: string
  price_back: string
  notes: string
}

const emptyDraft: PartnerDraft = { name: '', price_out: '0.00', price_back: '0.00', notes: '' }

export function PartnersPage() {
  const [partners, setPartners] = useState<RidePartner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<PartnerDraft>(emptyDraft)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: e } = await supabase
        .from('ride_partners')
        .select('*')
        .order('created_at', { ascending: true })
      if (e) throw e
      setPartners((data ?? []) as RidePartner[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load partners')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function createPartner() {
    setBusy(true)
    setError(null)
    try {
      const payload = {
        name: draft.name.trim(),
        price_out: draft.price_out,
        price_back: draft.price_back,
        notes: draft.notes.trim() ? draft.notes.trim() : null,
      }
      const { error: e } = await supabase.from('ride_partners').insert(payload)
      if (e) throw e
      setDraft(emptyDraft)
      setOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create partner')
    } finally {
      setBusy(false)
    }
  }

  async function deletePartner(id: string) {
    if (!confirm('Delete this partner? This also deletes rides/payments linked to them.')) return
    setBusy(true)
    setError(null)
    try {
      const { error: e } = await supabase.from('ride_partners').delete().eq('id', id)
      if (e) throw e
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete partner')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Partners</h1>
          <p className="text-sm text-muted-foreground">Set per-ride prices; balances are computed from rides and payments.</p>
        </div>
        <div className="ml-auto">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Add partner</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New partner</DialogTitle>
                <DialogDescription>Prices are stored as decimals.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price_out">Outbound price</Label>
                  <Input
                    id="price_out"
                    inputMode="decimal"
                    value={draft.price_out}
                    onChange={(e) => setDraft({ ...draft, price_out: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price_back">Return price</Label>
                  <Input
                    id="price_back"
                    inputMode="decimal"
                    value={draft.price_back}
                    onChange={(e) => setDraft({ ...draft, price_back: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={busy || !draft.name.trim()} onClick={createPartner}>
                  {busy ? 'Saving…' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error ? <div className="text-sm text-destructive">{error}</div> : null}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Out</TableHead>
                <TableHead className="text-right">Back</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">{p.price_out}</TableCell>
                  <TableCell className="text-right">{p.price_back}</TableCell>
                  <TableCell className="max-w-[22rem] truncate">{p.notes ?? ''}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="destructive" size="sm" disabled={busy} onClick={() => deletePartner(p.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!partners.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    No partners yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
