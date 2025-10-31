import React from "react";
import { useErrorMessage } from "../../hooks/useMessage";
import { getCurrentUser } from "../../api/user";

//@ts-check
const useUserContext = () => {

    const [user, setUser] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const ErrorMessage = useErrorMessage()

    const controllerRef = React.useRef(null);

    const fetchUser = React.useCallback(async () => {
        const controller = new AbortController();
        controllerRef.current = controller;

        try {
            setIsLoading(true)
            const u = await getCurrentUser(controller.signal)
            if (u) {
                setUser(u)
            }
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsLoading(false)
        }
    }, [ErrorMessage])


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