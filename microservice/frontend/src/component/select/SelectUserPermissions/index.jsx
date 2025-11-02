//@ts-check

import { MultiSelect } from "@mantine/core";
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

const SelectUserPermissions = ({
    form,
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
        <>
            <MultiSelect
                placeholder="Select Permission"
                data={available_permission}
                clearable
                searchable
                {...form.getInputProps('permissions')}
                onChange={(value) => {
                    // Ensure READ_PROJECT_USER_ROLE is always included
                    if (!value.includes(READ_PROJECT_USER_ROLE)) {
                        value.push(READ_PROJECT_USER_ROLE);
                    }
                    form.setFieldValue('permissions', value);
                }}

            />
        </>
    )
}

export default SelectUserPermissions