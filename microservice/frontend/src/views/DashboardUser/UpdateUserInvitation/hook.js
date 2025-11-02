//@ts-check

import { useForm } from "@mantine/form";
import React from "react";
import { updateUserInvitation } from "../../../api/user.invitation";
import { useErrorMessage } from "../../../hooks/useMessage";

const useUpdateUserInvitation = ({
    initialValues,
    invitationId,
    onUpdate
}) => {

    const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const controller = React.useMemo(() => new AbortController(), []);
    const ErrorMessage = useErrorMessage()

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            ...initialValues
        },
    });


    const handleUpdateInvitation = React.useCallback(async (payload) => {
        try {
            setIsSubmitting(true)
            await updateUserInvitation(controller.signal, invitationId, payload)
            onUpdate()
            form.reset()
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsEditModalVisible(false)
            setIsSubmitting(false)
        }
    }, [ErrorMessage, controller, onUpdate, form, invitationId])

    return {
        form,
        isEditModalVisible,
        isSubmitting,
        showInviteModal: () => setIsEditModalVisible(true),
        closeInviteModal: () => {
            setIsEditModalVisible(false)
            form.reset()
        },
        handleUpdateInvitation
    }
}

export default useUpdateUserInvitation