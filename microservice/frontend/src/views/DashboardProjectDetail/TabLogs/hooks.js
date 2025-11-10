//@ts-check

import React from "react"
import { useErrorMessage } from "../../../hooks/useMessage"
import { paginateProjectLogs } from "../../../api/project"
import ModalLogDetail from "../ModalLogDetail"
import ModalTimeline from "../ModalTimeline"
import { sanitizeObject } from "../../../utils/function"

const useTabLogs = ({ project }) => {
    const [isLoading, setIsLoading] = React.useState(true)
    const [page, setPage] = React.useState(1)
    const [level, setLevel] = React.useState("")
    const [list, setList] = React.useState({})
    const [sortConfig, setSortConfig] = React.useState({ key: null, direction: 'asc' });

    // Add state for column visibility
    const [visibleColumns, setVisibleColumns] = React.useState(
        project?.settings?.indexes?.sort((a, b) => a?.localeCompare(b))?.reduce((acc, col) => {
            acc[col] = true;
            return acc;
        }, {}) || {}
    );

    // Toggle function
    const toggleColumn = (columnName) => {
        setVisibleColumns(prev => ({
            ...prev,
            [columnName]: !prev[columnName]
        }));
    };

    const [detailModalProps, setDetailModalProps] = React.useState({
        opened: false,
        log: null,
    });

    const closeDetailModal = () => {
        setDetailModalProps((prev) => ({ ...prev, opened: false }));
    };

    const DetailModalComponent = () =>
        React.createElement(ModalLogDetail, { ...detailModalProps, onClose: closeDetailModal });

    const openDetailModal = (/** @type {any} */ log) => {
        setDetailModalProps({
            opened: true,
            log
        });
    };

    const [timelineModalProps, setTimelineModalProps] = React.useState({
        opened: false,
        logKey: "",
        projectId: project?.id,
    });

    const closeTimelineModal = () => {
        setTimelineModalProps((prev) => ({ ...prev, opened: false }));
    };

    const TimelineModalComponent = () =>
        React.createElement(ModalTimeline, { ...timelineModalProps, onClose: closeTimelineModal });

    const openTimelineModal = (/** @type {any} */ logKey) => {
        setTimelineModalProps({
            opened: true,
            logKey,
            projectId: project?.id,
        });
    };


    const ErrorMessage = useErrorMessage()

    // Create new controller for each fetch to allow proper cancellation
    const controllerRef = React.useRef(null)

    const fetchData = React.useCallback(async () => {
        // Cancel previous request if still pending
        if (controllerRef.current) {
            controllerRef.current.abort()
        }

        controllerRef.current = new AbortController()

        try {
            setIsLoading(true)
            const l = await paginateProjectLogs(
                controllerRef.current.signal,
                project?.id,
                sanitizeObject({ level, page, sortBy: sortConfig?.key ? `${sortConfig.key}:${sortConfig.direction}` : undefined })
            )
            setList(l)
        } catch (e) {
            // Don't show error for aborted requests
            if (e.name !== 'AbortError') {
                ErrorMessage(e)
            }
        } finally {
            setIsLoading(false)
        }
    }, [ErrorMessage, page, project, level, sortConfig])

    React.useEffect(() => {
        fetchData()

        // Cleanup: abort on unmount
        return () => {
            if (controllerRef.current) {
                controllerRef.current.abort()
            }
        }
    }, [fetchData])

    const handleLevelChange = React.useCallback((newLevel) => {
        if (newLevel === "All Levels") {
            newLevel = null
        }
        setLevel(newLevel)
        setPage(1)
    }, [])

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return null;
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    const handleSort = (key) => {
        setSortConfig(prevConfig => ({
            key,
            direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };


    return {
        list,
        isLoading,
        page,
        setPage,
        level,
        setLevel: handleLevelChange,
        DetailModalComponent,
        openDetailModal,
        TimelineModalComponent,
        openTimelineModal,
        SortIcon,
        handleSort,
        visibleColumns,
        toggleColumn
    }
}

export default useTabLogs