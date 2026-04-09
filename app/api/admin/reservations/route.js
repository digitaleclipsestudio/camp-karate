import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("reservations")
    .select(`
      id, reservation_number, status, parent_full_name, parent_name_2,
      email, phone, address_line1, city, postal_code,
      total_amount, created_at, updated_at,
      reservation_children (
        id, first_name, last_name, age, gender
      ),
      reservation_weeks (
        week_id,
        weeks ( id, label, starts_on, ends_on )
      ),
      reservation_tshirts (
        id, is_gift, size, shirt_type, quantity, unit_price
      )
    `)
    .in("status", ["confirmed", "paid"])
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}