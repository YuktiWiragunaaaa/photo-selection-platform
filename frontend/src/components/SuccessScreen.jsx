import { CheckCircle } from 'lucide-react'

export default function SuccessScreen({ clientName, count }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center max-w-sm animate-fade-in">
        <div className="flex justify-center mb-6">
          <CheckCircle size={56} className="text-gray-900" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-light text-gray-900 mb-3">
          Terima kasih, {clientName}!
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Anda telah memilih <span className="font-medium text-gray-900">{count} foto</span>.
          Fotografer Anda akan segera memprosesnya.
        </p>
        <div className="mt-8 pt-8 border-t border-gray-100">
          <p className="text-xs text-gray-300 uppercase tracking-widest">Pilihan telah dikunci</p>
        </div>
      </div>
    </div>
  )
}
