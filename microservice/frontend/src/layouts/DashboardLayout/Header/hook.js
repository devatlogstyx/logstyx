
import React from "react";
const useHeader = () => {

    const [isEditProfileModalVisible, setIsEditProfileModalVisible] = React.useState(false)

    return {
        isEditProfileModalVisible,
        OpenEditModal: () => setIsEditProfileModalVisible(true),
        CloseEditModal: () => setIsEditProfileModalVisible(false),
    }
}

export default useHeader