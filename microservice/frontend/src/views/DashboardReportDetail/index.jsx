import WidgetCard from '../../component/WidgetCard';
import { useDashboardReportDetail } from './hooks';
import ModalWidget from './ModalWidget';

import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import "./style.css"
import PrimaryButton from '../../component/button/PrimaryButton';

export default function DashboardReportDetail() {
  const {
    report,
    projects,
    loading,
    form,
    modalOpened,
    onDeleteWidget,
    deletingId,
    ConfirmDialogComponent,
    handleSubmit,
    onEditWidget,
    onClose,
    containerRef,
    layout,
    width,
    handleLayoutChange,
    setModalOpened
  } = useDashboardReportDetail();



  if (loading) return <div className="p-4">Loading...</div>;
  if (!report) return <div className="p-4">Not found</div>;


  return (
    <div className="p-4" ref={containerRef}>
      <ConfirmDialogComponent />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">{report.title}</h1>
          <p className="text-sm text-gray-500">Drag and resize widgets to customize layout</p>
        </div>
        <div>
          <PrimaryButton onClick={() => (setModalOpened ? setModalOpened(true) : (onClose && onClose()))}>Create Widget</PrimaryButton>
        </div>
      </div>

      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={100} // ← Adjust this (was 80)
        width={width}
        onLayoutChange={handleLayoutChange}
        isDraggable={true}
        isResizable={true}
        compactType="vertical"
        preventCollision={false}
        margin={[12, 12]}
      >
        {(report.widgets || []).map(w => (
          <div key={w.id}>
            <WidgetCard
              slug={report.slug}
              widget={w}
              readOnly={false}
              onDeleteWidget={onDeleteWidget}
              deletingId={deletingId}
              onEditWidget={onEditWidget}
            />
          </div>
        ))}
      </GridLayout>
      <ModalWidget
        modalOpened={modalOpened}
        onClose={onClose}
        onAddWidget={handleSubmit}
        form={form}
        projects={projects}
      />
    </div>
  );
}