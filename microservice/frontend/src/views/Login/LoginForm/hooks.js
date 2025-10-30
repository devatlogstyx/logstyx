//@ts-check
import { useForm } from '@mantine/form';

const useLoginForm = () => {

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            email: '',
            password: "",
        },

        validate: {
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Please enter a valid email'),
            password: (value) => value ? null : 'Please enter your password',
        },
    });

    return {
        form
    }
}

export default useLoginForm