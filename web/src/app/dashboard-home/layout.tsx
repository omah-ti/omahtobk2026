import Sidebar from '@/components/dashboard-home/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar />
      <main className="flex-1 pt-[70px] md:pt-0">{children}</main>
    </div>
  )
}