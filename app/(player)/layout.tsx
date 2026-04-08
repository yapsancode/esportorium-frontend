import { AuthInitializer } from '@/components/shared/AuthInitializer'
import { AuthGuard } from '@/components/shared/AuthGuard'
import { PlayerRoleGuard } from '@/components/shared/RoleGuard'
import { PlayerTopnav } from '@/components/player/PlayerTopnav'
import { Toaster } from 'sonner'

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <AuthGuard />
      <AuthInitializer />
      <PlayerRoleGuard />
      <PlayerTopnav />
      <main className="flex-1 overflow-hidden">{children}</main>
      <Toaster richColors position="top-right" />
    </div>
  )
}
