import type { Metadata } from "next";
import Link from "next/link";
import "./tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Prosody",
    template: "%s · Prosody",
  },
  description:
    "A poem finder that indexes how a poem is made — form, meter, device, theme — over a curated corpus of 300 public-domain poems.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="wordmark">
            Prosody
          </Link>
          <span className="tag">ask it for a poem, by how it&apos;s made</span>
        </header>
        {children}
      </body>
    </html>
  );
}
