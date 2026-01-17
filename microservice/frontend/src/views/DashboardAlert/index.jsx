//@ts-check

import { ActionIcon, Loader, Pagination, Text, Title } from "@mantine/core"
import useDashboardAlert from "./hooks"
import PrimaryButton from "../../component/button/PrimaryButton"
import { MdDelete, MdEdit } from "react-icons/md"
import ModalAlert from "./ModalAlert"

const DashboardAlert = () => {

    const {
        page,
        setPage,
        loading,
        list,
        openModal,
        isModalOpen,
        closeModal,
        form,
        isSubmitting,
        editingAlert,
        handleDelete,
        handleEdit,
        handleSubmit
    } = useDashboardAlert()

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader />
            </div>
        );
    }

    return (
        <>
            <div className="p-4">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <Title className="text-3xl font-bold">Alerts</Title>
                        <Text className="text-gray-600">
                            Monitor and configure your alert settings
                        </Text>
                    </div>
                    <PrimaryButton onClick={openModal}>
                        Create New
                    </PrimaryButton>
                </div>

                {list?.results?.length < 1 ? (
                    <div className="border-2 border-dashed rounded-lg p-12 text-center">
                        <p className="text-gray-500 mb-4">No Alert connectionured yet</p>
                        <PrimaryButton onClick={openModal}>
                            Create Your First Alert
                        </PrimaryButton>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {list?.results?.map((alert) => (
                            <div key={alert.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold">{alert.title}</h3>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <ActionIcon
                                            className="!bg-gray-50 !text-gray-600 hover:!bg-gray-100"
                                            onClick={() => handleEdit(alert?.id)}
                                            title="Edit"
                                        >
                                            <MdEdit size={18} />
                                        </ActionIcon>
                                        <ActionIcon
                                            className="!bg-red-50 !text-red-600 hover:!bg-red-100"
                                            onClick={() => handleDelete(alert.id)}
                                            title="Delete"
                                        >
                                            <MdDelete size={18} />
                                        </ActionIcon>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="flex justify-end mt-4">
                            <Pagination
                                total={list?.totalPages}
                                value={page}
                                onChange={setPage}
                            />
                        </div>
                    </div>

                )}


            </div>

            <ModalAlert
                modalOpened={isModalOpen}
                closeModal={closeModal}
                editingAlert={editingAlert}
                form={form}
                handleSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            />
        </>
    )
}

export default DashboardAlert