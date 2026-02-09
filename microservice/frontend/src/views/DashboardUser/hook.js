//@ts-check

import React from "react";
import { useErrorMessage } from "../../hooks/useMessage";
import useAPI from "../../hooks/useAPI";

const useDashboardUser = () => {
    const ErrorMessage = useErrorMessage()

    const [users, setUsers] = React.useState([]);
    const [invitations, setInvitations] = React.useState([]);
    const [activeTab, setActiveTab] = React.useState("users");
    const InvitationAPI = useAPI(`/v1/user-invitations`)
    const UserAPI = useAPI(`/v1/users`)

    const fetchData = React.useCallback(async () => {
        try {

            const [u, i] = await Promise.all([
                UserAPI.listAll({}),
                InvitationAPI.listAll()
            ])

            setUsers(u)
            setInvitations(i)

        } catch (e) {
            ErrorMessage(e)
        }
    }, [ErrorMessage, UserAPI, InvitationAPI])



    React.useEffect(() => {
        fetchData()

    }, [fetchData])

    return {
        users,
        activeTab,
        invitations,
        changeTab: setActiveTab,
        refetchData: fetchData
    }
}

export default useDashboardUser