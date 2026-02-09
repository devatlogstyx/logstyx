//@ts-check

import React from "react";
import { useErrorMessage } from "../../../hooks/useMessage";
import { generateColor } from "../../../utils/function";
import useAPI from "../../../hooks/useAPI";

const useProjectViews = () => {

    const [projects, setProjects] = React.useState([])
    const [isLoading, setIsLoading] = React.useState(true)

    const ErrorMessage = useErrorMessage()

    const api = useAPI("/v1/users/me/project-stats")
    const fetchData = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const r = await api.list()
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
    }, [ErrorMessage, api])


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