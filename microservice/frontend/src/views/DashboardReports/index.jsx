import { Link } from 'react-router-dom';
import { ActionIcon, Badge, Modal, Pagination, Select, Text, TextInput, Title } from '@mantine/core';
import PrimaryButton from "./../../component/button/PrimaryButton";
import SecondaryButton from "./../../component/button/SecondaryButton";
import { PRIVATE_REPORT_VISIBILITY, PUBLIC_REPORT_VISIBILITY } from '../../utils/constant';
import { useDashboardReports } from './hooks';
import CreateReport from './CreateReport';
import { MdDelete, MdEdit, MdLink } from 'react-icons/md';
import EditModal from './EditModal';

export default function DashboardReports() {
  const {
    list,
    loading,
    page,
    setPage,
    createModalOpened,
    openCreateModal,
    closeCreateModal,
    title,
    setTitle,
    visibility,
    setVisibility,
    creating,
    onCreateSubmit,
    // edit
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
    isDeleting,
    onRequestDelete,
    ConfirmDialogComponent,
  } = useDashboardReports();

  return (
    <div className="p-4 ">
      <div className="flex justify-between items-start mb-8">
        <div>
          <Title className="text-3xl font-bold">Reports</Title>
          <Text className="text-gray-600">Generate custom insights by transforming your logs into interactive charts and detailed reports</Text>
        </div>
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
          {list?.results?.map(r => (
            <li key={r.id} className="border p-3 flex justify-between">
              <Link to={`/dashboard/reports/${r.slug}`} className="flex-1">
                <div className="font-semibold hover:underline">{r.title}</div>
                <Badge>{r.visibility}</Badge>
              </Link>
              <div className="flex items-center gap-3">
                {
                  r?.visibility === PUBLIC_REPORT_VISIBILITY &&
                  <a href={`/reports/${r?.slug}`} target='_blank'>
                    <ActionIcon
                      className='!bg-transparent !text-black'
                    >
                      <MdLink size={16} />
                    </ActionIcon>
                  </a>
                }
                <ActionIcon
                  className='!bg-transparent !text-black'
                  onClick={() => openEditModal(r)}
                >
                  <MdEdit size={16} />
                </ActionIcon>
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
      <div className="flex justify-end mt-4">
        <Pagination
          total={list?.totalPages}
          value={page}
          onChange={setPage}
        />
      </div>
      <EditModal
        editModalOpened={editModalOpened}
        closeEditModal={closeEditModal}
        onEditSubmit={onEditSubmit}
        editTitle={editTitle}
        setEditTitle={setEditTitle}
        editVisibility={editVisibility}
        setEditVisibility={setEditVisibility}
        updating={updating}
        canEditSubmit={canEditSubmit}
      />
      <ConfirmDialogComponent />
    </div>
  );
}
