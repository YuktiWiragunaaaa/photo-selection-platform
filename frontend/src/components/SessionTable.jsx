import SessionRow from './SessionRow'

export default function SessionTable({ sessions, onDelete, onRefresh }) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">Belum ada sesi. Buat sesi pertama Anda.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Klien</th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
            <th className="py-3 px-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Pilihan</th>
            <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              onDelete={onDelete}
              onRefresh={onRefresh}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
