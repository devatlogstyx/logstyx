//@ts-check

import React from "react";
import { useErrorMessage } from "../../../hooks/useMessage";
import { getUserProjectStats } from "../../../api/user";
import { generateColor } from "../../../utils/function";

const useProjectViews = () => {

    const [projects, setProjects] = React.useState([])
    const [isLoading, setIsLoading] = React.useState(true)

    const ErrorMessage = useErrorMessage()

    const controller = React.useMemo(() => new AbortController(), []);

    const fetchData = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const r = await getUserProjectStats(controller.signal)
            setProjects(r?.map((n) => {
                return {
                    ...n,
                    color: generateColor(n?.title)
                }
            }))

        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsLoading(false)
        }
    }, [ErrorMessage, controller])


    React.useEffect(() => {
        fetchData()
    }, [fetchData])

    return {
        isLoading,
        projects,
        refetchData: fetchData
    }

}

export default useProjectViews