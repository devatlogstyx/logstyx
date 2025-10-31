//@ts-check

import { Loader } from "@mantine/core"
import useLogout from "./hooks"

const Logout = () => {

    useLogout()

    return (
        <>
            <div className="flex justify-center items-center h-screen">
                <Loader />

            </div>
        </>
    )
}

export default Logout