import { AccountCard } from '@/components/admin/settings/AccountCard';
import { TelegramSettingsCard } from '@/components/admin/TelegramSettingsCard';

export function SecurityTab() {
  return (
    <div className="space-y-8">
      <AccountCard />
      <TelegramSettingsCard />
    </div>
  );
}
