//@ts-check

import { Title, Text, Modal, TextInput, Select, Switch, Textarea, Badge, ActionIcon, Loader } from '@mantine/core';

import { MdEdit, MdDelete, MdPlayArrow } from 'react-icons/md';
import PrimaryButton from "./../../component/button/PrimaryButton";
import useDashboardWebhook from './hooks';
import ModalWebhook from './ModalWebhook';

const DashboardWebhook = () => {

    const {
        form,
        loading,
        openModal,
        webhooks,
        handleDelete,
        modalOpened,
        closeModal,
        editingWebhook,
        handleSubmit,
        isSubmitting,
        handleEdit,
        ConfirmDialogComponent
    } = useDashboardWebhook()
    const authType = form.values.connection?.auth?.type;

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
                        <Title className="text-3xl font-bold">Webhooks</Title>
                        <Text className="text-gray-600">
                            Manage your webhook endpoints to receive real-time notifications and integrate with external services
                        </Text>
                    </div>
                    <PrimaryButton onClick={openModal}>
                        Create New
                    </PrimaryButton>
                </div>

                {webhooks.length === 0 ? (
                    <div className="border-2 border-dashed rounded-lg p-12 text-center">
                        <p className="text-gray-500 mb-4">No webhooks connectionured yet</p>
                        <PrimaryButton onClick={openModal}>
                            Create Your First Webhook
                        </PrimaryButton>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {webhooks.map((webhook) => (
                            <div key={webhook.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold">{webhook.title}</h3>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <ActionIcon
                                            className="!bg-gray-50 !text-gray-600 hover:!bg-gray-100"
                                            onClick={()=>handleEdit(webhook?.id)}
                                            title="Edit"
                                        >
                                            <MdEdit size={18} />
                                        </ActionIcon>
                                        <ActionIcon
                                            className="!bg-red-50 !text-red-600 hover:!bg-red-100"
                                            onClick={() => handleDelete(webhook.id)}
                                            title="Delete"
                                        >
                                            <MdDelete size={18} />
                                        </ActionIcon>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ModalWebhook
                modalOpened={modalOpened}
                closeModal={closeModal}
                editingWebhook={editingWebhook}
                form={form}
                handleSubmit={handleSubmit}
                authType={authType}
                isSubmitting={isSubmitting}
            />
            <ConfirmDialogComponent />
        </>
    );
};

export default DashboardWebhook;