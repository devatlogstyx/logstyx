import { Button } from "@mantine/core";

export default function SecondaryButton({ children, onClick, className = '', ...props }) {
    const baseStyles = 'flex items-center justify-center gap-2  cursor-pointer bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 hover:shadow-md transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed';
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

