"use client";

import { useParams } from "next/navigation";
import MirrorPhone from "@/components/phones/MirrorPhone";

function titleCase(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export default function PhoneMirrorPage() {
  const params = useParams<{ cohort: string }>();
  const cohort = titleCase(decodeURIComponent(params?.cohort ?? ""));

  return (
    <main
      className="flex min-h-screen flex-col items-center px-6 py-10 text-white"
      style={{ backgroundColor: "#0A0908" }}
    >
      <MirrorPhone cohort={cohort} />
    </main>
  );
}
