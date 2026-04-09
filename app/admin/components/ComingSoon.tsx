export default function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-white shadow-sm gap-2">
      <span className="text-4xl">🚧</span>
      <p className="text-base font-semibold text-zinc-700">{label}</p>
      <p className="text-sm text-zinc-400">Coming soon</p>
    </div>
  )
}
