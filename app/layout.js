import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import {Toaster} from "sonner";
import Header from "@/components/header";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'


const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SmartSpend",
  description: "One stop solution for your budgeting needs.",
};

export default function RootLayout({ children }) {
  return (
     <ClerkProvider>
    <html lang="en">
      <body
        className={`${inter.className}`}
      >
        {/* header */}
        <Header></Header>

        <main className="min-h-screen">{children}</main>
        <Toaster richColors></Toaster>
        
        {/* footer */}
        <footer className="bg-blue-50 py-12">
          <div className="container mx-auto px-4 text-center text-gray-600">
            <p>Made with ❤️ by Aqib</p>
          </div>
        </footer>
      </body>
    </html>
    </ClerkProvider>
  );
}
