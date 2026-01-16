import { useEffect, useMemo, useState, useCallback } from 'react';
import { paginateReports, createReport, deleteReport, updateReport } from '../../api/report';
import { PRIVATE_REPORT_VISIBILITY } from '../../utils/constant';
import { useErrorMessage } from '../../hooks/useMessage';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

export function useDashboardReports() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1)

  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState(PRIVATE_REPORT_VISIBILITY);
  const [creating, setCreating] = useState(false);

  // edit modal state
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editVisibility, setEditVisibility] = useState(PRIVATE_REPORT_VISIBILITY);
  const [updating, setUpdating] = useState(false);

  const [deletingIds, setDeletingIds] = useState(() => new Set());

  const ErrorMessage = useErrorMessage();
  const { openConfirmDialog, ConfirmDialogComponent } = useConfirmDialog();

  useEffect(() => {
    const ctrl = new AbortController();
    paginateReports(ctrl.signal, { page, limit: 50 })
      .then((res) => {
        setList(res);
      })
      .catch((err) => {
        ErrorMessage(err);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [ErrorMessage, page]);

  const openCreateModal = useCallback(() => setCreateModalOpened(true), []);
  const closeCreateModal = useCallback(() => setCreateModalOpened(false), []);

  const resetForm = useCallback(() => {
    setTitle('');
    setVisibility(PRIVATE_REPORT_VISIBILITY);
  }, []);

  const canSubmit = useMemo(() => title.trim().length > 0 && !creating, [title, creating]);

  // edit modal helpers
  const openEditModal = useCallback((report) => {
    if (!report) return;
    setEditId(report.id);
    setEditTitle(report.title || '');
    setEditVisibility(report.visibility || PRIVATE_REPORT_VISIBILITY);
    setEditModalOpened(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditModalOpened(false);
    setEditId(null);
    setEditTitle('');
    setEditVisibility(PRIVATE_REPORT_VISIBILITY);
  }, []);

  const canEditSubmit = useMemo(() => editTitle.trim().length > 0 && !updating && !!editId, [editTitle, updating, editId]);

  const onCreateSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (!title.trim()) return;
      try {
        setCreating(true);
        const ctrl = new AbortController();
        const data = await createReport(ctrl.signal, { title: title.trim(), visibility });
        if (data) {
          setList((prev) => [data, ...prev]);
          resetForm();
          closeCreateModal();
        }
      } catch (err) {
        ErrorMessage(err);
      } finally {
        setCreating(false);
      }
    },
    [title, visibility, ErrorMessage, closeCreateModal, resetForm]
  );

  const onEditSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (!editId || !editTitle.trim()) return;
      try {
        setUpdating(true);
        const ctrl = new AbortController();
        const updated = await updateReport(ctrl.signal, editId, {
          title: editTitle.trim(),
          visibility: editVisibility,
        });
        if (updated) {
          setList((prev) => prev.map((r) => (r.id === editId ? { ...r, ...updated } : r)));
          closeEditModal();
        }
      } catch (err) {
        ErrorMessage(err);
      } finally {
        setUpdating(false);
      }
    },
    [editId, editTitle, editVisibility, ErrorMessage, closeEditModal]
  );

  const isDeleting = useCallback((id) => deletingIds.has(id), [deletingIds]);

  const onRequestDelete = useCallback(
    (report) => {
      openConfirmDialog({
        title: 'Delete report',
        message: `Are you sure you want to delete "${report?.title}"? This action cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        onConfirm: async () => {
          const id = report.id;
          setDeletingIds((prev) => new Set([...prev, id]));
          try {
            const ctrl = new AbortController();
            await deleteReport(ctrl.signal, id);
            setList((prev) => prev.filter((r) => r.id !== id));
          } catch (err) {
            ErrorMessage(err);
          } finally {
            setDeletingIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }
        },
        onCancel: () => { },
      });
    },
    [openConfirmDialog, ErrorMessage]
  );

  return {
    // data
    list,
    loading,
    page,
    setPage,

    // create modal + form
    createModalOpened,
    openCreateModal,
    closeCreateModal,
    title,
    setTitle,
    visibility,
    setVisibility,
    creating,
    canSubmit,
    onCreateSubmit,

    // edit modal + form
    editModalOpened,
    openEditModal,
    closeEditModal,
    editTitle,
    setEditTitle,
    editVisibility,
    setEditVisibility,
    updating,
    canEditSubmit,
    onEditSubmit,

    // deletion
    isDeleting,
    onRequestDelete,

    // confirm dialog component to be rendered in UI
    ConfirmDialogComponent,
  };
}
