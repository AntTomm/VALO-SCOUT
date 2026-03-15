import "./globals.css";

export const metadata = {
  title: "VALO-Scout",
  description: "Wanna learn about the TOP VALORANT players AND get tips on who to play? Experiment with VALO-Scout now!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
