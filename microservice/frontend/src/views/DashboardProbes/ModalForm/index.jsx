import { JsonInput, Modal, NumberInput, PasswordInput, Select, TextInput, Button } from "@mantine/core";
import SecondaryButton from "../../../component/button/SecondaryButton";
import PrimaryButton from "../../../component/button/PrimaryButton";
import { BASIC_PROBE_AUTH_TYPE, BEARER_PROBE_AUTH_TYPE, CUSTOM_PROBE_AUTH_TYPE, NONE_PROBE_AUTH_TYPE, PROBESTYX_PROBE_AUTH_TYPE } from "../../../utils/constant";
import useModalForm from "./hooks";
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';


/**
 * Modal Form with Step-by-Step Navigation
 * 
 * @param {*} param0 
 * @returns 
 */
const ModalForm = ({
    isModalOpen,
    closeModal,
    editingProbe,
    form,
    handleSubmit,
    projectOptions,
    authType,
    isSubmitting
}) => {

    const {
        isTesting,
        handleTestConnection,
        currentStep,
        goToPreviousStep,
        goToNextStep,
    } = useModalForm({ form })

    const isStep1 = currentStep === 1;
    const isStep2 = currentStep === 2;
    const isStep3 = currentStep === 3;

    // Determine if the form is valid for the current step
    const isValidStep1 = form?.isValid() && form.values.title && form.values.project && form.values.delay;
    const isValidStep2 = form?.isValid() && form.values.connection.method && form.values.connection.url;

    return (
        <Modal
            opened={isModalOpen}
            onClose={closeModal}
            title={editingProbe ? 'Edit Probe' : 'Add Probe'}
            size="lg"
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <div className="space-y-4">
                    {/* Step 1 */}
                    {isStep1 && (
                        <>
                            <TextInput
                                label="Title"
                                placeholder="Web Server Metrics"
                                required
                                {...form.getInputProps('title')}
                            />

                            <Select
                                label="Project"
                                placeholder="Select project"
                                data={projectOptions}
                                required
                                searchable
                                {...form.getInputProps('project')}
                            />

                            <NumberInput
                                label="Interval (seconds)"
                                description="How often to fetch data"
                                placeholder="60"
                                min={5}
                                max={3600}
                                required
                                {...form.getInputProps('delay')}
                            />

                            <JsonInput
                                label="Context (optional)"
                                description="Additional fields to add to logs"
                                placeholder='{ "source": "probes", "hostname": "web-01" }'
                                formatOnBlur
                                autosize
                                minRows={3}
                                {...form.getInputProps('connection.context')}
                            />
                        </>
                    )}

                    {/* Step 2 */}
                    {isStep2 && (
                        <>
                            <Select
                                label="HTTP Method"
                                data={['GET', 'POST', 'PUT', 'PATCH', 'DELETE']}
                                required
                                {...form.getInputProps('connection.method')}
                            />

                            <TextInput
                                label="URL"
                                placeholder="http://server01:9100/metrics"
                                required
                                {...form.getInputProps('connection.url')}
                            />

                            <NumberInput
                                label="Timeout (ms)"
                                placeholder="10000"
                                min={1000}
                                max={60000}
                                {...form.getInputProps('connection.timeout')}
                            />

                            <Select
                                label="Authentication Type"
                                data={[
                                    { value: NONE_PROBE_AUTH_TYPE, label: 'None' },
                                    { value: PROBESTYX_PROBE_AUTH_TYPE, label: 'Probestyx' },
                                    { value: BEARER_PROBE_AUTH_TYPE, label: 'Bearer Token' },
                                    { value: BASIC_PROBE_AUTH_TYPE, label: 'Basic Auth' },
                                    { value: CUSTOM_PROBE_AUTH_TYPE, label: 'Custom Headers' }
                                ]}
                                required
                                {...form.getInputProps('connection.auth.type')}
                            />

                            {authType === PROBESTYX_PROBE_AUTH_TYPE && (
                                <PasswordInput
                                    label="Probestyx Secret"
                                    placeholder="your-secret-key"
                                    required
                                    {...form.getInputProps('connection.auth.secret')}
                                />
                            )}

                            {authType === BEARER_PROBE_AUTH_TYPE && (
                                <PasswordInput
                                    label="Bearer Token"
                                    placeholder="your-token"
                                    required
                                    {...form.getInputProps('connection.auth.token')}
                                />
                            )}

                            {authType === BASIC_PROBE_AUTH_TYPE && (
                                <>
                                    <TextInput
                                        label="Username"
                                        placeholder="username"
                                        required
                                        {...form.getInputProps('connection.auth.username')}
                                    />
                                    <PasswordInput
                                        label="Password"
                                        placeholder="password"
                                        required
                                        {...form.getInputProps('connection.auth.password')}
                                    />
                                </>
                            )}

                            {authType === CUSTOM_PROBE_AUTH_TYPE && (
                                <JsonInput
                                    label="Custom Headers"
                                    placeholder='{ "X-API-Key": "key123" }'
                                    formatOnBlur
                                    autosize
                                    minRows={3}
                                    {...form.getInputProps('connection.auth.headers')}
                                />
                            )}

                            <div className="flex justify-end">
                                <SecondaryButton disabled={isTesting} onClick={handleTestConnection}>Test Connection</SecondaryButton>
                            </div>
                        </>
                    )}

                    {/* Step 3 */}
                    {isStep3 && (
                        <div>
                            <h4>Review your inputs</h4>
                            <p><strong>Title:</strong> {form.values.title}</p>
                            <p><strong>Project:</strong> {form.values.project}</p>
                            <p><strong>Interval:</strong> {form.values.delay}</p>
                            <p><strong>Connection:</strong></p>
                            <SyntaxHighlighter language="json" style={docco}>
                                {JSON.stringify(form.values.connection, null, 2)}
                            </SyntaxHighlighter>
                        </div>
                    )}

                    {/* Navigation buttons */}
                    <div className="flex justify-between gap-2 pt-4">
                        {currentStep <= 1 && (
                            <SecondaryButton onClick={closeModal}>
                                Close
                            </SecondaryButton>
                        )}
                        {currentStep > 1 && (
                            <SecondaryButton onClick={goToPreviousStep}>
                                Back
                            </SecondaryButton>
                        )}

                        {currentStep < 3 && (
                            <PrimaryButton
                                onClick={goToNextStep}
                                disabled={currentStep === 1 ? !isValidStep1 : currentStep === 2 ? !isValidStep2 : false}
                            >
                                Next
                            </PrimaryButton>
                        )}

                        {currentStep === 3 && (
                            <PrimaryButton type="submit" loading={isSubmitting}>
                                {editingProbe ? 'Update' : 'Create'}
                            </PrimaryButton>
                        )}
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default ModalForm;
