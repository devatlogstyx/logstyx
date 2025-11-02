//@ts-check
import { useForm } from '@mantine/form';

const useFormInvitation = () => {

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            fullname:"",
            email: '',
            password: "",
        },

        validate: {
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Please enter a valid email'),
            fullname: (value) => value ? null : 'Please enter your name',
            password: (value) => value ? null : 'Please enter your password',
        },
    });

    return {
        form
    }
}

export default useFormInvitation