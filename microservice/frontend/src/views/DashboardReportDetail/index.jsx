import WidgetCard from '../../component/WidgetCard';
import { useDashboardReportDetail } from './hooks';
import CreateWidget from './CreateWidget';

export default function DashboardReportDetail() {
  const {
    report,
    projects,
    loading,
    form,
    modalOpened,
    setModalOpened,
    onAddWidget,
    onDeleteWidget,
    deletingId,
    ConfirmDialogComponent
  } = useDashboardReportDetail();

  if (loading) return <div className="p-4">Loading...</div>;
  if (!report) return <div className="p-4">Not found</div>;

  return (
    <div className="p-4">
      <ConfirmDialogComponent />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">{report.title}</h1>
        </div>
        <div>
          <CreateWidget
            modalOpened={modalOpened}
            setModalOpened={setModalOpened}
            onAddWidget={onAddWidget}
            form={form}
            projects={projects}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {(report.widgets || []).map(w => (
          <div key={w.id} className="relative">
            <WidgetCard slug={report.slug} widget={w} readOnly={false} onDeleteWidget={onDeleteWidget} deletingId={deletingId} />
          </div>
        ))}
      </div>
    </div>
  );
}
