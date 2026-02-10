import { TRPCProvider } from '../components/trpc-provider';
import { Sidebar } from '../components/Sidebar';
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
      <body className={`${inter.className} bg-slate-950 text-slate-50 flex h-screen overflow-hidden`}>
        <TRPCProvider>
          <div className="flex w-full">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-12 relative">
              {children}
            </main>
          </div>
        </TRPCProvider>
      </body>
    </html>
  );
}
