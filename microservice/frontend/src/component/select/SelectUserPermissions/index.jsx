//@ts-check

import { MultiSelect } from "@mantine/core";
import {
    WRITE_USER_USER_ROLE,
    READ_USER_USER_ROLE,
    WRITE_PROJECT_ROLE,
    READ_PROJECT_ROLE,
    WRITE_USER_INVITATION_USER_ROLE,
    READ_USER_INVITATION_USER_ROLE,
    READ_REPORT_USER_ROLE,
    WRITE_REPORT_USER_ROLE,
    WRITE_WEBHOOK_USER_ROLE,
    READ_WEBHOOK_USER_ROLE,
    WRITE_BUCKET_USER_ROLE,
    READ_BUCKET_USER_ROLE
} from "./../../../utils/constant"

const SelectUserPermissions = ({
    ...props
}) => {

    const available_permission = [
        WRITE_USER_USER_ROLE,
        READ_USER_USER_ROLE,
        WRITE_PROJECT_ROLE,
        READ_PROJECT_ROLE,
        WRITE_USER_INVITATION_USER_ROLE,
        READ_USER_INVITATION_USER_ROLE,
        READ_REPORT_USER_ROLE,
        WRITE_REPORT_USER_ROLE,
        WRITE_WEBHOOK_USER_ROLE,
        READ_WEBHOOK_USER_ROLE,
        WRITE_BUCKET_USER_ROLE,
        READ_BUCKET_USER_ROLE
    ]

    return (
        <>
            <MultiSelect
                placeholder="Select Permission"
                data={available_permission}
                {...props}

            />
        </>
    )
}

export default SelectUserPermissions