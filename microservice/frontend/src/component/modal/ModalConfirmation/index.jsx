// @ts-check
"use client";
import { Modal, Button, Text } from "@mantine/core";
import React from "react";
import PrimaryButton from "../../button/PrimaryButton";
import SecondaryButton from "../../button/SecondaryButton";
import DangerButton from "../../button/DangerButton";

export default function ModalConfirm({
    title = 'Are you sure?',
    message = 'Do you want to proceed with this action?',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm = async () => { },
    onCancel = () => { },
    opened,
    onClose,
}) {
    const [loading, setLoading] = React.useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            await onConfirm();
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (!loading) {
            onCancel();
            onClose();
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={handleCancel}
            title={title}
            centered
            overlayProps={{ opacity: 0.55, blur: 3 }}
        >
            <Text>{message}</Text>
            <div className="flex justify-end space-x-2">
                <SecondaryButton onClick={handleCancel} >
                    {cancelLabel}
                </SecondaryButton>
                <DangerButton disabled={loading} onClick={handleConfirm}>
                    {confirmLabel}
                </DangerButton>
            </div>
        </Modal>
    );
}

