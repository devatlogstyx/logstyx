//@ts-check

import { FiSettings } from "react-icons/fi"
import PrimaryButton from "../../../component/button/PrimaryButton"
import { Modal, MultiSelect, NumberInput, SegmentedControl, TagsInput, TextInput } from "@mantine/core"
import SecondaryButton from "../../../component/button/SecondaryButton"
import useUpdateSettings from "./hooks"
import SelectDeduplicationStrategy from "../../../component/select/SelectDeduplicationStrategy"

const UpdateSettings = ({
    project,
    onUpdate
}) => {

    const {
        isSubmitting,
        form,
        isModalVisible,
        openModal,
        closeModal,
        handleSubmit
    } = useUpdateSettings({ project, onUpdate })
    return (
        <>
            <PrimaryButton leftSection={<FiSettings />} onClick={openModal} >
                Settings
            </PrimaryButton>
            {/* Settings Modal */}
            <Modal
                opened={isModalVisible}
                onClose={closeModal}
                title="Project Settings"
                className="min-w-xl"
            >
                <form className="space-y-4" onSubmit={form.onSubmit(handleSubmit)}>
                    <TextInput label="Project Title" {...form.getInputProps('title')} />
                    <TagsInput
                        label="Indexed Fields (Hashed)"
                        description="Initial indexes cannot be removed. Good for strings and IDs."
                        placeholder="Enter fields to index"
                        value={form.values.indexes}
                        onChange={(value) => {
                            const initialIndexes = project?.settings?.indexes || [];
                            // Get unique values that include all initial indexes
                            const uniqueValues = [...new Set([...initialIndexes, ...value])];
                            form.setFieldValue('indexes', uniqueValues);
                        }}
                        error={form.errors.indexes}
                    />

                    <TagsInput
                        label="Raw Indexed Fields"
                        description="Initial raw indexes cannot be removed. Good for numbers and sortable fields."
                        placeholder="Enter fields to index without hashing"
                        value={form.values.rawIndexes}
                        onChange={(value) => {
                            const initialRawIndexes = project?.settings?.rawIndexes || [];
                            // Get unique values that include all initial raw indexes
                            const uniqueValues = [...new Set([...initialRawIndexes, ...value])];
                            form.setFieldValue('rawIndexes', uniqueValues);
                        }}
                        error={form.errors.rawIndexes}
                    />

                    <SelectDeduplicationStrategy
                        form={form}
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

                    <TagsInput
                        label="Allowed Origins"
                        placeholder="Add allowed origins"
                        {...form.getInputProps('allowedOrigin')}
                    />

                    <div className="flex justify-end gap-2 mt-4">
                        <SecondaryButton onClick={closeModal} >
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="submit" disabled={isSubmitting}>Save Changes</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </>
    )
}

export default UpdateSettings