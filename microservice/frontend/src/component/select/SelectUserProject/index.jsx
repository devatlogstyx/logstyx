//@ts-check

import { MultiSelect, Select } from "@mantine/core";
import useSelectProject from "./hook";

const SelectUserProject = ({
    mode = "multi",
    ...props
}) => {

    const {
        projects,
        isLoading
    } = useSelectProject()

    return (
        <>
            {mode === "multi" &&
                <MultiSelect
                    label="Select Project"
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
                    label="Select Project"
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

export default SelectUserProject