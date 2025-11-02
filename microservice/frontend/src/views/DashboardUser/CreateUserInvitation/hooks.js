//@ts-check

import { useForm } from "@mantine/form";
import React from "react";
import { createUserInvitation } from "../../../api/user.invitation";
import { useErrorMessage } from "../../../hooks/useMessage";

const useCreateUserInvitation = ({
    onCreate
}) => {

    const [isInviteModalVisible, setIsInviteModalVisible] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const controller = React.useMemo(() => new AbortController(), []);
    const ErrorMessage = useErrorMessage()

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            email: '',
            permissions: [],
        },

        validate: {
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Please enter a valid email'),
        },
    });


    const handleCreateInvitation = React.useCallback(async (payload) => {
        try {
            setIsSubmitting(true)
            await createUserInvitation(controller.signal, payload)
            onCreate()
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsInviteModalVisible(false)
            setIsSubmitting(false)
        }
    }, [ErrorMessage, controller, onCreate])

    return {
        form,
        isInviteModalVisible,
        isSubmitting,
        showInviteModal: () => setIsInviteModalVisible(true),
        closeInviteModal: () => setIsInviteModalVisible(false),
        handleCreateInvitation
    }
}

export default useCreateUserInvitation