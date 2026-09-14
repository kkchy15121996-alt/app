import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

// Web-only HTML shell (Expo Router). Sets the document title and meta for kapabookbazaar.in.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <title>Kapa Book Bazaar - 10-Minute Book &amp; Stationery Delivery</title>
        <meta name="description" content="Kapa Book Bazaar (kapabookbazaar.in) — NCERT books, registers, pens and stationery delivered to your door." />
        <meta name="theme-color" content="#0C8346" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
