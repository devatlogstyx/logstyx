
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
import DashboardReports from "../views/DashboardReports";
import DashboardReportDetail from "../views/DashboardReportDetail";
import PublicReportView from "../views/PublicReportView";
import DashboardWebhook from "../views/DashboardWebhook";

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
                        <Route path="/dashboard/reports" element={<DashboardReports />} />
                        <Route path="/dashboard/reports/:slug" element={<DashboardReportDetail />} />
                        <Route path="/dashboard/webhooks" element={<DashboardWebhook />} />
                    </Route>
                    <Route path="/invitations/:id" element={<InvitationPage />} />
                    <Route path="/logout" element={<Logout />} />

                    <Route path="*" element={<NotFound />} />
                    <Route path="/reports/:slug" element={<PublicReportView />} />

                    <Route path="*" element={<NotFound />} />
                </Routes>
            </BrowserRouter>

        </>
    );
}

