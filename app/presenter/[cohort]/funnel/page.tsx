"use client";

import { useParams } from "next/navigation";
import FunnelPoster from "@/components/posters/FunnelPoster";

export default function PresenterFunnelPage() {
  const params = useParams<{ cohort: string }>();
  const cohort = decodeURIComponent(params?.cohort ?? "");
  return <FunnelPoster cohort={cohort} />;
}
