//@ts-check

import React from "react"
import { useErrorMessage } from "../../../hooks/useMessage"
import { listMyProject } from "../../../api/user"

const useSelectProject = () => {

    const controller = React.useMemo(() => new AbortController(), []);
    const [projects, setProjects] = React.useState([])
    const [isLoading, setIsLoading] = React.useState(false)

    const ErrorMessage = useErrorMessage()

    const fetchData = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const d = await listMyProject(controller.signal)
            setProjects(d)

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
        projects,
        isLoading
    }
}

export default useSelectProject