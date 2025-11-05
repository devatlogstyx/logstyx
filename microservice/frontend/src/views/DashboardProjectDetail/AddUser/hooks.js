//@ts-check

import { useForm } from "@mantine/form";
import React from "react"
import { listAllUser } from "../../../api/user";
import { useErrorMessage } from "../../../hooks/useMessage";

const useAddUser = () => {
    const ErrorMessage = useErrorMessage()
    const controller = React.useMemo(() => new AbortController(), []);

    const [isModalVisible, setIsModalVisible] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [users, setUsers] = React.useState([]);

    const fetchData = React.useCallback(async () => {
        try {
            const u = await listAllUser(controller.signal)
            setUsers(u)

        } catch (e) {
            ErrorMessage(e)
        }
    }, [ErrorMessage, controller])

    React.useEffect(() => {
        fetchData()
    }, [fetchData])

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            userId: ""
        },
    });

    const handleAddUser = () => {

    }

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