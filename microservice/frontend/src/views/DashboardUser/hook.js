//@ts-check

import React from "react";
import { useErrorMessage } from "../../hooks/useMessage";
import { listAllUserInvitation } from "../../api/user.invitation";
import { listAllUser } from "../../api/user";

const useDashboardUser = () => {
    const ErrorMessage = useErrorMessage()
    const controller = React.useMemo(() => new AbortController(), []);

    const [users, setUsers] = React.useState([]);
    const [invitations, setInvitations] = React.useState([]);
    const [activeTab, setActiveTab] = React.useState("users");

    const fetchData = React.useCallback(async () => {
        try {

            const [u, i] = await Promise.all([
                listAllUser(controller.signal),
                listAllUserInvitation(controller.signal)
            ])

            setUsers(u)
            setInvitations(i)

        } catch (e) {
            ErrorMessage(e)
        }
    }, [ErrorMessage, controller])



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