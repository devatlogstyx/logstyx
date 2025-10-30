//@ts-check
import React from "react"
import { useErrorMessage } from "../../hooks/useMessage"
import { getCurrentUser } from "../../api/user"
const useLanding = () => {
    const ErrorMessage = useErrorMessage()

    const fetchUser = React.useCallback(async () => {
        try {
            const user = await getCurrentUser()
            if (!user) {
                throw new Error("Not login")
            }
        } catch (e) {
            ErrorMessage(e)
        }
    }, [ErrorMessage])

    React.useEffect(() => {
        fetchUser()
    }, [fetchUser])

    return {

    }
}

export default useLanding