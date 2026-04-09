export default function ProfileCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-6 py-4">
        <h3 className="font-semibold text-zinc-900">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}
