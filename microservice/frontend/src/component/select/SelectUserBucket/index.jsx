//@ts-check

import { MultiSelect, Select } from "@mantine/core";
import useSelectBucket from "./hook";

const SelectUserBucket = ({
    mode = "multi",
    ...props
}) => {

    const {
        projects,
        isLoading
    } = useSelectBucket()

    return (
        <>
            {mode === "multi" &&
                <MultiSelect
                    label="Select Bucket"
                    disabled={isLoading}
                    data={projects?.map((n) => {
                        return {
                            value: n?.id,
                            label: n?.title
                        }
                    })}
                    {...props}

                />
            }

            {mode === "single" &&
                <Select
                    label="Select Bucket"
                    disabled={isLoading}
                    data={projects?.map((n) => {
                        return {
                            value: n?.id,
                            label: n?.title
                        }
                    })}
                    {...props}
                />
            }
        </>
    )
}

export default SelectUserBucket