'use client'

import { useState, useEffect, useCallback } from 'react'

interface Report {
  id: string
  reporterId: string
  targetType: 'RECIPE' | 'COMMENT'
  targetId: string
  reason: string
  description?: string
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED'
  adminNote?: string
  resolvedAt?: string
  resolvedBy?: string
  createdAt: string
  reporter?: { id: string; name: string; email: string; avatar?: string }
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  REVIEWED: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  DISMISSED: 'bg-gray-100 text-gray-600',
}

const REASON_LABELS: Record<string, string> = {
  SPAM: 'Spam / Misleading',
  INAPPROPRIATE: 'Inappropriate',
  COPYRIGHT: 'Copyright',
  HARMFUL: 'Harmful / Dangerous',
  OTHER: 'Other',
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adminNote, setAdminNote] = useState('')

  const fetchReports = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' })
      if (statusFilter) params.set('status', statusFilter)
      if (targetTypeFilter) params.set('targetType', targetTypeFilter)

      const res = await fetch(`/api/reports?${params}`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      })
      const json = await res.json()
      if (json.success) {
        setReports(json.data.reports)
        setPagination(json.data.pagination)
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, targetTypeFilter])

  useEffect(() => {
    fetchReports(1)
  }, [fetchReports])

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const body: any = { status }
      if (adminNote.trim()) body.adminNote = adminNote.trim()

      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        setReports((prev) => prev.map((r) => (r.id === id ? json.data : r)))
        setEditingId(null)
        setAdminNote('')
      }
    } catch (err) {
      console.error('Failed to update report:', err)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Report Management</h1>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
        <select
          value={targetTypeFilter}
          onChange={(e) => setTargetTypeFilter(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          <option value="RECIPE">Recipe</option>
          <option value="COMMENT">Comment</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No reports found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-3 font-medium">Reporter</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Target ID</th>
                <th className="p-3 font-medium">Reason</th>
                <th className="p-3 font-medium">Description</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {r.reporter?.avatar && (
                        <img src={r.reporter.avatar} alt="" className="w-6 h-6 rounded-full" />
                      )}
                      <span>{r.reporter?.name || r.reporter?.email || r.reporterId}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      r.targetType === 'RECIPE' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {r.targetType}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs max-w-[120px] truncate">{r.targetId}</td>
                  <td className="p-3">{REASON_LABELS[r.reason] || r.reason}</td>
                  <td className="p-3 max-w-[200px] truncate">{r.description || '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    {r.status === 'PENDING' || r.status === 'REVIEWED' ? (
                      editingId === r.id ? (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <input
                            type="text"
                            placeholder="Admin note..."
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            className="border rounded px-2 py-1 text-xs"
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleUpdateStatus(r.id, 'RESOLVED')}
                              className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                            >
                              Resolve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(r.id, 'DISMISSED')}
                              className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => { setEditingId(null); setAdminNote('') }}
                              className="px-2 py-1 border rounded text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingId(r.id)}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                        >
                          Review
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-gray-400">
                        {r.adminNote || 'Processed'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => fetchReports(p)}
              className={`px-3 py-1 rounded text-sm ${
                p === pagination.page ? 'bg-blue-500 text-white' : 'border hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function getAdminToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('admin_token') || ''
  }
  return ''
}
