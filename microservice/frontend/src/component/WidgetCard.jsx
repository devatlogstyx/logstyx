import { useEffect, useState } from 'react';
import { getWidgetData } from '../api/report';
import { ActionIcon, Loader } from '@mantine/core';
import { MdDelete, MdRefresh, MdEdit } from 'react-icons/md';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function WidgetCard({ widget, slug, onDeleteWidget, onEditWidget, deletingId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    const ctrl = new AbortController();
    getWidgetData(ctrl.signal, slug, widget.id)
      .then(setData)
      .catch(e => setError(e?.message || 'Error loading data'))
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  };

  useEffect(() => {
    fetchData();
  }, [widget.id]);

  return (
    <div className="border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div>
          <div className="font-semibold text-gray-900">{widget.title}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {widget.description}
          </div>
        </div>
        <div className="flex gap-1">
          <ActionIcon
            className="!bg-transparent !text-gray-600 hover:!text-blue-600"
            onClick={fetchData}
            disabled={loading}
            title="Refresh"
          >
            <MdRefresh size={18} className={loading ? 'animate-spin' : ''} />
          </ActionIcon>
          {onEditWidget && (
            <ActionIcon
              className="!bg-transparent !text-gray-600 hover:!text-blue-600"
              onClick={() => onEditWidget(widget)}
              title="Edit"
            >
              <MdEdit size={18} />
            </ActionIcon>
          )}
          <ActionIcon
            className="!bg-transparent !text-gray-600 hover:!text-red-600"
            onClick={() => onDeleteWidget(widget.id)}
            disabled={deletingId === widget.id}
            title="Delete"
          >
            <MdDelete size={18} />
          </ActionIcon>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader size="sm" />
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
            {String(error)}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Total Value Widget */}
            {widget.template === 'total_value' && (
              <div className="text-center py-8">
                <div className="text-5xl font-bold text-gray-900">
                  {data?.value !== null && data?.value !== undefined
                    ? typeof data.value === 'number'
                      ? data.value.toLocaleString()
                      : data.value
                    : '-'}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  {widget.config?.operation || 'count'}
                  {widget.config?.field && ` of ${widget.config.field}`}
                </div>
              </div>
            )}

            {/* Line Chart Widget */}
            {widget.template === 'line_chart' && (
              <div className="h-64">
                {data?.labels?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.labels.map((label, i) => ({
                      name: label,
                      value: data.values[i]
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    No data available
                  </div>
                )}
              </div>
            )}

            {/* Bar Chart Widget */}
            {widget.template === 'bar_chart' && (
              <div className="h-64">
                {data?.labels?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.labels.map((label, i) => ({
                      name: String(label),
                      value: data.values[i]
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    No data available
                  </div>
                )}
              </div>
            )}

            {/* Pie Chart Widget */}
            {widget.template === 'pie_chart' && (
              <div className="h-64">
                {data?.labels?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.labels.map((label, i) => ({
                          name: String(label),
                          value: data.values[i]
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {data.labels.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    No data available
                  </div>
                )}
              </div>
            )}

            {/* Table Widget */}
            {widget.template === 'table' && (
              <div className="overflow-auto max-h-96">
                {data?.rows?.length > 0 ? (
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {(widget?.config?.columns || []).map(c => (
                          <th key={c} className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {(widget?.config?.columns || []).map(c => (
                            <td key={c} className="border border-gray-200 px-3 py-2">
                              {row[c] !== null && row[c] !== undefined
                                ? String(row[c])
                                : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No data available
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}