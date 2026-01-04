
import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";
import Landing from "../views/Landing";
import NotFound from "../views/NotFound";
import LoginPage from "../views/Login";
import DashboardPage from "../views/Dashboard";
import DashboardLayout from "../layouts/DashboardLayout";
import Logout from "../views/Logout";
import DashboardUser from "../views/DashboardUser";
import InvitationPage from "../views/Invitation";
import DashboardProjectDetail from "../views/DashboardProjectDetail";
import DashboardProbes from "../views/DashboardProbes";

export default function Router() {
    return (
        <>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<LoginPage />} />

                    <Route path="/dashboard" element={<DashboardLayout />} >
                        <Route index element={<DashboardPage />} />
                        <Route path="/dashboard/users" element={<DashboardUser />} />
                        <Route path="/dashboard/probes" element={<DashboardProbes />} />
                        <Route path="/dashboard/projects/:slug" element={<DashboardProjectDetail />} />
                    </Route>
                    <Route path="/invitations/:id" element={<InvitationPage />} />
                    <Route path="/logout" element={<Logout />} />

                    <Route path="*" element={<NotFound />} />
                </Routes>
            </BrowserRouter>

        </>
    );
}

