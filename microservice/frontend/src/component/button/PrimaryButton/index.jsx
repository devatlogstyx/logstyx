//@ts-check

import { Button } from "@mantine/core";

export default function PrimaryButton({ children, onClick = () => { }, className = '', ...props }) {
    const baseStyles = 'cursor-pointer bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 text-white rounded-lg hover:shadow-md transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed';
    const defaultStyles = 'px-3 py-2 text-sm';

    return (
        <Button
            {...props}
            onClick={onClick}
            classNames={{
                root: `${baseStyles} ${className || defaultStyles}`,
                inner: 'flex items-center justify-center',
                section: 'mr-2'
            }}
            unstyled
        >
            {children}
        </Button>
    );
}