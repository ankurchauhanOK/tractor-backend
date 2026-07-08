"use client"

import { Sidebar } from "./sidebar"
import { MobileNav } from "./mobile-nav"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col md:ml-60 pb-14 md:pb-0">
        {children}
      </div>
      <MobileNav />
    </div>
  )
}
