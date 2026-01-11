import { Link } from 'react-router-dom';
import { ActionIcon, Badge, Modal, Select, TextInput } from '@mantine/core';
import PrimaryButton from "./../../component/button/PrimaryButton";
import SecondaryButton from "./../../component/button/SecondaryButton";
import { PRIVATE_REPORT_VISIBILITY, PUBLIC_REPORT_VISIBILITY } from '../../utils/constant';
import { useDashboardReports } from './hooks';
import CreateReport from './CreateReport';
import { MdDelete, MdEdit, MdLink } from 'react-icons/md';

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
      <Modal opened={editModalOpened} onClose={closeEditModal} title="Edit report" centered>
        <form onSubmit={onEditSubmit} className="flex flex-col gap-3">
          <TextInput
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Report title"
            required
          />
          <Select
            value={editVisibility}
            onChange={(e) => setEditVisibility(e)}
            data={[
              {
                value: PRIVATE_REPORT_VISIBILITY,
                label: "Private"
              },
              {
                value: PUBLIC_REPORT_VISIBILITY,
                label: "Public"
              }
            ]}
          />
          <div className="flex justify-end gap-2 mt-2">
            <SecondaryButton onClick={closeEditModal} disabled={updating}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" disabled={!canEditSubmit}>
              {updating ? 'Saving...' : 'Save'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>
      <ConfirmDialogComponent />
    </div>
  );
}
