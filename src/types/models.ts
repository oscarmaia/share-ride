export type RidePartner = {
  id: string
  user_id: string
  name: string
  price_out: string
  price_back: string
  notes: string | null
  created_at: string
}

export type Ride = {
  id: string
  partner_id: string
  date: string
  outbound: boolean
  return_ride: boolean
  amount: string
  created_at: string
}

export type Payment = {
  id: string
  partner_id: string
  amount: string
  date: string
  description: string | null
  created_at: string
}
