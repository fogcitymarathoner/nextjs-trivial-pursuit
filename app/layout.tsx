import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/layout/Header/header"; // Adjust path as needed
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trivia App",
  description: "Test your knowledge with Wikipedia-powered trivia",
};

const RootLayout = ({ children }: Readonly<{
  children: React.ReactNode;
}>) => {

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
    <body className="min-h-full flex flex-col">
    <Header />
    {children}
    </body>
    </html>
  );
};

export default RootLayout;