import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Toaster } from "@/app/components/ui/sonner";
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { Providers } from './providers';
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "SlopCollector - Find the slop in your Supabase",
  description: "The raccoon that cleans up your database mess. Connect Supabase, find missing indexes, catch slow queries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistMono.variable} antialiased font-mono bg-background text-foreground`}
      >
        <ErrorBoundary>
          <Providers>
            {children}
            <Toaster 
              richColors 
              closeButton 
              position="top-right"
              toastOptions={{
                style: {
                  background: '#2a2a2a',
                  border: '1px solid #3a3a3a',
                  color: '#fff',
                },
              }}
            />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
