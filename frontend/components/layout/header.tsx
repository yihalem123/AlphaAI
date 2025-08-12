'use client'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/hooks/use-auth'
import { LogOut, User, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
  onLogin?: () => void
}

export function Header({ onLogin }: HeaderProps) {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <a className="mr-6 flex items-center space-x-2" href="/">
            <div className="h-6 w-6 rounded bg-primary" />
            <span className="font-bold inline-block">
              AI Trading Assistant
            </span>
          </a>
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none" />
          
          <nav className="flex items-center space-x-2">
            <ThemeToggle />
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4" />
                    <span className="ml-2">{user.username || 'User'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              onLogin && (
                <Button onClick={onLogin} size="sm">
                  Get Started
                </Button>
              )
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}