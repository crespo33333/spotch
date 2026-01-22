import { TRPCProvider } from '../components/trpc-provider';
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-slate-50`}>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
