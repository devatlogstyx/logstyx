
//@ts-check

import { Button, MultiSelect, TextInput } from "@mantine/core"
import {
    WRITE_USER_USER_ROLE,
    READ_USER_USER_ROLE,
    WRITE_PROJECT_USER_ROLE,
    READ_PROJECT_USER_ROLE,
    WRITE_SETTINGS_USER_ROLE,
    READ_SETTINGS_USER_ROLE,
    WRITE_USER_INVITATION_USER_ROLE,
    READ_USER_INVITATION_USER_ROLE
} from "./../../../utils/constant"
import PrimaryButton from "../../../component/button/PrimaryButton"
import SecondaryButton from "../../../component/button/SecondaryButton"

const FormInviteUser = ({
    form,
    onSubmit,
    onClose,
    isSubmitting
}) => {

    const available_permission = [
        WRITE_USER_USER_ROLE,
        READ_USER_USER_ROLE,
        WRITE_PROJECT_USER_ROLE,
        READ_PROJECT_USER_ROLE,
        WRITE_SETTINGS_USER_ROLE,
        READ_SETTINGS_USER_ROLE,
        WRITE_USER_INVITATION_USER_ROLE,
        READ_USER_INVITATION_USER_ROLE,
    ]

    return (
        <form className="space-y-4" onSubmit={form.onSubmit(onSubmit)}>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                </label>
                <TextInput
                    placeholder="user@example.com"
                    key={form.key('email')}
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
                <MultiSelect
                    placeholder="Select Permission"
                    data={available_permission}
                    clearable
                    searchable
                    {...form.getInputProps('permissions')}
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