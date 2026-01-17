//@ts-check

import { Select } from "@mantine/core";
import useSelectWebhook from "./hook";

/**
 * 
 * @param {*} param0 
 * @returns 
 */
const SelectWebhook = ({
    ...props
}) => {

    const {
        webhooks,
        isLoading
    } = useSelectWebhook()

    return (
        <>
            <Select
                placeholder="Select Webhook"
                disabled={isLoading}
                data={webhooks?.map((n) => {
                    return {
                        value: n?.id,
                        label: n?.title
                    }
                })}
                {...props}

            />
        </>
    )
}

export default SelectWebhook