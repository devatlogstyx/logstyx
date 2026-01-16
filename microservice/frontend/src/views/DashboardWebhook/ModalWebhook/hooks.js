import { useState } from "react";
import { BEARER_WEBHOOK_AUTH_TYPE } from "../../../utils/constant";
import { extractMustacheVars } from "../../../utils/function";

export default function useModalWebhook({
    form,
    onClose
}) {

    const [step, setStep] = useState(0);
    const [mustacheVars, setMustacheVars] = useState([]);
    const [testValues, setTestValues] = useState({});
    const [testResult, setTestResult] = useState(null);
    const [isTesting, setIsTesting] = useState(false);

    // Extract {{variables}} from template
    

    // Provide sensible defaults for common variables
    const getDefaultValueForVar = (varName) => {
        const defaults = {
            'alert_title': 'Test Alert',
            'alert_message': 'This is a test message',
            'alert_severity': 'warning',
            'timestamp': Date.now().toString(),
            'timestamp_iso': new Date().toISOString(),
            'event_type': 'test_webhook',
        };

        if (defaults[varName]) return defaults[varName];
        if (varName.startsWith('log.')) return 'test_value';

        return '';
    };

    // Test webhook with sample values
    const handleTestWebhook = async () => {
        setIsTesting(true);
        setTestResult(null);

        try {
            // Render templates with test values
            let headers = form.values.connection.headers;
            let body = form.values.connection.body_template;

            Object.keys(testValues).forEach(varName => {
                const regex = new RegExp(`\\{\\{${varName}\\}\\}`, 'g');
                headers = headers.replace(regex, testValues[varName] || '');
                body = body.replace(regex, testValues[varName] || '');
            });

            // Make actual request
            const response = await fetch(form.values.connection.url, {
                method: form.values.connection.method,
                headers: JSON.parse(headers),
                body: form.values.connection.method !== 'GET' ? body : undefined
            });

            const responseData = await response.text();

            setTestResult({
                success: response.ok,
                message: response.ok ? 'Webhook executed successfully!' : `HTTP ${response.status}: ${response.statusText}`,
                response: responseData
            });
        } catch (err) {
            setTestResult({
                success: false,
                message: err.message,
                response: null
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleStep1Next = () => {
        const errors = form.validate();

        // Check only step 1 fields
        if (errors.hasErrors && (errors.errors.title || errors.errors['connection.url'])) {
            return; // Mantine will show inline errors
        }

        // Check auth fields
        const authType = form.values.connection.auth.type;
        if (authType === BEARER_WEBHOOK_AUTH_TYPE && !form.values.connection.auth.token) {
            alert('Bearer token is required');
            return;
        }
        // ... other auth checks

        setStep(1);
    };

    const handleStep2Next = () => {
        const errors = form.validate();

        // Check only step 2 fields
        if (errors.hasErrors && (errors.errors['connection.headers'] || errors.errors['connection.body_template'])) {
            return; // Mantine will show inline errors
        }

        // Extract mustache variables...
        const headerVars = extractMustacheVars(form.values.connection.headers);
        const bodyVars = extractMustacheVars(form.values.connection.body_template);
        const allVars = [...new Set([...headerVars, ...bodyVars])];
        setMustacheVars(allVars);

        const testVals = {};
        allVars.forEach(v => {
            testVals[v] = getDefaultValueForVar(v);
        });
        setTestValues(testVals);

        setStep(2);
    };

    const handleCloseModal = () => {
        setStep(0)
        onClose()
    }


    return {
        step,
        setStep,
        extractMustacheVars,
        setMustacheVars,
        mustacheVars,
        getDefaultValueForVar,
        setTestValues,
        testValues,
        testResult,
        handleTestWebhook,
        isTesting,
        handleStep1Next,
        handleStep2Next,
        handleCloseModal
    }
}