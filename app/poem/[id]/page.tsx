import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Reader from "@/components/Reader";
import { poemById, allPoems } from "@/lib/data";

export function generateStaticParams() {
  return allPoems().map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const poem = poemById(id);
  if (!poem) return {};
  return {
    title: `${poem.title} — ${poem.author}`,
    description: `${poem.title} by ${poem.author}, read with the machinery visible: scansion, meter, rhyme, devices.`,
  };
}

export default async function PoemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const poem = poemById(id);
  if (!poem) notFound();
  return <Reader poem={poem} />;
}
