//@ts-check

import { Button } from "@mantine/core"

const NotFound = () => {
    return (
        <>
            <div className="flex justify-center items-center h-screen">
                <div className="text-center flex flex-col gap-4">
                    <div>
                        Page Not Found
                    </div>
                    <a href={`/`}>
                        <Button>
                            Return
                        </Button>
                    </a>
                </div>
            </div>
        </>
    )
}

export default NotFound