//@ts-check

import { Modal, NumberInput, SegmentedControl, Stepper, TextInput } from "@mantine/core"
import useModalAlert from "./hooks"
import SecondaryButton from "../../../component/button/SecondaryButton"
import PrimaryButton from "../../../component/button/PrimaryButton"
import FilterBuilder from "../../../component/FilterBuilder"
import SelectWebhook from "../../../component/select/SelectWebhook"
import SelectUserBucket from "../../../component/select/SelectUserBucket"

const ModalAlert = ({
    modalOpened,
    closeModal,
    editingAlert,
    form,
    handleSubmit,
    isSubmitting
}) => {

    const {
        step,
        setStep,
        mustacheVars,
        handleCloseModal,
    } = useModalAlert({ form, onClose: closeModal })
    return (
        <>
            <Modal
                opened={modalOpened}
                onClose={handleCloseModal}
                title={editingAlert?.id ? 'Edit Alert' : 'Create Alert'}
                size="lg"
            >
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stepper active={step} >
                        <Stepper.Step label="Basic connection" >
                            <div className="space-y-4">
                                <TextInput
                                    label="Alert Name"
                                    placeholder="My Alert Name"
                                    required
                                    {...form.getInputProps('title')}
                                />
                                <SelectUserBucket
                                    mode={`single`}
                                    {...form.getInputProps('bucket')}
                                    required
                                />

                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Deduplication Period</label>
                                    <p className="text-xs text-gray-500">
                                        How long before alert can send the same message?
                                    </p>
                                    <div className="flex gap-2">
                                        <NumberInput

                                            className="flex-1"
                                            placeholder="0"
                                            min={0}
                                            value={form.values.config?.deduplicationMinutes}
                                            onChange={(val) => {
                                                const numVal = Number(val) || 0;
                                                form.setFieldValue('deduplicationValue', numVal);

                                                const deduplicationMinutes = form.values.deduplicationUnit === 'hours' ? numVal * 60 : numVal
                                                form.setFieldValue('config', { ...form?.values?.config, deduplicationMinutes })
                                            }}
                                        />
                                        <SegmentedControl
                                            data={[
                                                { label: 'Minutes', value: 'minutes' },
                                                { label: 'Hours', value: 'hours' },
                                            ]}
                                            value={form.values.deduplicationUnit}
                                            onChange={(unit) => {
                                                form.setFieldValue('deduplicationUnit', unit);

                                                const deduplicationMinutes = unit === 'hours' ? form.values.deduplicationValue * 60 : form.values.deduplicationValue
                                                form.setFieldValue('config', { ...form?.values?.config, deduplicationMinutes })
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Total: {form.values.deduplicationMinutes} minutes
                                    </p>
                                </div>

                                <FilterBuilder
                                    value={form.values.config.filter || []}
                                    onChange={(v) => form.setFieldValue('config', { ...form.values.config, filter: v })}
                                />

                                <div className="flex justify-end gap-2 pt-4">
                                    <SecondaryButton type="button" onClick={handleCloseModal}>
                                        Cancel
                                    </SecondaryButton>
                                    <PrimaryButton type="button" onClick={() => setStep(step + 1)}>
                                        Next
                                    </PrimaryButton>
                                </div>
                            </div>
                        </Stepper.Step>
                        <Stepper.Step label="Webhook Config">
                            <SelectWebhook
                                clearable
                                searchable
                                {...form.getInputProps('webhook')}
                            />
                            <div className="space-y-4">

                                {mustacheVars?.length > 0 ? (
                                    <>
                                        <div className="text-sm text-gray-600 mb-4">
                                            Provide values for the variables in your webhook template. <br />
                                            You can use flattened object notation matching your log structure, such as "<>{`{{ data.title }}`}</>" or "<>{`{{ data.service }}`}</>".
                                        </div>

                                        <div className="max-h-96 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded">
                                            {mustacheVars?.map((varName) => (
                                                <TextInput
                                                    key={varName}
                                                    label={varName}
                                                    placeholder={`Enter value for ${varName}`}
                                                    value={form?.values?.config?.template?.[varName] || ''}
                                                    onChange={(e) => {
                                                        const template = { ...form?.values?.config?.template, [varName]: e?.currentTarget?.value }
                                                        form.setFieldValue('config', { ...form?.values?.config, template })

                                                    }}
                                                />
                                            ))}
                                        </div>

                                        <div className="flex justify-end gap-2 pt-4">
                                            <SecondaryButton type="button" onClick={() => setStep(0)}>
                                                Back
                                            </SecondaryButton>
                                            <PrimaryButton type="submit" disabled={isSubmitting}>
                                                {isSubmitting ? 'Saving...' : editingAlert?.id ? 'Update' : 'Create'}
                                            </PrimaryButton>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-center py-8 text-gray-500">
                                            No variables found in your template. You can proceed to save.
                                        </div>
                                        <div className="flex justify-end gap-2 pt-4">
                                            <SecondaryButton type="button" onClick={() => setStep(0)}>
                                                Back
                                            </SecondaryButton>
                                            <PrimaryButton type="submit" disabled={isSubmitting}>
                                                {isSubmitting ? 'Saving...' : editingAlert?.id ? 'Update' : 'Create'}
                                            </PrimaryButton>
                                        </div>
                                    </>
                                )}
                            </div>
                        </Stepper.Step>
                    </Stepper>
                </form>
            </Modal>
        </>
    )
}

export default ModalAlert