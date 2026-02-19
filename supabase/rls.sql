-- Enable RLS and add policies.

alter table ride_partners enable row level security;
alter table ride_templates enable row level security;
alter table rides enable row level security;
alter table payments enable row level security;

-- ride_partners: only owner
create policy "ride_partners_select_own" on ride_partners
  for select using (user_id = auth.uid());

create policy "ride_partners_insert_own" on ride_partners
  for insert with check (user_id = auth.uid());

create policy "ride_partners_update_own" on ride_partners
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "ride_partners_delete_own" on ride_partners
  for delete using (user_id = auth.uid());

-- rides/templates/payments: access via owned partner
create policy "ride_templates_select_via_partner" on ride_templates
  for select using (
    exists (select 1 from ride_partners rp where rp.id = partner_id and rp.user_id = auth.uid())
  );

create policy "ride_templates_write_via_partner" on ride_templates
  for all using (
    exists (select 1 from ride_partners rp where rp.id = partner_id and rp.user_id = auth.uid())
  ) with check (
    exists (select 1 from ride_partners rp where rp.id = partner_id and rp.user_id = auth.uid())
  );

create policy "rides_select_via_partner" on rides
  for select using (
    exists (select 1 from ride_partners rp where rp.id = partner_id and rp.user_id = auth.uid())
  );

create policy "rides_write_via_partner" on rides
  for all using (
    exists (select 1 from ride_partners rp where rp.id = partner_id and rp.user_id = auth.uid())
  ) with check (
    exists (select 1 from ride_partners rp where rp.id = partner_id and rp.user_id = auth.uid())
  );

create policy "payments_select_via_partner" on payments
  for select using (
    exists (select 1 from ride_partners rp where rp.id = partner_id and rp.user_id = auth.uid())
  );

create policy "payments_write_via_partner" on payments
  for all using (
    exists (select 1 from ride_partners rp where rp.id = partner_id and rp.user_id = auth.uid())
  ) with check (
    exists (select 1 from ride_partners rp where rp.id = partner_id and rp.user_id = auth.uid())
  );
