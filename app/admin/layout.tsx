export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-10">
      <div className="mb-4 inline-block text-xs font-semibold text-neutral-500 bg-neutral-100 rounded-full px-3 py-1">
        शिबिर प्रशासन · Camp Admin
      </div>
      {children}
    </div>
  );
}
