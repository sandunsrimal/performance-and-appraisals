"use client"

import * as React from "react"
import { useRole } from "@/lib/role-context"
import {
  generateNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  applyReadState,
  getUnreadNotificationCount,
} from "@/lib/notifications"
import { type Notification, type NotificationCategory } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import {
  IconBell,
  IconCheck,
  IconClock,
  IconAlertCircle,
  IconFileText,
  IconCalendar,
  IconCircleCheck,
  IconPlus,
  IconX,
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const categoryConfig: Record<NotificationCategory, { label: string; icon: React.ComponentType<{ className?: string }>; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  evaluation_pending: {
    label: "Review Pending",
    icon: IconClock,
    variant: "secondary",
  },
  evaluation_completed: {
    label: "Review Completed",
    icon: IconCircleCheck,
    variant: "default",
  },
  action_required: {
    label: "Action Required",
    icon: IconAlertCircle,
    variant: "destructive",
  },
  meeting_scheduled: {
    label: "Meeting Scheduled",
    icon: IconCalendar,
    variant: "default",
  },
  meeting_reminder: {
    label: "Meeting Reminder",
    icon: IconCalendar,
    variant: "secondary",
  },
  form_due: {
    label: "Form Due",
    icon: IconFileText,
    variant: "secondary",
  },
  form_overdue: {
    label: "Form Overdue",
    icon: IconAlertCircle,
    variant: "destructive",
  },
  stage_completed: {
    label: "Step Completed",
    icon: IconCircleCheck,
    variant: "default",
  },
  assignment_created: {
    label: "Review Cycle Assigned",
    icon: IconPlus,
    variant: "default",
  },
  system: {
    label: "System",
    icon: IconBell,
    variant: "outline",
  },
}

function NotificationsPageContent() {
  const { currentUserId } = useRole()
  const router = useRouter()
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [selectedCategory, setSelectedCategory] = React.useState<NotificationCategory | "all">("all")
  const [filter, setFilter] = React.useState<"all" | "unread">("unread")

  React.useEffect(() => {
    if (currentUserId) {
      const allNotifications = generateNotificationsForUser(currentUserId)
      const notificationsWithReadState = applyReadState(allNotifications, currentUserId)
      setNotifications(notificationsWithReadState)
    }
  }, [currentUserId])

  const filteredNotifications = React.useMemo(() => {
    let filtered = notifications

    // Filter by read status
    if (filter === "unread") {
      filtered = filtered.filter((n) => !n.read)
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((n) => n.category === selectedCategory)
    }

    return filtered
  }, [notifications, selectedCategory, filter])

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read && currentUserId) {
      markNotificationAsRead(notification.id, currentUserId)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      )
    }

    if (notification.link) {
      router.push(notification.link)
    }
  }

  const handleMarkAllAsRead = () => {
    if (currentUserId) {
      markAllNotificationsAsRead(currentUserId)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const categoryCounts = React.useMemo(() => {
    const counts: Record<NotificationCategory, number> = {
      evaluation_pending: 0,
      evaluation_completed: 0,
      action_required: 0,
      meeting_scheduled: 0,
      meeting_reminder: 0,
      form_due: 0,
      form_overdue: 0,
      stage_completed: 0,
      assignment_created: 0,
      system: 0,
    }

    notifications.forEach((n) => {
      if (!n.read) {
        counts[n.category]++
      }
    })

    return counts
  }, [notifications])

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-4 md:py-4">
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Notifications</h2>
            <p className="text-muted-foreground mt-2">
              Stay updated with your review forms, meetings, and required actions
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <IconCheck className="size-4 mr-2" />
              Mark All as Read
            </Button>
          )}
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as "all" | "unread")}>
          <TabsList>
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({notifications.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="px-4 lg:px-6">
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
          >
            All Categories
          </Button>
          {Object.entries(categoryConfig).map(([category, config]) => {
            const count = categoryCounts[category as NotificationCategory]
            const Icon = config.icon
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category as NotificationCategory)}
                className="gap-2"
              >
                <Icon className="size-4" />
                {config.label}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {count}
                  </Badge>
                )}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="px-4 lg:px-6">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <IconBell className="size-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No notifications</p>
              <p className="text-sm text-muted-foreground mt-2">
                {filter === "unread"
                  ? "You're all caught up! No unread notifications."
                  : "No notifications match your selected filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const config = categoryConfig[notification.category]
              const Icon = config.icon

              return (
                <Card
                  key={notification.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notification.read ? "border-l-4 border-l-primary" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`rounded-full p-2 ${
                        config.variant === "destructive"
                          ? "bg-destructive/10"
                          : config.variant === "default"
                          ? "bg-primary/10"
                          : "bg-muted"
                      }`}>
                        <Icon className={`size-5 ${
                          config.variant === "destructive"
                            ? "text-destructive"
                            : config.variant === "default"
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{notification.title}</h3>
                              {!notification.read && (
                                <div className="size-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant={config.variant} className="text-xs">
                                {config.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(notification.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  return <NotificationsPageContent />
}
