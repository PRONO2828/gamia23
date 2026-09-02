import Script from "next/script";
import "./globals.css";

export const metadata = {
  title: "Gamia23 — Player Rewards",
  description: "Earn coins by playing and inviting friends. Redeem them for real rewards.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}

        {/* Tawk.to live chat. Sitting in the root layout puts it on every page.
            "afterInteractive" lets the page render and become usable first, so
            the widget never delays what a player came here to do. */}
        <Script id="tawk-to" strategy="afterInteractive">
          {`var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/6a982a77451e133447599a47/default';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();`}
        </Script>
      </body>
    </html>
  );
}
