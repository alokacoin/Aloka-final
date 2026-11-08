import { useOutletContext } from 'react-router-dom';

export default function UserProfilePage() {
  const { user } = useOutletContext();

  return (
    <div className="mx-auto max-w-3xl rounded-[28px] border border-border bg-white p-8 shadow-soft">
      <h1 className="text-3xl font-black text-navy">My profile</h1>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
          <input className="w-full rounded-xl border border-border bg-slate-50 px-4 py-3" value={user.name} readOnly />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
          <input className="w-full rounded-xl border border-border bg-slate-50 px-4 py-3" value={user.email} readOnly />
        </div>
      </div>
    </div>
  );
}
