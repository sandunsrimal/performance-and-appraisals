"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { IconBell } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { useRole } from "@/lib/role-context"
import { getUnreadNotificationCount } from "@/lib/notifications"
import { useRouter } from "next/navigation"
import * as React from "react"

export function SiteHeader() {
  const { currentUserId } = useRole()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = React.useState(0)

  React.useEffect(() => {
    if (currentUserId) {
      const count = getUnreadNotificationCount(currentUserId)
      setUnreadCount(count)
      
      // Update count every 30 seconds
      const interval = setInterval(() => {
        const newCount = getUnreadNotificationCount(currentUserId)
        setUnreadCount(newCount)
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [currentUserId])

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-1">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">Overview</h1>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => router.push("/notifications")}
        >
          <IconBell className="size-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    </header>
  )
}
