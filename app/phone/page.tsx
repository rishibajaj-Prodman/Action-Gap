"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PhonePage() {
  const [count, setCount] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  async function handleTap() {
    if (pending) return;
    setPending(true);

    const { data, error: readErr } = await supabase
      .from("ping")
      .select("count")
      .eq("cohort", "default")
      .single();

    if (readErr || !data) {
      setPending(false);
      return;
    }

    const next = data.count + 1;
    setCount(next);

    await supabase
      .from("ping")
      .update({ count: next, updated_at: new Date().toISOString() })
      .eq("cohort", "default");

    setPending(false);
  }

  return (
    <main className="flex h-screen w-screen flex-col items-center justify-center bg-black px-6">
      <button
        onClick={handleTap}
        disabled={pending}
        className="min-h-[80px] min-w-[200px] rounded-2xl bg-white px-8 py-5 text-2xl font-semibold text-black active:scale-95 transition-transform disabled:opacity-60"
      >
        Tap to ping
      </button>
      <p className="mt-6 text-sm text-zinc-400">
        {count === null ? "Tap the button to send a ping" : `Sent · Count is now ${count}`}
      </p>
    </main>
  );
}
