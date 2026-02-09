//@ts-check

import React, { useCallback } from "react"
import { useErrorMessage } from "../../../hooks/useMessage"
import ModalLogDetail from "../ModalLogDetail"
import ModalTimeline from "../ModalTimeline"
import { sanitizeObject } from "../../../utils/function"
import useAPI from "../../../hooks/useAPI"


const useBucketLogs = ({ bucket }) => {

    // ✅ Include both indexes and rawIndexes
    const fields = [...new Set([
        ...bucket?.settings?.indexes || [],
        ...bucket?.settings?.rawIndexes || [],
        "level",
    ])]

    // Helper to check if field is a raw index
    const isRawIndex = useCallback((field) => {
        return bucket?.settings?.rawIndexes?.includes(field)
    }, [bucket])

    const [isLoading, setIsLoading] = React.useState(true)
    const [isFieldLoading, setIsFieldLoading] = React.useState({})

    const [page, setPage] = React.useState(1)

    // ✅ Filter now includes operator field
    const [filters, setFilters] = React.useState([])
    // Filter structure: { id, field, value, operator }

    const [fieldValues, setFieldValues] = React.useState({})

    const [list, setList] = React.useState({})
    const [sortConfig, setSortConfig] = React.useState({ key: null, direction: 'asc' });

    const [visibleColumns, setVisibleColumns] = React.useState(
        fields?.sort((a, b) => a?.localeCompare(b))?.reduce((acc, col) => {
            acc[col] = true;
            return acc;
        }, {}) || {}
    );

    const api = useAPI("/v1/buckets");

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
        bucketId: bucket?.id,
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
            bucketId: bucket?.id,
        });
    };

    const ErrorMessage = useErrorMessage()

    const logsControllerRef = React.useRef(null)
    const fieldValuesControllersRef = React.useRef({})

    // ✅ Add filter with default operator
    const addFilter = () => {
        // @ts-ignore
        setFilters(prev => [...prev, {
            id: Date.now(),
            field: "",
            value: "",
            operator: "eq" // Default operator
        }])
    }

    const removeFilter = (filterId) => {
        setFilters(prev => prev.filter(f => f.id !== filterId))
        setFieldValues(prev => {
            const newValues = { ...prev }
            delete newValues[filterId]
            return newValues
        })
    }

    // ✅ Update filter field and reset operator if switching between raw/hashed
    const updateFilterField = (filterId, field) => {
        setFilters(prev => prev.map(f =>
            f.id === filterId ? {
                ...f,
                field,
                value: "",
                operator: isRawIndex(field) ? "eq" : "eq" // Keep operator for raw indexes
            } : f
        ))
        setFieldValues(prev => {
            const newValues = { ...prev }
            delete newValues[filterId]
            return newValues
        })
    }

    const updateFilterValue = (filterId, value) => {
        setFilters(prev => prev.map(f =>
            f.id === filterId ? { ...f, value } : f
        ))
    }

    // ✅ Add function to update operator
    const updateFilterOperator = (filterId, operator) => {
        setFilters(prev => prev.map(f =>
            f.id === filterId ? { ...f, operator } : f
        ))
    }

    const fetchData = React.useCallback(async () => {
        // Check if any filter has a field but no value
        const hasIncompleteFilter = filters.some(f => !f.field || f.value === "All" || !f.value)
        if (hasIncompleteFilter && filters?.length > 0) {
            return
        }

        if (logsControllerRef.current) {
            logsControllerRef.current.abort()
        }

        logsControllerRef.current = new AbortController()

        try {
            setIsLoading(true)

            // ✅ Build filter arrays including operators
            const filterFields = []
            const filterValues = []
            const filterOperators = []

            filters.forEach((filter) => {
                if (filter.field && filter.value && filter.value !== "All") {
                    filterFields.push(filter.field)
                    filterValues.push(filter.value)
                    filterOperators.push(filter.operator || "eq")
                }
            })

            const l = await api.custom("get", `/${bucket?.id}/logs`,
                {
                    params: sanitizeObject({
                        filterField: filterFields.length > 0 ? filterFields : undefined,
                        filterValue: filterValues.length > 0 ? filterValues : undefined,
                        filterOperator: filterOperators.length > 0 ? filterOperators : undefined, // ✅ Add operators
                        page,
                        sortBy: sortConfig?.key ? `${sortConfig.key}:${sortConfig.direction}` : undefined
                    })
                }
            )
            setList(l)

        } catch (e) {
            if (e.name !== 'AbortError') {
                ErrorMessage(e)
            }
        } finally {
            setIsLoading(false)
        }
    }, [ErrorMessage, page, bucket, filters, sortConfig])

    // Fetch field values for each filter
    React.useEffect(() => {
        const fetchAllFieldValues = async () => {
            for (const filter of filters) {
                if (!filter.field) {
                    setFieldValues(prev => {
                        const newValues = { ...prev }
                        delete newValues[filter.id]
                        return newValues
                    })
                    continue
                }

                // ✅ Skip fetching distinct values for raw indexes with non-eq operators
                // (range queries don't need a dropdown of values)
                if (isRawIndex(filter.field) && filter.operator !== 'eq') {
                    setFieldValues(prev => {
                        const newValues = { ...prev }
                        delete newValues[filter.id]
                        return newValues
                    })
                    continue
                }

                setIsFieldLoading(prev => ({ ...prev, [filter.id]: true }))

                try {
                    if (fieldValuesControllersRef.current[filter.id]) {
                        fieldValuesControllersRef.current[filter.id].abort()
                    }

                    fieldValuesControllersRef.current[filter.id] = new AbortController()

                    const f = await api.custom("get", `/${bucket?.id}/logs/field-values`, {
                        params: {
                            field: filter.field
                        }
                    }
                    )
                    setFieldValues(prev => ({
                        ...prev,
                        [filter.id]: f?.sort((a, b) => a?.localeCompare(b))
                    }))
                } catch (e) {
                    if (e.name !== 'AbortError') {
                        console.error('Error fetching field values:', e)
                    }
                    setFieldValues(prev => {
                        const newValues = { ...prev }
                        delete newValues[filter.id]
                        return newValues
                    })
                } finally {
                    setIsFieldLoading(prev => ({ ...prev, [filter.id]: false }))
                }
            }
        }

        fetchAllFieldValues()
    }, [filters, bucket?.id, isRawIndex])

    React.useEffect(() => {
        fetchData()

        return () => {
            if (logsControllerRef.current) {
                logsControllerRef.current.abort()
            }

            Object.values(fieldValuesControllersRef.current).forEach(controller => {
                if (controller) controller.abort()
            })
        }
    }, [fetchData])

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
        isFieldLoading,
        page,
        setPage,
        DetailModalComponent,
        openDetailModal,
        TimelineModalComponent,
        openTimelineModal,
        SortIcon,
        handleSort,
        visibleColumns,
        toggleColumn,
        filters,
        fields,
        addFilter,
        removeFilter,
        updateFilterField,
        updateFilterValue,
        updateFilterOperator, // Export new function
        fieldValues,
        refetchData: fetchData,
        isRawIndex // Export helper function for UI to use
    }
}

export default useBucketLogs