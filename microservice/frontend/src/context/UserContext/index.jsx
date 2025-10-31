// UserContext.jsx
import { createContext } from 'react';
import useUserContext from './hooks';

const UserContext = createContext();

export function UserProvider({ children }) {

    const {
        isLoading,
        user
    } = useUserContext()

    return (
        <UserContext.Provider value={{ user, isLoading }}>
            {children}
        </UserContext.Provider>
    );
}

export default UserContext