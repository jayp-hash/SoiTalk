import './fonts.css';
import './globals.css';
import Header from './components/Header';
import Analytics from './components/Analytics';

export const metadata = {
  metadataBase: new URL('https://soitalk.app'),
  title: "Soi Talk · Thai you'll use today",
  description: 'Thai for life in Thailand: one short lesson a day built around a real moment, natural Thai audio, and one line to say for real.',
  // Link previews (Instagram DMs, LINE, WhatsApp, Facebook): app/opengraph-image.png is added automatically
  openGraph: { title: "Soi Talk · Thai you'll use today", description: 'Your first real Thai line in 2 minutes. Free, no sign-up needed.', url: 'https://soitalk.app', siteName: 'Soi Talk', type: 'website' },
  twitter: { card: 'summary_large_image', title: "Soi Talk · Thai you'll use today", description: 'Your first real Thai line in 2 minutes. Free, no sign-up needed.' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* Thailand's colour of the day (Sun red, Mon yellow, Tue pink, Wed green, Thu orange, Fri blue, Sat purple) */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.style.setProperty('--day',['#E5383B','#F2C200','#EC6AA8','#2BA84A','#F28C28','#3A8DDE','#8E5CC9'][new Date().getDay()])" }} />
        <Analytics />
        <Header />
        {children}
      </body>
    </html>
  );
}
