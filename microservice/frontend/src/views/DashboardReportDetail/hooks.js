import { useEffect, useRef, useState } from 'react';
import { useForm } from '@mantine/form';
import { useParams } from 'react-router-dom';
import { getReportBySlug, createWidget, deleteWidget, updateReport, updateWidget } from '../../api/report';
import { listAllMyProject } from '../../api/project';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

export function useDashboardReportDetail() {
  const { slug } = useParams();
  const [report, setReport] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const initialValues = {
    template: 'total_value',
    title: '',
    project: '',
    description: "",
    config: { operation: 'count', filters: [] }
  };

  const form = useForm({
    initialValues
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

  const onAddWidget = form.onSubmit(async (values) => {
    const ctrl = new AbortController();
    const created = await createWidget(ctrl.signal, report.id, {
      project: values.project,
      template: values.template,
      title: values.title || `${values.template}`,
      description: values.description,
      config: values.config
    });
    setReport({ ...report, widgets: [...(report.widgets || []), created] });
    form.setValues(initialValues);
    setModalOpened(false);
  });

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
          setReport({ ...report, widgets: (report.widgets || []).filter(w => w.id !== widgetId) });
        } catch (err) {
          setDeleteError(err?.message || 'Failed to delete');
        } finally {
          setDeletingId(null);
        }
      },
      onCancel: () => { }
    });
  };


  const [editingWidgetId, setEditingWidgetId] = useState(null);

  const onEditWidget = (w) => {
    setEditingWidgetId(w.id);
    form.setValues({
      template: w.template,
      title: w.title,
      project: w.project?.id,
      description: w.description || '',
      config: w.config || {}
    });
    setModalOpened(true);
  };

  const handleSubmit = form.onSubmit(async (values) => {
    if (editingWidgetId) {
      const ctrl = new AbortController();
      const updated = await updateWidget(ctrl.signal, editingWidgetId, {
        project: values.project,
        template: values.template,
        title: values.title || `${values.template}`,
        description: values.description,
        config: values.config
      });
      const updatedWidgets = (report.widgets || []).map(w => (w.id === editingWidgetId ? updated : w));
      setModalOpened(false);
      setEditingWidgetId(null);
      form.reset();
      if (report) setReport({ ...report, widgets: updatedWidgets });
    } else {
      const ctrl = new AbortController();
      const created = await createWidget(ctrl.signal, report.id, {
        project: values.project,
        template: values.template,
        title: values.title || `${values.template}`,
        description: values.description,
        config: values.config
      });
      setModalOpened(false);
      form.reset();
      if (report) setReport({ ...report, widgets: [...(report.widgets || []), created] });
    }
  });

  const onClose = () => {
    setModalOpened(false);
    form.reset();
  }

  const updateWidgetPosition = async (widgetId, position) => {
    try {
      const ctrl = new AbortController();
      await updateWidget(ctrl.signal, widgetId, { position });
    } catch (err) {
      console.error('Failed to update widget position:', err);
    }
  };

  const containerRef = useRef(null);
  const [width, setWidth] = useState(1200);

  // Convert widgets to grid layout format
  const layout = (report?.widgets || []).map(w => ({
    i: w.id,
    x: w.position?.x || 0,
    y: w.position?.y || 0,
    w: w.position?.w || 6,
    h: w.position?.h || 2, // ← Reduced from 4 to 2
    minW: 3,
    maxW: 12,
    minH: 2, // ← Reduced from 3 to 2
    maxH: 8, // ← Add max height
  }));

  const handleLayoutChange = (newLayout) => {
    newLayout.forEach(item => {
      // Snap width to allowed sizes
      let w = item.w;
      if (w <= 3) w = 3;       // 1/4
      else if (w <= 4) w = 4;  // 1/3
      else if (w <= 6) w = 6;  // 1/2
      else if (w <= 9) w = 9;  // 1/2
      else w = 12;             // full

      const widget = report?.widgets.find(w => w.id === item.i);
      if (widget) {
        updateWidgetPosition(widget.id, {
          x: item.x,
          y: item.y,
          w: w,
          h: item.h
        });
      }
    });
  };

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return {
    report,
    projects,
    loading,
    form,
    modalOpened,
    setModalOpened,
    onAddWidget,
    onChangeVisibility,
    onDeleteWidget,
    deletingId,
    deleteError,
    ConfirmDialogComponent,
    setReport,
    handleSubmit,
    setEditingWidgetId,
    onClose,
    onEditWidget,
    updateWidgetPosition,
    containerRef,
    layout,
    width,
    handleLayoutChange
  };
}
