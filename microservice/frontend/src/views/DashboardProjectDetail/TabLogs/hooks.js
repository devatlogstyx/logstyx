//@ts-check

import React from "react"
import { useErrorMessage } from "../../../hooks/useMessage"
import { paginateProjectLogs } from "../../../api/project"
import ModalLogDetail from "../ModalLogDetail"
import ModalTimeline from "../ModalTimeline"

const useTabLogs = ({ projectId }) => {
    const [isLoading, setIsLoading] = React.useState(true)
    const [page, setPage] = React.useState(1)
    const [level, setLevel] = React.useState("")
    const [list, setList] = React.useState({})

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
        projectId,
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
            projectId,
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
                projectId,
                { level, page }
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
    }, [ErrorMessage, page, projectId, level])

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
        openTimelineModal
    }
}

export default useTabLogs