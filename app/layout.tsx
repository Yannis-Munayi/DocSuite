import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "DocSuite — AI Agents",
  description: "AI-powered document analysis agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full font-sans antialiased">
        <AuthProvider>
          <div className="flex h-full flex-col">
            <Navbar />
            <main className="flex-1 overflow-hidden">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
