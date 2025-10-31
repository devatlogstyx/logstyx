// UserContext.jsx
import { createContext } from 'react';
import useUserContext from './hooks';

const UserContext = createContext();

export function UserProvider({ children }) {

    const {
        isLoading,
        user,
        refetchUser
    } = useUserContext()

    return (
        <UserContext.Provider value={{ user, isLoading, refetchUser }}>
            {children}
        </UserContext.Provider>
    );
}

export default UserContext