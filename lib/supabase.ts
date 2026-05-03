import { createClient } from "@supabase/supabase-js";

// During production build (e.g. on Vercel without env vars yet),
// `process.env.NEXT_PUBLIC_*` may be undefined and createClient will throw
// "supabaseUrl is required" while prerendering. Fall back to harmless
// placeholders so the build succeeds; at runtime in the browser, the
// NEXT_PUBLIC_* values set in the Vercel dashboard are inlined into the
// client bundle and Supabase calls work normally.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder.anon.key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
