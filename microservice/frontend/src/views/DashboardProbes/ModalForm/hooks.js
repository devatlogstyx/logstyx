//@ts-check

import React, { useState } from "react";
import { useErrorMessage, useSuccessMessage } from "../../../hooks/useMessage";
import { testProbeConnection } from "../../../api/probes";
/**
 * 
 * @param {*} param0 
 * @returns 
 */
const useModalForm = ({
    form,
}) => {
    const ErrorMessage = useErrorMessage()
    const SuccessMessage = useSuccessMessage()
    const [isTesting, setIsTesting] = useState(false)

    const controller = React.useMemo(() => new AbortController(), []);

    const handleTestConnection = React.useCallback(async () => {
        try {
            setIsTesting(true)
            await testProbeConnection(controller.signal, form?.values?.connection)
            SuccessMessage(`Connected successfully`)
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsTesting(false)
        }
    }, [ErrorMessage, controller, form, SuccessMessage])

    const [currentStep, setCurrentStep] = useState(1);

    const goToNextStep = () => setCurrentStep((prevStep) => Math.min(prevStep + 1, 3));
    const goToPreviousStep = () => setCurrentStep((prevStep) => Math.max(prevStep - 1, 1));


    return {
        isTesting,
        handleTestConnection,
        currentStep,
        goToPreviousStep,
        goToNextStep,
    }
}

export default useModalForm