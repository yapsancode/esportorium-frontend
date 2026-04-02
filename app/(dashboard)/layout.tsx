import { DashboardSidebar } from '@/components/shared/DashboardSidebar'
import { DashboardTopbar } from '@/components/shared/DashboardTopbar'
import { AuthInitializer } from '@/components/shared/AuthInitializer'
import { AuthGuard } from '@/components/shared/AuthGuard'
import { Toaster } from 'sonner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AuthGuard />
      <AuthInitializer />
      <DashboardSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  )
}
