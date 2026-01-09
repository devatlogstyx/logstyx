import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getReportBySlug } from '../../api/report';
import WidgetCard from '../../component/WidgetCard';

export default function PublicReportView() {
  const { slug } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    getReportBySlug(ctrl.signal, slug).then(setReport).finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [slug]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!report) return <div className="p-4">Not found</div>;

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{report.title}</h1>
        <div className="text-sm text-gray-500">Public View</div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {(report.widgets||[]).map(w => (
          <WidgetCard key={w.id} slug={report.slug} widget={w} readOnly={true} />
        ))}
      </div>
    </div>
  );
}
