//@ts-check

import { IoAdd } from "react-icons/io5"
import PrimaryButton from "../../../component/button/PrimaryButton"
import useCreateProject from "./hooks"
import { Modal, NumberInput, SegmentedControl, Stepper, TagsInput, TextInput } from "@mantine/core"
import SecondaryButton from "../../../component/button/SecondaryButton"
import SelectDeduplicationStrategy from "../../../component/select/SelectDeduplicationStrategy"
import FilterBuilder from "../../../component/FilterBuilder"

const CreateProject = ({
    onUpdate
}) => {

    const {
        form,
        isSubmitting,
        isModalVisible,
        handleSubmit,
        openModal,
        closeModal,
        step,
        setStep
    } = useCreateProject({
        onUpdate
    })

    return (
        <>
            <PrimaryButton
                leftSection={<IoAdd size={16} />}
                onClick={openModal}

            >
                New Project
            </PrimaryButton>

            {
                isModalVisible &&
                <Modal
                    opened={true}
                    onClose={closeModal}
                    title="Create Project"
                    className="min-w-xl"
                >

                    <form className="space-y-4" onSubmit={form.onSubmit(handleSubmit)}>

                        <Stepper active={step} >
                            <Stepper.Step label="Basic connection" >
                                <div className="space-y-4">
                                    <TextInput label="Project Title" {...form.getInputProps('title')} />

                                    <TagsInput
                                        label="Allowed Origins"
                                        placeholder="Add allowed origins"
                                        {...form.getInputProps('allowedOrigin')}
                                    />

                                    <div className="flex justify-end gap-2 pt-4">
                                        <SecondaryButton type="button" onClick={closeModal}>
                                            Cancel
                                        </SecondaryButton>
                                        <PrimaryButton type="button" onClick={() => setStep(1)}>
                                            Next
                                        </PrimaryButton>
                                    </div>
                                </div>
                            </Stepper.Step>
                            <Stepper.Step label="Default Bucket">
                                <FilterBuilder
                                    value={form.values.filter || []}
                                    onChange={(v) => {
                                        if (v.field && v.value) {
                                            form.setFieldValue('filter', v)
                                        }
                                    }}
                                />
                                <TagsInput
                                    label="Indexed Fields (Hashed)"
                                    description="Initial indexes cannot be removed. Good for strings and IDs."
                                    placeholder="Enter fields to index"
                                    {...form.getInputProps('indexes')}
                                />
                                <TagsInput
                                    label="Raw Indexed Fields"
                                    description="Initial raw indexes cannot be removed. Good for numbers and sortable fields."
                                    placeholder="Enter fields to index"
                                    {...form.getInputProps('rawIndexes')}
                                />
                                <SelectDeduplicationStrategy
                                    {...form.getInputProps('deduplicationStrategy')}
                                />

                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Retention Period</label>
                                    <p className="text-xs text-gray-500">
                                        How long should records stay in the system?
                                    </p>
                                    <div className="flex gap-2">
                                        <NumberInput

                                            className="flex-1"
                                            placeholder="0"
                                            min={0}
                                            value={form.values.retentionValue}
                                            onChange={(val) => {
                                                const numVal = Number(val) || 0;
                                                form.setFieldValue('retentionValue', numVal);
                                                // Calculate the hidden total hours
                                                form.setFieldValue(
                                                    'retentionHours',
                                                    form.values.retentionUnit === 'days' ? numVal * 24 : numVal
                                                );
                                            }}
                                        />
                                        <SegmentedControl
                                            data={[
                                                { label: 'Hours', value: 'hours' },
                                                { label: 'Days', value: 'days' },
                                            ]}
                                            value={form.values.retentionUnit}
                                            onChange={(unit) => {
                                                form.setFieldValue('retentionUnit', unit);
                                                // Recalculate retentionHours based on the existing display value
                                                form.setFieldValue(
                                                    'retentionHours',
                                                    unit === 'days' ? form.values.retentionValue * 24 : form.values.retentionValue
                                                );
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Total: {form.values.retentionHours} hours
                                    </p>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <SecondaryButton onClick={() => setStep(0)} >
                                        Prev
                                    </SecondaryButton>
                                    <PrimaryButton type="submit" disabled={isSubmitting}>Submit</PrimaryButton>
                                </div>
                            </Stepper.Step>
                        </Stepper>

                    </form>
                </Modal>
            }

        </>
    )
}

export default CreateProject