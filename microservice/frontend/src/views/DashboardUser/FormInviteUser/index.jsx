
//@ts-check

import { TextInput } from "@mantine/core"
import PrimaryButton from "../../../component/button/PrimaryButton"
import SecondaryButton from "../../../component/button/SecondaryButton"
import SelectUserPermissions from "../../../component/select/SelectUserPermissions"
import SelectUserProject from "../../../component/select/SelectUserProject"
import { READ_BUCKET_USER_ROLE, READ_PROJECT_ROLE } from "../../../utils/constant"

const FormInviteUser = ({
    form,
    onSubmit,
    onClose,
    isSubmitting,
    isEditing = false
}) => {

    return (
        <form className="space-y-4" onSubmit={form.onSubmit(onSubmit)}>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                </label>
                <TextInput
                    placeholder="user@example.com"
                    key={form.key('email')}
                    disabled={isEditing}
                    required
                    classNames={{
                        input: 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                    }}
                    {...form.getInputProps('email')}

                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Permission
                </label>
                <SelectUserPermissions
                    clearable
                    searchable
                    {...form.getInputProps('permissions')}
                    onChange={(value) => {
                        // Ensure READ_PROJECT_ROLE is always included
                        if (!value.includes(READ_PROJECT_ROLE)) {
                            value.push(READ_PROJECT_ROLE);
                        }
                        if (!value.includes(READ_BUCKET_USER_ROLE)) {
                            value.push(READ_BUCKET_USER_ROLE);
                        }
                        form.setFieldValue('permissions', value);
                    }}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Projects
                </label>
                <SelectUserProject
                    mode="multi"
                    clearable
                    searchable
                    {...form.getInputProps('projects')}
                />
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <SecondaryButton
                    onClick={onClose}
                >
                    Cancel
                </SecondaryButton>
                <PrimaryButton
                    type="submit"
                    disabled={!form.values.email || form.values.permissions.length < 1 || isSubmitting}
                    loading={isSubmitting}
                >
                    Send Invite
                </PrimaryButton>
            </div>
        </form>
    )
}

export default FormInviteUser