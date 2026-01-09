import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getReportBySlug, createWidget, deleteWidget, updateReport } from '../../api/report';
import { listAllMyProject } from '../../api/project';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

export function useDashboardReportDetail() {
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

  const [modalOpened, setModalOpened] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const { openConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();

  useEffect(() => {
    const ctrl = new AbortController();
    getReportBySlug(ctrl.signal, slug).then(setReport).finally(() => setLoading(false));
    listAllMyProject(ctrl.signal).then(setProjects);
    return () => ctrl.abort();
  }, [slug]);

  const onAddWidget = async (e) => {
    e && e.preventDefault();
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
    setModalOpened(false);
  };

  const onChangeVisibility = async (e) => {
    const vis = e.target.value;
    const ctrl = new AbortController();
    const updated = await updateReport(ctrl.signal, report.id, { title: report.title, visibility: vis });
    setReport({ ...report, visibility: updated.visibility });
  };

  const onDeleteWidget = (widgetId) => {
    setDeleteError(null);
    openConfirmDialog({
      title: 'Delete widget',
      message: 'Are you sure you want to delete this widget? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        setDeletingId(widgetId);
        try {
          const ctrl = new AbortController();
          await deleteWidget(ctrl.signal, widgetId);
          setReport({ ...report, widgets: (report.widgets||[]).filter(w => w.id !== widgetId) });
        } catch (err) {
          setDeleteError(err?.message || 'Failed to delete');
        } finally {
          setDeletingId(null);
        }
      },
      onCancel: () => {}
    });
  };

  return {
    report,
    projects,
    loading,
    form,
    setForm,
    modalOpened,
    setModalOpened,
    onAddWidget,
    onChangeVisibility,
    onDeleteWidget,
    deletingId,
    deleteError,
    ConfirmDialogComponent
  };
}
