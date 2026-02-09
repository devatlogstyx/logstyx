//@ts-check

import React from "react"
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/useUser";
import useAPI from "../../hooks/useAPI";

const useLogout = () => {
    const navigate = useNavigate();
    const { refetchUser } = useUser()

    const api = useAPI(`/v1/users`)

    const handleuserLogout = React.useCallback(async () => {
        try {
            await api.custom("post", `/logout`, {})
            await refetchUser()
        } catch (e) {
            console.error(e)
        } finally {
            navigate(`/`)
        }
    }, [navigate, api, refetchUser])


    React.useEffect(() => {
        handleuserLogout()
    }, [handleuserLogout])

    return null

}

export default useLogout