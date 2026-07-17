import { Suspense } from "react";
import Finder from "@/components/Finder";
import { buildIndex } from "@/lib/data";

export default function Home() {
  const index = buildIndex();
  return (
    <Suspense>
      <Finder index={index} />
    </Suspense>
  );
}
