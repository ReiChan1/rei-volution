"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { Menu, Search, Sun, Moon, LogOut, User, Settings } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/store/ui-store";
import { initials } from "@/lib/utils";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";

export function Topbar({
  user,
}: {
  user: { firstName: string; lastName: string; image?: string | null };
}) {
  const { theme, setTheme } = useTheme();
  const { setMobileSidebarOpen } = useUIStore();
  const [query, setQuery] = useState("");

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border px-4 sm:px-6">
      <button
        className="rounded-lg p-2 text-muted hover:bg-surface-2 lg:hidden"
        onClick={() => setMobileSidebarOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative hidden max-w-sm flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks, expenses, events…"
          className="h-10 w-full rounded-xl border border-border bg-surface-2/60 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary focus:bg-surface"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </Button>

        <NotificationsPanel />

        <DropdownMenu>
          <DropdownMenuTrigger className="ml-1 outline-none">
            <Avatar className="h-9 w-9 ring-2 ring-transparent transition-all hover:ring-primary/40">
              {user.image && <AvatarImage src={user.image} alt={user.firstName} />}
              <AvatarFallback>{initials(user.firstName, user.lastName)}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {user.firstName} {user.lastName}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2">
                <User className="h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-danger focus:bg-danger/10"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
