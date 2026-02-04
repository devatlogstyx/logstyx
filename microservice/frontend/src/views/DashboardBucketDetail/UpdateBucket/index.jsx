//@ts-check

import { FiSettings } from "react-icons/fi"
import PrimaryButton from "../../../component/button/PrimaryButton"

const UpdateBucket = () => {

    return (
        <>
            <PrimaryButton leftSection={<FiSettings />} >
                Settings
            </PrimaryButton>
        </>
    )
}

export default UpdateBucket