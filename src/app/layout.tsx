import type { Metadata } from "next";
import { Suspense } from "react";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI PM Portfolio",
  description: "AI product manager portfolio with prototypes, PRDs and project thinking."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
