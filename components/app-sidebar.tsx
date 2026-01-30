"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconDashboard,
  IconUsers,
  IconRoute,
  IconTemplate,
  IconCircleDot,
  IconChevronDown,
  IconChartBar,
  IconFileText,
  IconReportAnalytics,
  IconChecklist,
  IconSettings,
} from "@tabler/icons-react"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { useRole, type UserRole } from "@/lib/role-context"

const user = {
  name: "Sandun Srimal",
  email: "sandun@example.com",
  avatar: "/avatars/shadcn.jpg",
}

// All available menu items
const allMenuItems = [
  {
    title: "Overview",
    icon: IconDashboard,
    url: "/overview",
    roles: ["admin", "manager"] as UserRole[],
  },
  {
    title: "Employees",
    icon: IconUsers,
    url: "/employees",
    roles: ["admin"] as UserRole[],
  },
  {
    title: "Appraisals",
    icon: IconFileText,
    url: "/appraisals",
    roles: ["admin", "employee", "manager"] as UserRole[],
  },
  {
    title: "Templates",
    icon: IconTemplate,
    url: "/templates",
    roles: ["admin"] as UserRole[],
  },
  {
    title: "Procedures",
    icon: IconRoute,
    url: "/procedures",
    roles: ["admin"] as UserRole[],
  },
  {
    title: "My Tasks",
    icon: IconChecklist,
    url: "/procedures/tasks",
    roles: ["admin", "employee", "manager"] as UserRole[],
  },
  {
    title: "Task Management",
    icon: IconSettings,
    url: "/procedures/task-management",
    roles: ["admin", "manager"] as UserRole[],
  },
  {
    title: "Reports",
    icon: IconReportAnalytics,
    url: "/reports",
    roles: ["admin", "manager"] as UserRole[],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { currentRole } = useRole()
  const subMenuRef = React.useRef<HTMLUListElement>(null)
  const [subMenuHeight, setSubMenuHeight] = React.useState<number>(0)
  const [isMounted, setIsMounted] = React.useState(false)
  
  // Prevent hydration mismatch by only filtering after mount
  React.useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Filter menu items based on current role (only after mount to prevent hydration mismatch)
  const performanceAppraisalSubItems = React.useMemo(() => {
    if (!isMounted) {
      // During SSR, show all items to match initial client render
      return allMenuItems
    }
    return allMenuItems.filter((item) => item.roles.includes(currentRole))
  }, [currentRole, isMounted])
  
  // Check if any sub-item is active (including root path)
  const isPerformanceAppraisalActive = React.useMemo(() => {
    return performanceAppraisalSubItems.some(
      (item) => pathname === item.url || (pathname === "/" && item.url === "/overview")
    )
  }, [performanceAppraisalSubItems, pathname])
  
  // Auto-expand if one of the sub-items is active
  const [isPerformanceAppraisalOpen, setIsPerformanceAppraisalOpen] = React.useState(
    false
  )

  // Update open state when pathname changes or after mount
  React.useEffect(() => {
    if (isMounted && isPerformanceAppraisalActive) {
      setIsPerformanceAppraisalOpen(true)
    }
  }, [isPerformanceAppraisalActive, isMounted])

  // Measure sub-menu height for animation
  React.useEffect(() => {
    if (subMenuRef.current) {
      if (isPerformanceAppraisalOpen) {
        setSubMenuHeight(subMenuRef.current.scrollHeight)
      } else {
        setSubMenuHeight(0)
      }
    }
  }, [isPerformanceAppraisalOpen, performanceAppraisalSubItems])

  // Recalculate height when window resizes
  React.useEffect(() => {
    const updateHeight = () => {
      if (subMenuRef.current && isPerformanceAppraisalOpen) {
        setSubMenuHeight(subMenuRef.current.scrollHeight)
      }
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [isPerformanceAppraisalOpen])

  const togglePerformanceAppraisal = () => {
    setIsPerformanceAppraisalOpen(!isPerformanceAppraisalOpen)
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="data-[slot=sidebar-menu-button]:p-1.5!" 
              tooltip="Accxis 360"
              asChild
            >
              <Link href="/overview">
                <IconCircleDot className="size-5" />
                <span className="text-base font-semibold group-data-[collapsible=icon]:hidden">Accxis 360</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <SidebarMenu>
          {/* Performance & Appraisal */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Performance & Appraisal"
              onClick={togglePerformanceAppraisal}
              isActive={isPerformanceAppraisalActive}
              className={`group-data-[collapsible=icon]:ml-2 ${isPerformanceAppraisalActive ? "!bg-primary !text-primary-foreground font-medium" : ""}`}
            >
              <IconChartBar />
              <span className="group-data-[collapsible=icon]:hidden">Performance & Appraisal</span>
              <IconChevronDown 
                className={`ml-auto size-4 group-data-[collapsible=icon]:hidden transition-transform duration-200 ease-in-out ${
                  isPerformanceAppraisalOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            </SidebarMenuButton>
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: isPerformanceAppraisalOpen ? `${subMenuHeight}px` : '0px',
                opacity: isPerformanceAppraisalOpen ? 1 : 0,
              }}
            >
              <SidebarMenuSub ref={subMenuRef}>
                {performanceAppraisalSubItems.map((item, index) => {
                  const isSubActive = pathname === item.url || (pathname === "/" && item.url === "/overview")
                  return (
                    <SidebarMenuSubItem 
                      key={item.title}
                      style={{
                        animationDelay: isPerformanceAppraisalOpen ? `${index * 30}ms` : `${(performanceAppraisalSubItems.length - index - 1) * 20}ms`,
                        transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-in-out',
                        opacity: isPerformanceAppraisalOpen ? 1 : 0,
                        transform: isPerformanceAppraisalOpen ? 'translateX(0)' : 'translateX(-8px)',
                      }}
                    >
                      <SidebarMenuSubButton
                        asChild
                        isActive={isSubActive}
                        className={isSubActive ? "!bg-primary !text-primary-foreground font-medium" : ""}
                      >
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )
                })}
              </SidebarMenuSub>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
