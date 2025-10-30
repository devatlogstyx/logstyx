//@ts-check
import React from "react"
import { useErrorMessage } from "../../hooks/useMessage"
import { getCurrentUser } from "../../api/user"
import { useNavigate } from "react-router-dom"
const useDashboard = () => {
    const ErrorMessage = useErrorMessage()
    const navigate = useNavigate()


    const fetchUser = React.useCallback(async (/** @type {any} */ signal) => {
        try {
            const user = await getCurrentUser(signal)
            if (!user) {
                throw new Error("Not login")
            }
        } catch (e) {
            navigate(`/login`)
            ErrorMessage(e)
        }
    }, [ErrorMessage, navigate])

    React.useEffect(() => {
        const controller = new AbortController();

        fetchUser(controller.signal)
        return () => {
            controller.abort();
        };


    }, [fetchUser])

    return {

    }
}

export default useDashboard