import Sidebar from '@/components/dashboard/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-neutral-50">
      <Sidebar />
      <main className="flex-1 min-w-0 pt-[70px] md:pt-0">{children}</main>
    </div>
  )
}