//@ts-check

import { useForm } from "@mantine/form";
import React from "react";
import { createUserInvitation } from "../../../api/user.invitation";
import { useErrorMessage } from "../../../hooks/useMessage";
import { READ_PROJECT_ROLE } from "../../../utils/constant";

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
            permissions: [READ_PROJECT_ROLE],
            projects: []
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
            form.reset()
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsInviteModalVisible(false)
            setIsSubmitting(false)
        }
    }, [ErrorMessage, controller, onCreate, form])

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