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
        await userLogout(controller.signal).catch(console.error)
        await refetchUser().catch(console.error)
    }, [navigate, controller])


    React.useEffect(() => {
        handleuserLogout()
    }, [handleuserLogout])

    return null

}

export default useLogout