import { createBrowserRouter } from "react-router";
import Root from "@/app/components/Root";
import Home from "@/app/components/Home";
import BrowseProjects from "@/app/components/BrowseProjects";
import FreelancerProfiles from "@/app/components/FreelancerProfiles";
import ProjectDetails from "@/app/components/ProjectDetails";
import FreelancerSubscription from "@/app/components/FreelancerSubscription";
import NotFound from "@/app/components/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "projects", Component: BrowseProjects },
      { path: "projects/:id", Component: ProjectDetails },
      { path: "freelancers", Component: FreelancerProfiles },
      { path: "subscription", Component: FreelancerSubscription },
      { path: "*", Component: NotFound },
    ],
  },
]);