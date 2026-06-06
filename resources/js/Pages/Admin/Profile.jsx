import AppLayout from '@/Layouts/AppLayout';
import ProfileSettings from '@/Components/Profile/ProfileSettings';

export default function Index() {
    return (
        <AppLayout title="Profile" description="Manage your account details and security.">
            <ProfileSettings description="View and update your administrator account details, credentials, and profile photo." />
        </AppLayout>
    );
}
