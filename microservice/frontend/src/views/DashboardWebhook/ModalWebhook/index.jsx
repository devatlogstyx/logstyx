//@ts-check

import { Modal, Select, Stepper, Textarea, TextInput } from "@mantine/core";
import SecondaryButton from "../../../component/button/SecondaryButton";
import PrimaryButton from "../../../component/button/PrimaryButton";
import { API_KEY_WEBHOOK_AUTH_TYPE, BASIC_WEBHOOK_AUTH_TYPE, BEARER_WEBHOOK_AUTH_TYPE, NONE_WEBHOOK_AUTH_TYPE } from "../../../utils/constant";
import useModalWebhook from "./hooks";


/**
 * 
 * @param {*} param0 
 * @returns 
 */
export default function ModalWebhook({
    modalOpened,
    closeModal,
    editingWebhook,
    form,
    handleSubmit,
    authType,
    isSubmitting
}) {
    const {
        step,
        setStep,
        mustacheVars,
        setTestValues,
        testValues,
        testResult,
        handleTestWebhook,
        isTesting,
        handleStep1Next,
        handleStep2Next,
        handleCloseModal
    } = useModalWebhook({ form, onClose: closeModal })
    return (
        <Modal
            opened={modalOpened}
            onClose={handleCloseModal}
            title={editingWebhook ? 'Edit Webhook' : 'Create Webhook'}
            size="lg"
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stepper active={step} >
                    <Stepper.Step label="Basic connectionuration" >
                        <div className="space-y-4">
                            <TextInput
                                label="Webhook Name"
                                placeholder="My Slack Webhook"
                                required
                                {...form.getInputProps('title')}
                            />

                            <TextInput
                                label="URL"
                                placeholder="https://hooks.slack.com/services/..."
                                required
                                {...form.getInputProps('connection.url')}
                            />

                            <Select
                                label="Method"
                                data={['GET', 'POST', 'PUT', 'PATCH', 'DELETE']}
                                {...form.getInputProps('connection.method')}
                            />

                            <Select
                                label="Authentication"
                                data={[
                                    { value: NONE_WEBHOOK_AUTH_TYPE, label: 'None' },
                                    { value: BEARER_WEBHOOK_AUTH_TYPE, label: 'Bearer Token' },
                                    { value: BASIC_WEBHOOK_AUTH_TYPE, label: 'Basic Auth' },
                                    { value: API_KEY_WEBHOOK_AUTH_TYPE, label: 'API Key' },
                                ]}
                                {...form.getInputProps('connection.auth.type')}
                            />

                            {authType === BEARER_WEBHOOK_AUTH_TYPE && (
                                <TextInput
                                    label="Bearer Token"
                                    type="password"
                                    placeholder="your-token-here"
                                    required
                                    {...form.getInputProps('connection.auth.token')}
                                />
                            )}

                            {authType === BASIC_WEBHOOK_AUTH_TYPE && (
                                <>
                                    <TextInput
                                        label="Username"
                                        required
                                        {...form.getInputProps('connection.auth.username')}
                                    />
                                    <TextInput
                                        label="Password"
                                        type="password"
                                        required
                                        {...form.getInputProps('connection.auth.password')}
                                    />
                                </>
                            )}

                            {authType === API_KEY_WEBHOOK_AUTH_TYPE && (
                                <>
                                    <TextInput
                                        label="Key Name"
                                        placeholder="X-API-Key"
                                        required
                                        {...form.getInputProps('connection.auth.key_name')}
                                    />
                                    <TextInput
                                        label="Key Value"
                                        type="password"
                                        placeholder="your-key-value"
                                        required
                                        {...form.getInputProps('connection.auth.key_value')}
                                    />
                                    <Select
                                        label="Key Location"
                                        data={[
                                            { value: 'header', label: 'Header' },
                                            { value: 'query', label: 'Query Parameter' }
                                        ]}
                                        {...form.getInputProps('connection.auth.key_location')}
                                    />
                                </>
                            )}

                            <div className="flex justify-end gap-2 pt-4">
                                <SecondaryButton type="button" onClick={handleCloseModal}>
                                    Cancel
                                </SecondaryButton>
                                <PrimaryButton type="button" onClick={handleStep1Next}>
                                    Next
                                </PrimaryButton>
                            </div>
                        </div>
                    </Stepper.Step>
                    <Stepper.Step label="Headers & Body Template" >
                        <div className="space-y-4">
                            <Textarea
                                label="Headers (JSON)"
                                description="Define custom headers for your webhook"
                                placeholder='{"Content-Type": "application/json", "X-Custom": "value"}'
                                classNames={{
                                    input: '!min-h-[150px] !font-mono !text-sm'
                                }}
                                {...form.getInputProps('connection.headers')}
                            />

                            <Textarea
                                label="Body Template (JSON)"
                                description="Use {{mustache}} variables like {{alert_title}}, {{log.data.field}}, {{log.context.field}}"
                                placeholder={'{\n  "title": "{{alert_title}}",\n  "message": "{{alert_message}}",\n  "severity": "{{alert_severity}}",\n  "log": {\n    "endpoint": "{{log.context.endpoint}}",\n    "error": "{{log.data.message}}"\n  }\n}'}
                                classNames={{
                                    input: '!min-h-[300px] !font-mono !text-sm'
                                }}
                                {...form.getInputProps('connection.body_template')}
                            />

                            <div className="flex justify-end gap-2 pt-4">
                                <SecondaryButton type="button" onClick={() => setStep(0)}>
                                    Back
                                </SecondaryButton>
                                <PrimaryButton type="button" onClick={handleStep2Next}>
                                    Next
                                </PrimaryButton>
                            </div>
                        </div>
                    </Stepper.Step>
                    <Stepper.Step label="Test Webhook">
                        <div className="space-y-4">
                            {mustacheVars.length > 0 ? (
                                <>
                                    <div className="text-sm text-gray-600 mb-4">
                                        Fill in test values for the variables found in your template:
                                    </div>

                                    <div className="max-h-96 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded">
                                        {mustacheVars.map((varName) => (
                                            <TextInput
                                                key={varName}
                                                label={varName}
                                                placeholder={`Enter test value for ${varName}`}
                                                value={testValues[varName] || ''}
                                                onChange={(e) => setTestValues({
                                                    ...testValues,
                                                    [varName]: e.target.value
                                                })}
                                            />
                                        ))}
                                    </div>

                                    {testResult && (
                                        <div className={`p-4 rounded border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                            <div className="font-medium mb-2">
                                                {testResult.success ? '✅ Test Successful' : '❌ Test Failed'}
                                            </div>
                                            <div className="text-sm">
                                                {testResult.message}
                                            </div>
                                            {testResult.response && (
                                                <details className="mt-2">
                                                    <summary className="cursor-pointer text-sm font-medium">Response</summary>
                                                    <pre className="mt-2 p-2 bg-white rounded text-xs overflow-x-auto">
                                                        {JSON.stringify(testResult.response, null, 2)}
                                                    </pre>
                                                </details>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-2 pt-4">
                                        <SecondaryButton type="button" onClick={() => setStep(1)}>
                                            Back
                                        </SecondaryButton>
                                        <SecondaryButton
                                            type="button"
                                            onClick={handleTestWebhook}
                                            disabled={isTesting}
                                        >
                                            {isTesting ? 'Testing...' : 'Test Webhook'}
                                        </SecondaryButton>
                                        <PrimaryButton type="submit" disabled={isSubmitting}>
                                            {isSubmitting ? 'Saving...' : editingWebhook ? 'Update' : 'Create'}
                                        </PrimaryButton>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="text-center py-8 text-gray-500">
                                        No variables found in your template. You can proceed to save.
                                    </div>
                                    <div className="flex justify-end gap-2 pt-4">
                                        <SecondaryButton type="button" onClick={() => setStep(1)}>
                                            Back
                                        </SecondaryButton>
                                        <PrimaryButton type="submit" disabled={isSubmitting}>
                                            {isSubmitting ? 'Saving...' : editingWebhook ? 'Update' : 'Create'}
                                        </PrimaryButton>
                                    </div>
                                </>
                            )}
                        </div>
                    </Stepper.Step>
                </Stepper>
            </form>
        </Modal>
    )
}