
import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";
import Landing from "../views/Landing";
import NotFound from "../views/NotFound";
import LoginPage from "../views/Login";
import DashboardPage from "../views/Dashboard";

export default function Router() {
    return (
        <>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </BrowserRouter>

        </>
    );
}

