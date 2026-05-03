"use client";

import { useParams } from "next/navigation";
import CourtPoster from "@/components/posters/CourtPoster";

export default function PresenterCourtPage() {
  const params = useParams<{ cohort: string }>();
  const cohort = decodeURIComponent(params?.cohort ?? "");
  return <CourtPoster cohort={cohort} />;
}
