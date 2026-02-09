import React from "react";
import { useErrorMessage } from "../../hooks/useMessage";
import useAPI from "../../hooks/useAPI";

//@ts-check
const useUserContext = () => {

    const [user, setUser] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const ErrorMessage = useErrorMessage()

    const api = useAPI("/v1/users")

    const fetchUser = React.useCallback(async () => {

        try {
            setIsLoading(true)
            const u = await api.get("me")
            if (!u) {
                throw new Error(`Not login`)
            }
            setUser(u)
        } catch (e) {
            setUser(null)
            ErrorMessage(e)
        } finally {
            setIsLoading(false)
        }
    }, [ErrorMessage, api])


    React.useEffect(() => {
        fetchUser()
        return () => {
            controllerRef.current?.abort()
        }
    }, [fetchUser]);

    return {
        user,
        isLoading,
        refetchUser: fetchUser
    }
}

export default useUserContext