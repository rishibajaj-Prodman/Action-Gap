"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function PresenterPage() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    supabase
      .from("ping")
      .select("count")
      .eq("cohort", "default")
      .single()
      .then(({ data }) => {
        if (active && data) setCount(data.count);
      });

    const channel = supabase
      .channel("ping-channel")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ping" },
        (payload) => {
          const next = (payload.new as { count?: number })?.count;
          if (typeof next === "number") setCount(next);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="flex h-screen w-screen flex-col items-center justify-center bg-black">
      <div
        className="font-bold text-white tabular-nums"
        style={{ fontSize: "12rem", lineHeight: 1 }}
      >
        {count ?? "—"}
      </div>
      <p className="mt-8 text-sm text-zinc-500">Real-time spine · Phase 1</p>
    </main>
  );
}
