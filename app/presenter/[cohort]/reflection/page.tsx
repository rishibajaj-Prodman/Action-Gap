"use client";

import { useParams } from "next/navigation";
import ReflectionPoster from "@/components/posters/ReflectionPoster";

export default function PresenterReflectionPage() {
  const params = useParams<{ cohort: string }>();
  const cohort = decodeURIComponent(params?.cohort ?? "");
  return <ReflectionPoster cohort={cohort} />;
}
