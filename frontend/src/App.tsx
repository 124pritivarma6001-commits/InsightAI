import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Analysis from "./pages/Analysis";
import Dashboard from "./pages/Dashboard";
import DatasetDetails from "./pages/DatasetDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyDatasets from "./pages/MyDatasets";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./hooks/AuthContext";

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout><Landing /></Layout>} />
            <Route path="/login" element={<Layout><Login /></Layout>} />
            <Route path="/register" element={<Layout><Register /></Layout>} />
            <Route path="/analysis/:datasetId" element={<Layout><Analysis /></Layout>} />
            <Route path="/dashboard/:dashboardId" element={<Dashboard />} />
            <Route path="/dataset/:datasetId" element={<DatasetDetails />} />
            <Route
              path="/datasets"
              element={
                <Layout>
                  <ProtectedRoute>
                    <MyDatasets />
                  </ProtectedRoute>
                </Layout>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
