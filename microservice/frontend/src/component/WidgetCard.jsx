import { useEffect, useState } from 'react';
import { getWidgetData } from '../api/report';
import { ActionIcon } from '@mantine/core';
import { MdDelete, MdRefresh } from 'react-icons/md';

export default function WidgetCard({ widget, slug, onDeleteWidget, deletingId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = () => {
    setLoading(true); setError(null);
    const ctrl = new AbortController();
    getWidgetData(ctrl.signal, slug, widget.id).then(setData).catch(e => setError(e?.message || 'Error')).finally(() => setLoading(false));
    return () => ctrl.abort();
  }

  useEffect(() => { fetchData(); }, [widget.id]);

  return (
    <div className="border p-3 rounded">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">{widget.title}</div>
        <div>
          <ActionIcon
            className="!bg-transparent !text-black"
            onClick={fetchData}
          >
            <MdRefresh size={16} />
          </ActionIcon>
          <ActionIcon
            className="!bg-transparent !text-red-500 hover:bg-red-50"
            onClick={() => onDeleteWidget(widget.id)}
            disabled={deletingId === widget.id}
          >
            <MdDelete size={16} />
          </ActionIcon>
        </div>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-600">{String(error)}</div>}
      {!loading && !error && (
        <div>
          {widget.template === 'total_value' && (
            <div className="text-3xl font-bold">{data?.value ?? '-'}</div>
          )}
          {['line_chart', 'bar_chart', 'pie_chart'].includes(widget.template) && (
            <div>
              <div className="text-xs text-gray-500">Labels:</div>
              <div className="text-xs break-words">{JSON.stringify(data?.labels)}</div>
              <div className="text-xs text-gray-500 mt-2">Values:</div>
              <div className="text-xs break-words">{JSON.stringify(data?.values)}</div>
            </div>
          )}
          {widget.template === 'table' && (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {(widget?.config?.columns || []).map(c => <th key={c} className="border px-2 py-1 text-left">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(data?.rows || []).map((row, idx) => (
                    <tr key={idx}>
                      {(widget?.config?.columns || []).map(c => <td key={c} className="border px-2 py-1">{String(row[c] ?? '')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
