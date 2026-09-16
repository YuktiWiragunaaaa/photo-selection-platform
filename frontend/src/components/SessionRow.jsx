import { useState } from 'react'
import { Download, Copy, Trash2, ExternalLink, FileText, Check } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { adminApi } from '../api/adminApi'

export default function SessionRow({ session, onDelete, onRefresh }) {
  const [copied, setCopied] = useState(false)
  const [copiedFiles, setCopiedFiles] = useState(false)

  const copyLink = () => {
    navigator.clipboard.writeText(session.gallery_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copyFilenames = async () => {
    try {
      const data = await adminApi.getFilenames(session.id)
      navigator.clipboard.writeText(data.filenames_string)
      setCopiedFiles(true)
      setTimeout(() => setCopiedFiles(false), 2000)
    } catch (err) {
      alert('Gagal mengambil nama file')
    }
  }

  const handleDelete = () => {
    if (confirm(`Hapus sesi "${session.client_name}"? Aksi ini tidak bisa dibatalkan.`)) {
      onDelete(session.id)
    }
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-4 px-4">
        <div className="font-medium text-gray-900">{session.client_name}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {new Date(session.created_at).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
          })}
        </div>
        {session.notes && (
          <div className="text-xs text-gray-400 mt-0.5 italic">{session.notes}</div>
        )}
      </td>
      <td className="py-4 px-4">
        <StatusBadge status={session.status} />
      </td>
      <td className="py-4 px-4 text-center">
        <span className="text-sm font-medium text-gray-700">
          {session.selected_count} / {session.photo_limit}
        </span>
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Gallery Link */}
          <button
            onClick={copyLink}
            title="Copy gallery link"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Link'}
          </button>

          {/* Open gallery */}
          <a
            href={session.gallery_url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open gallery"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            <ExternalLink size={12} />
            Buka
          </a>

          {session.status === 'completed' && (
            <>
              {/* Download XMP ZIP */}
              <button
                onClick={() => adminApi.downloadZip(session.id)}
                title="Download XMP ZIP"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <Download size={12} />
                XMP ZIP
              </button>

              {/* Copy filenames */}
              <button
                onClick={copyFilenames}
                title="Copy filenames"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                {copiedFiles ? <Check size={12} className="text-green-500" /> : <FileText size={12} />}
                {copiedFiles ? 'Copied!' : 'Filenames'}
              </button>

              {/* Download CSV */}
              <button
                onClick={() => adminApi.downloadCsv(session.id)}
                title="Download CSV"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <FileText size={12} />
                CSV
              </button>
            </>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            title="Delete session"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-red-100 text-red-500 rounded-md hover:bg-red-50 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  )
}
