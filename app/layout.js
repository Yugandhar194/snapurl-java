export const metadata = {
  title: "SnapURL — URL shortener",
  description: "Short links and browser-based file tools.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="stylesheet" href="/theme.css" />
        <link rel="stylesheet" href="/tool-pages.css" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}