import { Link } from 'react-router-dom';
import { ActionIcon, Badge, Modal } from '@mantine/core';
import PrimaryButton from "./../../component/button/PrimaryButton";
import { PRIVATE_REPORT_VISIBILITY, PUBLIC_REPORT_VISIBILITY } from '../../utils/constant';
import { useDashboardReports } from './hooks';
import CreateReport from './CreateReport';
import { MdDelete, MdEdit } from 'react-icons/md';

export default function DashboardReports() {
  const {
    list,
    loading,
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
    isDeleting,
    onRequestDelete,
    ConfirmDialogComponent,
  } = useDashboardReports();

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-3">Reports</h1>
      <div className="flex justify-end mb-4">
        <CreateReport
          openCreateModal={openCreateModal}
          createModalOpened={createModalOpened}
          closeCreateModal={closeCreateModal}
          title={title}
          setTitle={setTitle}
          onCreateSubmit={onCreateSubmit}
          visibility={visibility}
          setVisibility={setVisibility}
          creating={creating}
          canSubmit
        />
      </div>

      {loading ? <div>Loading...</div> : (
        <ul className="space-y-2">
          {list.map(r => (
            <li key={r.id} className="border p-3 flex justify-between">
              <div>
                <div className="font-semibold">{r.title}</div>
                <Badge>{r.visibility}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <Link className="text-blue-600" to={`/dashboard/reports/${r.slug}`}>
                  <ActionIcon className='!bg-transparent !text-black'>
                    <MdEdit size={16} />
                  </ActionIcon>
                </Link>
                <ActionIcon
                  className="!bg-transparent !text-red-500 hover:bg-red-50"
                  onClick={() => onRequestDelete(r)}
                  disabled={isDeleting(r.id)}
                >
                  <MdDelete size={16} />
                </ActionIcon>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialogComponent />
    </div>
  );
}
