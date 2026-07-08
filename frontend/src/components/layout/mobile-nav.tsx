"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Layers,
  Upload,
  ClipboardCheck,
  BarChart3,
} from "lucide-react"

const mobileItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/batches", label: "Batches", icon: Layers },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/review", label: "Review", icon: ClipboardCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden safe-bottom">
      <div className="flex items-center justify-around h-14">
        {mobileItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "text-amber-600"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
