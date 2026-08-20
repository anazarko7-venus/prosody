import type { Metadata } from "next";
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

/* The wordmark lives inside the card, not in a site header: the card is the
   whole interface on "/" and the reader repeats it as a link home. There is
   no separate chrome to keep in sync. */

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* The two faces on the first paint: the wordmark and everything
            the card says. The other Satoshi masters are requested only if
            something on the page asks for them. */}
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/Gulax-Regular.woff2"
          crossOrigin=""
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/Satoshi-Medium.woff2"
          crossOrigin=""
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
