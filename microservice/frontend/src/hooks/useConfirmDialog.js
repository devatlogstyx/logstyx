import React from 'react';
import ModalConfirm from "./../component/modal/ModalConfirmation/index";

export function useConfirmDialog() {
    const [dialogProps, setDialogProps] = React.useState({
        opened: false,
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        onConfirm: () => { },
        onCancel: () => { },
    });

    const openConfirmDialog = ({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel }) => {
        setDialogProps({
            opened: true,
            title,
            message,
            confirmLabel,
            cancelLabel,
            onConfirm: async () => {
                await onConfirm();
                closeConfirmDialog();
            },
            onCancel: () => {
                onCancel && onCancel();
                closeConfirmDialog();
            },
        });
    };

    const closeConfirmDialog = () => {
        setDialogProps((prev) => ({ ...prev, opened: false }));
    };

    const ConfirmDialogComponent = () => 
        React.createElement(ModalConfirm, { ...dialogProps, onClose: closeConfirmDialog });

    return { openConfirmDialog, ConfirmDialogComponent };
}