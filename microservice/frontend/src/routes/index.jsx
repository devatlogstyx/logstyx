
import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";
import Landing from "../views/Landing";
import NotFound from "../views/NotFound";

export default function Router() {
    return (
        <>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </BrowserRouter>

        </>
    );
}

