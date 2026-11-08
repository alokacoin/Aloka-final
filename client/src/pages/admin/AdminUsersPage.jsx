export default function AdminUsersPage() {
  return (
    <div>
      <h1 className="text-3xl font-black text-navy">User management</h1>
      <div className="mt-8 overflow-hidden rounded-[20px] border border-border bg-white shadow-soft">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Alicia Morgan', 'Author', 'Active'],
              ['Rohan Mehta', 'Editor', 'Active'],
              ['Nadia Shah', 'Reader', 'Pending']
            ].map(([name, role, status]) => (
              <tr key={name} className="border-t border-border">
                <td className="px-4 py-4">{name}</td>
                <td className="px-4 py-4">{role}</td>
                <td className="px-4 py-4">{status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
