import DashboardPage from "./page";

const { Suspense } = require("react")
const { BarLoader } = require("react-spinners")

const DashboardLayout = ({children}) => {
    return(
        <div className="px-5">
            <h1 className="text-6xl font-bold gradient-title mb-5">Dashboard</h1>
            
        <Suspense fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea"></BarLoader>}>
            <DashboardPage></DashboardPage>
        </Suspense>

        </div>
    )
}

export default DashboardLayout;