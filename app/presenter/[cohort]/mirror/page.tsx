"use client";

import { useParams } from "next/navigation";
import MirrorPoster from "@/components/posters/MirrorPoster";

export default function PresenterMirrorPage() {
  const params = useParams<{ cohort: string }>();
  const cohort = decodeURIComponent(params?.cohort ?? "");
  return <MirrorPoster cohort={cohort} />;
}
