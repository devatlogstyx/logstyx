//@ts-check

import React, { useState } from "react";
import { useErrorMessage, useSuccessMessage } from "../../../hooks/useMessage";
import useAPI from "../../../hooks/useAPI";
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

    const testAPI = useAPI("/v1/probes/test-connection")
    const handleTestConnection = React.useCallback(async () => {
        try {
            setIsTesting(true)
            await testAPI.post(form?.values?.connection)
            SuccessMessage(`Connected successfully`)
        } catch (e) {
            ErrorMessage(e)
        } finally {
            setIsTesting(false)
        }
    }, [ErrorMessage, testAPI, form, SuccessMessage])

    const [currentStep, setCurrentStep] = useState(0);

    const goToNextStep = () => setCurrentStep((prevStep) => Math.min(prevStep + 1, 3));
    const goToPreviousStep = () => setCurrentStep((prevStep) => Math.max(prevStep - 1, 1));


    return {
        isTesting,
        handleTestConnection,
        currentStep,
        setCurrentStep,
        goToPreviousStep,
        goToNextStep,
    }
}

export default useModalForm