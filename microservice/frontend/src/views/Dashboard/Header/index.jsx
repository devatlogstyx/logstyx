//@ts-check

import { Avatar } from "@mantine/core"
const DashboardHeader = () => {

    return (
        <>
            <header
                className="px-3 py-4 border-b-1 border-black flex flex-row justify-between"
            >
                <span></span>
                <Avatar
                    name={"asdf"}
                />
            </header>
        </>
    )
}

export default DashboardHeader