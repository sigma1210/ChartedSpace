import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Charted Space",
  description:
    "Charted Space is a Traveller RPG companion app for tracking your characters, ships, and adventures across the Third Imperium.",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <ClerkProvider
      signInUrl="/"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/map"
      signUpFallbackRedirectUrl="/map"
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="h-full">{children}</body>
      </html>
    </ClerkProvider>
  );
}
export default RootLayout
