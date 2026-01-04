import {
    Card,
    Badge,
    ActionIcon,
    Modal,
    TextInput,
    Select,
    NumberInput,
    Alert,
    Loader,
    JsonInput,
    PasswordInput,
    Pagination
} from '@mantine/core';
import { IoMdAdd } from 'react-icons/io';
import { MdEdit, MdDelete } from 'react-icons/md';
import { TbRadar2 } from 'react-icons/tb';
import { MdErrorOutline } from 'react-icons/md';
import PrimaryButton from '../../component/button/PrimaryButton';
import SecondaryButton from '../../component/button/SecondaryButton';
import useDashboardProbes from './hooks';
import ModalForm from './ModalForm';

const DashboardProbes = () => {

    const {
        isLoading,
        openModal,
        list,
        page,
        setPage,
        handleDelete,
        isModalOpen,
        closeModal,
        editingProbe,
        form,
        handleSubmit,
        projectOptions,
        authType,
        isSubmitting
    } = useDashboardProbes()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-2xl font-bold mb-1">Probes</h2>
                    <p className="text-sm text-gray-500">
                        Configure automated data collection from external sources
                    </p>
                </div>
                <PrimaryButton
                    onClick={() => openModal()}
                    leftSection={<IoMdAdd size={16} />}
                >
                    Add Probe
                </PrimaryButton>
            </div>

            {list?.results?.length < 1 ? (
                <Card className="border p-8">
                    <div className="flex flex-col items-center gap-4">
                        <TbRadar2 size={48} className="opacity-30" />
                        <p className="text-gray-500">No probes configured yet</p>
                        <PrimaryButton onClick={() => openModal()}>
                            Create your first probe
                        </PrimaryButton>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {list?.results.map((probe) => (
                        <Card key={probe.id} className="border p-4">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <TbRadar2 size={20} />
                                    <span className="font-medium">{probe.title}</span>
                                </div>
                                <div className="flex gap-1">
                                    <ActionIcon onClick={() => openModal(probe)}>
                                        <MdEdit size={16} />
                                    </ActionIcon>
                                    <ActionIcon
                                        className="text-red-500 hover:bg-red-50"
                                        onClick={() => handleDelete(probe.id)}
                                    >
                                        <MdDelete size={16} />
                                    </ActionIcon>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div>
                                    <p className="text-xs text-gray-500">Project</p>
                                    <p className="text-sm">{probe.project.title}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">URL</p>
                                    <p className="text-sm truncate">
                                        {probe.connection?.url || 'N/A'}
                                    </p>
                                </div>
                                <div className="flex gap-8">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Interval</p>
                                        <Badge className="text-xs">{probe.delay}s</Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Auth</p>
                                        <Badge className="text-xs bg-gray-100">
                                            {probe.connection?.auth?.type || 'none'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                    <div className="flex justify-end">
                        <Pagination
                            total={list?.totalPages}
                            value={page}
                            onChange={setPage}
                        />
                    </div>
                </div>
            )}

            <ModalForm
                isModalOpen={isModalOpen}
                closeModal={closeModal}
                editingProbe={editingProbe}
                form={form}
                handleSubmit={handleSubmit}
                projectOptions={projectOptions}
                authType={authType}
                isSubmitting={isSubmitting}
            />
        </div>
    );
};

export default DashboardProbes;