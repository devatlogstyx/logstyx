//@ts-check

import React from "react";
import { useErrorMessage } from "../../../hooks/useMessage";
import { getUserDashboardProjectStats } from "../../../api/user";
import { generateColor } from "../../../utils/function";

const useProjectViews = () => {

    const [projects, setProjects] = React.useState([])
    const ErrorMessage = useErrorMessage()

    const controller = React.useMemo(() => new AbortController(), []);

    const fetchData = React.useCallback(async () => {
        try {
            const r = await getUserDashboardProjectStats(controller.signal)
            console.log(r)
            setProjects(r?.map((n) => {
                return {
                    ...n,
                    color: generateColor(n?.title)
                }
            }))

        } catch (e) {
            ErrorMessage(e)
        }
    }, [ErrorMessage, controller])


    React.useEffect(() => {
        fetchData()
    }, [fetchData])

    return {
        projects
    }

}

export default useProjectViews