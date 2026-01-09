import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getReportBySlug, createWidget, deleteWidget, updateReport } from '../../api/report';
import { listAllMyProject } from '../../api/project';
import WidgetCard from '../../component/WidgetCard';
import FilterBuilder from '../../component/FilterBuilder';

export default function DashboardReportDetail() {
  const { slug } = useParams();
  const [report, setReport] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    template: 'total_value',
    title: '',
    project: '',
    config: { operation: 'count', filters: [] }
  });

  useEffect(() => {
    const ctrl = new AbortController();
    getReportBySlug(ctrl.signal, slug).then(setReport).finally(() => setLoading(false));
    listAllMyProject(ctrl.signal).then(setProjects);
    return () => ctrl.abort();
  }, [slug]);

  const onAddWidget = async (e) => {
    e.preventDefault();
    const ctrl = new AbortController();
    const created = await createWidget(ctrl.signal, report.id, {
      project: form.project,
      template: form.template,
      title: form.title || `${form.template}`,
      position: {},
      config: form.config
    });
    setReport({ ...report, widgets: [...(report.widgets||[]), created] });
    setForm({ template: 'total_value', title: '', project: '', config: { operation: 'count', filters: [] } });
  }

  const onChangeVisibility = async (e) => {
    const vis = e.target.value;
    const ctrl = new AbortController();
    const updated = await updateReport(ctrl.signal, report.id, { title: report.title, visibility: vis });
    setReport({ ...report, visibility: updated.visibility });
  }

  if (loading) return <div className="p-4">Loading...</div>;
  if (!report) return <div className="p-4">Not found</div>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">{report.title}</h1>
          <div className="text-sm text-gray-500">Visibility: 
            <select className="ml-2 border p-1" value={report.visibility} onChange={onChangeVisibility}>
              <option value="private">Private</option>
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
            </select>
          </div>
        </div>
      </div>

      <form onSubmit={onAddWidget} className="border p-3 mb-4 space-y-2">
        <div className="font-semibold">Add Widget</div>
        <div className="flex gap-2">
          <select value={form.template} onChange={e=>setForm({ ...form, template: e.target.value })} className="border p-2">
            <option value="total_value">Total Value</option>
            <option value="line_chart">Line Chart</option>
            <option value="bar_chart">Bar Chart</option>
            <option value="table">Table</option>
            <option value="pie_chart">Pie Chart</option>
          </select>
          <input value={form.title} onChange={e=>setForm({ ...form, title: e.target.value })} placeholder="Widget title" className="border p-2 flex-1" />
          <select value={form.project} onChange={e=>setForm({ ...form, project: e.target.value })} className="border p-2">
            <option value="">Select Project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        {form.template === 'total_value' && (
          <div className="flex gap-2">
            <select value={form.config.operation} onChange={e=>setForm({ ...form, config: { ...form.config, operation: e.target.value } })} className="border p-2">
              <option value="count">count</option>
              <option value="sum">sum</option>
              <option value="avg">avg</option>
              <option value="min">min</option>
              <option value="max">max</option>
            </select>
            {['sum','avg','min','max'].includes(form.config.operation) && (
              <input placeholder="raw.field (from project rawIndexes)" className="border p-2 flex-1" value={form.config.field||''} onChange={e=>setForm({ ...form, config: { ...form.config, field: e.target.value } })} />
            )}
          </div>
        )}
        <FilterBuilder value={form.config.filters||[]} onChange={(v)=> setForm({ ...form, config: { ...form.config, filters: v } })} />
        <button type="submit" className="bg-green-600 text-white px-4 py-2">Create Widget</button>
      </form>

      <div className="grid md:grid-cols-2 gap-3">
        {(report.widgets||[]).map(w => (
          <WidgetCard key={w.id} slug={report.slug} widget={w} readOnly={false} />
        ))}
      </div>
    </div>
  );
}
