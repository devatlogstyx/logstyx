//@ts-check

import React from "react"
import { userLogout } from "../../api/user"
import { useNavigate } from "react-router-dom";

const useLogout = () => {
    const navigate = useNavigate();
    const controller = React.useMemo(() => new AbortController(), []);

    const handleuserLogout = React.useCallback(async () => {
        try {
            await userLogout(controller.signal)
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