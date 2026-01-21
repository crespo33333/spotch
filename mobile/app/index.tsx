import { Redirect } from "expo-router";

export default function Index() {
    // TODO: Check auth state. For now redirect to onboarding
    return <Redirect href="/welcome" />;
}
