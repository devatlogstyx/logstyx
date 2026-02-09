//@ts-check

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import WidgetCard from '../../component/WidgetCard';
import useAPI from '../../hooks/useAPI';

export default function PublicReportView() {
  const { slug } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const api = useAPI(`/v1/reports`)

  useEffect(() => {

    api.get(slug).then(setReport).finally(() => setLoading(false));

  }, [slug, api]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!report) return <div className="p-4">Not found</div>;

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">{report.title}</h1>
        <div className="text-sm text-gray-500">Public View</div>
      </div>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: 'repeat(12, 1fr)',
          gridAutoRows: '100px'
        }}
      >
        {(report.widgets || []).map(w => {
          const pos = w.position || { x: 0, y: 0, w: 6, h: 2 };

          return (
            <div
              key={w.id}
              style={{
                gridColumn: `${pos.x + 1} / span ${pos.w}`,
                gridRow: `${pos.y + 1} / span ${pos.h}`
              }}
            >
              <WidgetCard
                slug={report.slug}
                widget={w}
                readOnly={true}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}