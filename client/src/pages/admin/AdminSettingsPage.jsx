export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl rounded-[28px] border border-border bg-white p-8 shadow-soft">
      <h1 className="text-3xl font-black text-navy">Platform settings</h1>
      <div className="mt-8 grid gap-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Site title</label>
          <input className="w-full rounded-xl border border-border bg-slate-50 px-4 py-3" value="Aloka" readOnly />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Contact email</label>
          <input className="w-full rounded-xl border border-border bg-slate-50 px-4 py-3" value="hello@financetaxcommunity.com" />
        </div>
      </div>
    </div>
  );
}
