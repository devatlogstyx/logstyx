import React from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { useErrorMessage } from "../../hooks/useMessage"
import UserContext from "../../context/UserContext"
import { READ_USER_USER_ROLE } from "../../utils/constant"
import useAPI from "../../hooks/useAPI"

//@ts-check
const useDashboardProjectDetail = () => {

    const ErrorMessage = useErrorMessage()
    const { slug } = useParams()
    const [searchParams, setSearchParams] = useSearchParams();

    const { user } = React.useContext(UserContext)
    
    const [project, setProject] = React.useState(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [activeTab, setActiveTab] = React.useState('overview');
    const [users, setUsers] = React.useState([]);
    const [logStatistic, setLogStatistic] = React.useState([]);

    const api = useAPI("/v1/projects")

    const fetchData = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const p = await api.get(slug)
            setProject(p)

            const [u, l] = await Promise.all([
                api.custom("get", `/${p?.id}/users`, {}),
                api.custom("get", `/${p?.id}/logs-statistic`, {}),
            ])
            setLogStatistic(l)
            setUsers(u)

        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsLoading(false)
        }
    }, [ErrorMessage, api, slug])

    React.useEffect(() => {
        fetchData()
    }, [fetchData])

    React.useEffect(() => {
        setActiveTab(searchParams.get('tab'))
    }, [searchParams])

    return {
        project,
        isLoading,
        activeTab,
        logStatistic,
        users,
        refetchData: fetchData,
        changeActiveTab: (tab) => setSearchParams({ tab }),
        canSeeUserTab: user?.permissions?.includes(READ_USER_USER_ROLE)
    }

}

export default useDashboardProjectDetail