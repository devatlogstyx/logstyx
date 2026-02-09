//@ts-check

import { useForm } from "@mantine/form";
import React from "react";
import { useErrorMessage } from "../../../hooks/useMessage";
import useAPI from "../../../hooks/useAPI";

const useUpdateUserInvitation = ({
    initialValues,
    invitationId,
    onUpdate
}) => {

    const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    const ErrorMessage = useErrorMessage()

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            ...initialValues
        },
    });

    const api = useAPI(`/v1/user-invitations`)

    const handleUpdateInvitation = React.useCallback(async (payload) => {
        try {
            setIsSubmitting(true)
            await api.put(invitationId, payload)
            onUpdate()
            form.reset()
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsEditModalVisible(false)
            setIsSubmitting(false)
        }
    }, [ErrorMessage, api, onUpdate, form, invitationId])

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