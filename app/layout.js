import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react"; // vercel

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "VALO-Scout",
  description: "Wanna learn about the TOP VALORANT players AND get tips on who to play? Experiment with VALO-Scout now!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Analytics /> 
      </body>
    </html>
  );
}
