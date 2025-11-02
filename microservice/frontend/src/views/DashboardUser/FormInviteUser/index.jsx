
//@ts-check

import { TextInput } from "@mantine/core"
import PrimaryButton from "../../../component/button/PrimaryButton"
import SecondaryButton from "../../../component/button/SecondaryButton"
import SelectUserPermissions from "../../../component/select/SelectUserPermissions"

const FormInviteUser = ({
    form,
    onSubmit,
    onClose,
    isSubmitting
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
                    form={form}
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