//@ts-check

import React from "react"
import { userLogout } from "../../api/user"
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/useUser";

const useLogout = () => {
    const navigate = useNavigate();
    const controller = React.useMemo(() => new AbortController(), []);
    const { refetchUser } = useUser()

    const handleuserLogout = React.useCallback(async () => {
        try {
            await userLogout(controller.signal)
            await refetchUser()
        } catch (e) {
            console.error(e)
        } finally {
            navigate(`/`)
        }
    }, [navigate, controller])


    React.useEffect(() => {
        handleuserLogout()
    }, [handleuserLogout])

    return null

}

export default useLogout