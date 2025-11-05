//@ts-check
import React from "react"
const useUpdateSettings = () => {

    const [isModalVisible, setIsModalVisible] = React.useState(false)

    return {
        isModalVisible,
        openModal: () => setIsModalVisible(true),
        closeModal: () => setIsModalVisible(false),
    }
}

export default useUpdateSettings