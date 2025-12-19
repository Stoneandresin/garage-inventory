import React from 'react';
import '../lib/checkEnv';
import './globals.css';

export const metadata = {
  title: "Garage Inventory",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
