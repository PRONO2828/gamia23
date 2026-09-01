import "./globals.css";

export const metadata = {
  title: "Gamia23 — Player Rewards",
  description: "Earn coins by playing and inviting friends. Redeem them for real rewards.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
