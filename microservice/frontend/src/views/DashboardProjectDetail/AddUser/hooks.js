//@ts-check

import { useForm } from "@mantine/form";
import React from "react"
import { useErrorMessage } from "../../../hooks/useMessage";
import useAPI from "../../../hooks/useAPI";

const useAddUser = ({
    projectId,
    projectUsers,
    onUpdate
}) => {
    const ErrorMessage = useErrorMessage()

    const [isModalVisible, setIsModalVisible] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [users, setUsers] = React.useState([]);
    const api = useAPI("/v1/users")

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            userId: ""
        },
    });

    const fetchData = React.useCallback(async () => {
        try {
            const u = await api.listAll({})
            const idsInA = new Set(projectUsers.map(item => item.id));
            // @ts-ignore
            setUsers(u.filter(item => !idsInA.has(item.id)))

        } catch (e) {
            ErrorMessage(e)
        }
    }, [ErrorMessage, api, projectUsers])

    const handleAddUser = React.useCallback(async (values) => {
        try {
            setIsSubmitting(true)

            await api.custom("post", `/${projectId}/users/${values?.userId}`, {})
            onUpdate()
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsSubmitting(false)
        }
    }, [ErrorMessage, api, projectId, onUpdate])

    React.useEffect(() => {
        fetchData()
    }, [fetchData])

    return {
        isModalVisible,
        isSubmitting,
        form,
        users,
        openModal: () => setIsModalVisible(true),
        closeModal: () => setIsModalVisible(false),
        handleAddUser
    }
}

export default useAddUser