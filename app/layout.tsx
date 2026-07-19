/* istanbul ignore file */
import type {Metadata} from "next";
import {Geist, Geist_Mono} from "next/font/google";
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

const RootLayout = ({children}: Readonly<{
  children: React.ReactNode;
}>) => {

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
    <body className="app-page min-h-full flex flex-col bg-gray-50 text-gray-900 antialiased">
    <Header/>
    <main className="flex-1 w-full">
      <div className="app-container container max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {children}
      </div>
    </main>
    </body>
    </html>
  );
};

export default RootLayout;
