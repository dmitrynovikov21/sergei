import "@/styles/globals.css";

import { fontGeist, fontHeading, fontSans, fontUrban } from "@/assets/fonts";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

import { cn, constructMetadata } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@/components/analytics";
import ModalProvider from "@/components/modals/providers";
import { TailwindIndicator } from "@/components/tailwind-indicator";

interface RootLayoutProps {
  children: React.ReactNode;
}

export const metadata = constructMetadata();

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontUrban.variable,
          fontHeading.variable,
          fontGeist.variable,
        )}
      >
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ModalProvider>{children}</ModalProvider>
            <Analytics />
            <Toaster
              theme="dark"
              closeButton
              visibleToasts={1}
              position="bottom-right"
              toastOptions={{
                classNames: {
                  toast: 'bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl text-white',
                  title: 'text-white font-medium text-sm',
                  description: 'text-zinc-400 text-sm',
                  actionButton: 'bg-white text-black',
                  cancelButton: 'bg-zinc-800 text-white',
                  closeButton: 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white',
                  success: 'bg-zinc-900 border-zinc-800',
                  error: 'bg-zinc-900 border-red-800',
                  info: 'bg-zinc-900 border-zinc-800',
                },
              }}
            />
            <TailwindIndicator />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
