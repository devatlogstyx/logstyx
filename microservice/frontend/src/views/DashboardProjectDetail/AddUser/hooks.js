//@ts-check

import { useForm } from "@mantine/form";
import React from "react"
import { listAllUser } from "../../../api/user";
import { useErrorMessage } from "../../../hooks/useMessage";
import { addUserToProject } from "../../../api/project";

const useAddUser = ({
    projectId,
    projectUsers,
    onUpdate
}) => {
    const ErrorMessage = useErrorMessage()
    const controller = React.useMemo(() => new AbortController(), []);

    const [isModalVisible, setIsModalVisible] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [users, setUsers] = React.useState([]);

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            userId: ""
        },
    });
    
    const fetchData = React.useCallback(async () => {
        try {
            const u = await listAllUser(controller.signal)
            const idsInA = new Set(projectUsers.map(item => item.id));
            // @ts-ignore
            setUsers(u.filter(item => !idsInA.has(item.id)))

        } catch (e) {
            ErrorMessage(e)
        }
    }, [ErrorMessage, controller, projectUsers])

    const handleAddUser = React.useCallback(async (values) => {
        try {
            setIsSubmitting(true)

            await addUserToProject(controller.signal, projectId, values?.userId)
            onUpdate()
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsSubmitting(false)
        }
    }, [ErrorMessage, controller, projectId, onUpdate])

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