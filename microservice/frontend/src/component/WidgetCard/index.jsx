//@ts-check

import { ActionIcon, Loader } from '@mantine/core';
import { MdDelete, MdRefresh, MdEdit } from 'react-icons/md';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useWidgetCard from './hooks';

export default function WidgetCard({ widget, slug, onDeleteWidget, onEditWidget, deletingId, readOnly }) {

  const {
    fetchData,
    loading,
    error,
    data,
    COLORS,

  } = useWidgetCard({
    slug,
    widget
  })
  return (
    <div className="h-full flex flex-col border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow" >
      {/* Header - Fixed height */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-gray-900 truncate">{widget.title}</div>
          {widget.description && (
            <div className="text-xs text-gray-500 mt-0.5 truncate">
              {widget.description}
            </div>
          )}
        </div>
        {
          !readOnly &&
          <div className="flex gap-1 ml-2 flex-shrink-0">
            <ActionIcon
              className="!bg-transparent !text-gray-600 hover:!text-blue-600"
              onClick={fetchData}
              disabled={loading}
              title="Refresh"
            >
              <MdRefresh size={16} className={loading ? 'animate-spin' : ''} />
            </ActionIcon>
            {onEditWidget && (
              <ActionIcon
                className="!bg-transparent !text-gray-600 hover:!text-blue-600"
                onClick={() => onEditWidget(widget)}
                title="Edit"
              >
                <MdEdit size={16} />
              </ActionIcon>
            )}
            <ActionIcon
              className="!bg-transparent !text-gray-600 hover:!text-red-600"
              onClick={() => onDeleteWidget(widget.id)}
              disabled={deletingId === widget.id}
              title="Delete"
            >
              <MdDelete size={16} />
            </ActionIcon>
          </div>
        }
      </div>

      {/* Content - Flexible height */}
      <div className="flex-1 p-4 overflow-auto min-h-0">
        {loading && (
          <div className="flex items-center justify-center h-full">
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
              <TotalValueCard
                data={data}
                widget={widget}
              />
            )}

            {/* Line Chart Widget */}
            {widget.template === 'line_chart' && (
              <LineChartCard data={data} />
            )}

            {/* Bar Chart Widget */}
            {widget.template === 'bar_chart' && (
              <BarChartCard data={data} />
            )}

            {/* Pie Chart Widget */}
            {widget.template === 'pie_chart' && (
              <PieChartCard data={data} COLORS={COLORS} />
            )}

            {/* Table Widget */}
            {widget.template === 'table' && (
              <TableCard
                data={data}
                widget={widget}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

const TableCard = ({ data, widget }) => {
  return (
    <div className="h-full overflow-auto">
      {data?.rows?.length > 0 ? (
        <table className="w-full text-xs border-collapse">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {(widget?.config?.columns || []).map(c => (
                <th key={c} className="border border-gray-200 px-2 py-1 text-left font-semibold text-gray-700">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                {(widget?.config?.columns || []).map(c => (
                  <td key={c} className="border border-gray-200 px-2 py-1">
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
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          No data available
        </div>
      )}
    </div>
  )
}
const PieChartCard = ({ data, COLORS }) => {
  return (
    <div className="h-full min-h-[150px]">
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
              outerRadius="70%"
              fill="#8884d8"
              dataKey="value"
            >
              {data.labels.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          No data available
        </div>
      )}
    </div>
  )
}
const LineChartCard = ({
  data,
}) => {

  return (
    <div className="h-full min-h-[150px]">
      {data?.labels?.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.labels.map((label, i) => ({
            name: label,
            value: data.values[i]
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          No data available
        </div>
      )}
    </div>
  )
}
const BarChartCard = ({
  data,
}) => {
  return (
    <div className="h-full min-h-[150px]">
      {data?.labels?.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.labels.map((label, i) => ({
            name: String(label),
            value: data.values[i]
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          No data available
        </div>
      )}
    </div>
  )
}

const TotalValueCard = ({
  data,
  widget
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="text-4xl md:text-5xl font-bold text-gray-900">
        {data?.value !== null && data?.value !== undefined
          ? typeof data.value === 'number'
            ? data.value.toLocaleString()
            : data.value
          : '-'}
      </div>
      <div className="text-xs text-gray-500 mt-2">
        {widget.config?.operation || 'count'}
        {widget.config?.field && ` of ${widget.config.field}`}
      </div>
    </div>
  )
}