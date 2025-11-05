import React from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { useErrorMessage } from "../../hooks/useMessage"
import { findProjectBySlug, listProjectUser } from "../../api/project"

//@ts-check
const useDashboardProjectDetail = () => {

    const ErrorMessage = useErrorMessage()
    const { slug } = useParams()
    const [searchParams, setSearchParams] = useSearchParams();


    const controller = React.useMemo(() => new AbortController(), []);

    const [project, setProject] = React.useState(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [activeTab, setActiveTab] = React.useState('overview');
    const [users, setUsers] = React.useState([]);

    const fetchData = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const p = await findProjectBySlug(controller.signal, slug)
            setProject(p)

            const u = await listProjectUser(controller.signal, p?.id)
            setUsers(u)

        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsLoading(false)
        }
    }, [ErrorMessage, controller, slug])


    const logs = [
        {
            id: 1,
            key: 'auth.login.failed',
            level: 'error',
            count: 45,
            lastSeen: '2024-11-02T08:15:00Z',
            device: { browser: 'Chrome', os: 'Windows' },
        },
        {
            id: 2,
            key: 'api.response.slow',
            level: 'warning',
            count: 128,
            lastSeen: '2024-11-02T07:30:00Z',
            device: { browser: 'Safari', os: 'macOS' },
        },
        {
            id: 3,
            key: 'user.signup.success',
            level: 'info',
            count: 234,
            lastSeen: '2024-11-02T06:45:00Z',
            device: { browser: 'Firefox', os: 'Linux' },
        },
    ];

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
        logs,
        users,
        refetchData: fetchData,
        changeActiveTab: (tab) => setSearchParams({ tab })
    }

}

export default useDashboardProjectDetail