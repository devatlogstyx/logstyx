//@ts-check

import { MultiSelect } from "@mantine/core";
import useSelectProject from "./hook";

const SelectUserProject = ({
    form,
}) => {

    const {
        projects,
        isLoading
    } = useSelectProject()

    return (
        <>
            <MultiSelect
                placeholder="Select Project"
                onLoad={isLoading}
                data={projects?.map((n) => {
                    return {
                        value: n?.id,
                        label: n?.title
                    }
                })}
                clearable
                searchable
                {...form.getInputProps('projects')}

            />
        </>
    )
}

export default SelectUserProject