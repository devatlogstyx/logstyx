//@ts-check

import { useMemo, useRef, useEffect } from "react"
import { createAPI } from "../api/createAPI"

const useAPI = (endpoint) => {
    const controllerRef = useRef(null)

    // Create a new controller for each endpoint change
    const api = useMemo(() => {
        // Abort previous request if it exists
        if (controllerRef.current) {
            controllerRef.current.abort()
        }
        
        controllerRef.current = new AbortController()
        return createAPI(endpoint, controllerRef.current.signal)
    }, [endpoint])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (controllerRef.current) {
                controllerRef.current.abort()
            }
        }
    }, [])

    return api
}

export default useAPI