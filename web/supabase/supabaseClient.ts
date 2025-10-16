import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.GADGET_PUBLIC_SUPABASE_URL!,
  process.env.GADGET_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);
