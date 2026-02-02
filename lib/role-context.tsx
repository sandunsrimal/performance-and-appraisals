"use client"

import * as React from "react"

export type UserRole = "admin" | "employee" | "manager"

// Demo users for each role
export const DEMO_USERS = {
  admin: {
    role: "admin" as UserRole,
    userId: "admin-1", // HR Director
    name: "Nimali Perera",
    email: "nimali.perera@company.lk",
  },
  employee: {
    role: "employee" as UserRole,
    userId: "eng-1", // Senior Software Engineer
    name: "Kavindu Silva",
    email: "kavindu.silva@company.lk",
  },
  manager: {
    role: "manager" as UserRole,
    userId: "eng-manager-1", // Engineering Manager
    name: "Rajitha Wickramasinghe",
    email: "rajitha.wickramasinghe@company.lk",
  },
} as const

interface RoleContextType {
  currentRole: UserRole
  currentUserId: string
  currentUserName: string
  currentUserEmail: string
  setCurrentRole: (role: UserRole) => void
}

const RoleContext = React.createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  // Start with "employee" to match server render, then update after mount
  const [currentRole, setCurrentRole] = React.useState<UserRole>("employee")
  const [isMounted, setIsMounted] = React.useState(false)

  // Load role from localStorage after mount to prevent hydration mismatch
  React.useEffect(() => {
    setIsMounted(true)
    if (typeof window !== "undefined") {
      const savedRole = localStorage.getItem("userRole") as UserRole | null
      if (savedRole && ["admin", "employee", "manager"].includes(savedRole)) {
        setCurrentRole(savedRole)
      }
    }
  }, [])

  const currentUser = DEMO_USERS[currentRole]

  const handleSetRole = React.useCallback((role: UserRole) => {
    setCurrentRole(role)
    if (typeof window !== "undefined") {
      localStorage.setItem("userRole", role)
    }
  }, [])

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        currentUserId: currentUser.userId,
        currentUserName: currentUser.name,
        currentUserEmail: currentUser.email,
        setCurrentRole: handleSetRole,
      }}
    >
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = React.useContext(RoleContext)
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider")
  }
  return context
}
