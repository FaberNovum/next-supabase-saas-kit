import { Database } from '@kit/supabase/database';
import { getSupabaseServerComponentClient } from '@kit/supabase/server-component-client';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Heading } from '@kit/ui/heading';
import { If } from '@kit/ui/if';
import { PageBody, PageHeader } from '@kit/ui/page';
import { ProfileAvatar } from '@kit/ui/profile-avatar';
import { Separator } from '@kit/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import { AdminBanUserDialog } from './admin-ban-user-dialog';
import { AdminDeleteAccountDialog } from './admin-delete-account-dialog';
import { AdminDeleteUserDialog } from './admin-delete-user-dialog';
import { AdminImpersonateUserDialog } from './admin-impersonate-user-dialog';
import { AdminMembersTable } from './admin-members-table';
import { AdminMembershipsTable } from './admin-memberships-table';
import { AdminReactivateUserDialog } from './admin-reactivate-user-dialog';

type Db = Database['public']['Tables'];
type Account = Db['accounts']['Row'];
type Membership = Db['accounts_memberships']['Row'];

export function AdminAccountPage(props: {
  account: Account & { memberships: Membership[] };
}) {
  if (props.account.is_personal_account) {
    return <PersonalAccountPage account={props.account} />;
  }

  return <TeamAccountPage account={props.account} />;
}

async function PersonalAccountPage(props: { account: Account }) {
  const client = getSupabaseServerComponentClient({
    admin: true,
  });

  const memberships = await getMemberships(props.account.id);
  const { data, error } = await client.auth.admin.getUserById(props.account.id);

  if (!data || error) {
    throw new Error(`User not found`);
  }

  const isBanned =
    'banned_until' in data.user && data.user.banned_until !== 'none';

  return (
    <>
      <PageHeader
        title={
          <div className={'flex items-center space-x-2.5'}>
            <ProfileAvatar
              pictureUrl={props.account.picture_url}
              displayName={props.account.name}
            />

            <span>{props.account.name}</span>

            <Badge variant={'outline'}>Personal Account</Badge>
          </div>
        }
      >
        <div className={'flex space-x-2'}>
          <AdminImpersonateUserDialog userId={props.account.id}>
            <Button variant={'ghost'}>Impersonate</Button>
          </AdminImpersonateUserDialog>

          <If condition={isBanned}>
            <AdminReactivateUserDialog userId={props.account.id}>
              <Button variant={'ghost'}>Reactivate</Button>
            </AdminReactivateUserDialog>
          </If>

          <If condition={!isBanned}>
            <AdminBanUserDialog userId={props.account.id}>
              <Button variant={'ghost'}>Ban</Button>
            </AdminBanUserDialog>
          </If>

          <AdminDeleteUserDialog userId={props.account.id}>
            <Button variant={'destructive'}>Delete</Button>
          </AdminDeleteUserDialog>
        </div>
      </PageHeader>

      <PageBody>
        <div className={'flex flex-col space-y-8'}>
          <SubscriptionsTable accountId={props.account.id} />

          <div className={'divider-divider-x flex flex-col space-y-2.5'}>
            <Heading level={6}>
              This user is a member of the following teams:
            </Heading>

            <div>
              <AdminMembershipsTable memberships={memberships} />
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}

async function TeamAccountPage(props: {
  account: Account & { memberships: Membership[] };
}) {
  const members = await getMembers(props.account.slug ?? '');

  return (
    <>
      <PageHeader
        title={
          <div className={'flex items-center space-x-2.5'}>
            <ProfileAvatar
              pictureUrl={props.account.picture_url}
              displayName={props.account.name}
            />

            <span>{props.account.name}</span>

            <Badge variant={'outline'}>Team Account</Badge>
          </div>
        }
      >
        <AdminDeleteAccountDialog accountId={props.account.id}>
          <Button variant={'destructive'}>Delete</Button>
        </AdminDeleteAccountDialog>
      </PageHeader>

      <PageBody>
        <div className={'flex flex-col space-y-8'}>
          <SubscriptionsTable accountId={props.account.id} />

          <Separator />

          <div className={'flex flex-col space-y-2.5'}>
            <Heading level={6}>This team has the following members:</Heading>

            <AdminMembersTable members={members} />
          </div>
        </div>
      </PageBody>
    </>
  );
}

async function SubscriptionsTable(props: { accountId: string }) {
  const client = getSupabaseServerComponentClient({
    admin: true,
  });

  const { data: subscription, error } = await client
    .from('subscriptions')
    .select('*, subscription_items !inner (*)')
    .eq('account_id', props.accountId)
    .maybeSingle();

  if (error) {
    return (
      <Alert variant={'destructive'}>
        <AlertTitle>There was an error loading subscription.</AlertTitle>

        <AlertDescription>
          Please check the logs for more information or try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={'flex flex-col space-y-2.5'}>
      <Heading level={6}>Subscription</Heading>

      <If
        condition={subscription}
        fallback={<>This account does not have an active subscription.</>}
      >
        {(subscription) => {
          return (
            <div className={'flex flex-col space-y-4'}>
              <Table>
                <TableHeader>
                  <TableHead>Subscription ID</TableHead>

                  <TableHead>Provider</TableHead>

                  <TableHead>Customer ID</TableHead>

                  <TableHead>Status</TableHead>

                  <TableHead>Created At</TableHead>

                  <TableHead>Period Starts At</TableHead>

                  <TableHead>Ends At</TableHead>
                </TableHeader>

                <TableBody>
                  <TableRow>
                    <TableCell>
                      <span>{subscription.id}</span>
                    </TableCell>

                    <TableCell>
                      <span>{subscription.billing_provider}</span>
                    </TableCell>

                    <TableCell>
                      <span>{subscription.billing_customer_id}</span>
                    </TableCell>

                    <TableCell>
                      <span>{subscription.status}</span>
                    </TableCell>

                    <TableCell>
                      <span>{subscription.created_at}</span>
                    </TableCell>

                    <TableCell>
                      <span>{subscription.period_starts_at}</span>
                    </TableCell>

                    <TableCell>
                      <span>{subscription.period_ends_at}</span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Table>
                <TableHeader>
                  <TableHead>Product ID</TableHead>

                  <TableHead>Variant ID</TableHead>

                  <TableHead>Quantity</TableHead>

                  <TableHead>Price</TableHead>

                  <TableHead>Interval</TableHead>

                  <TableHead>Type</TableHead>
                </TableHeader>

                <TableBody>
                  {subscription.subscription_items.map((item) => {
                    return (
                      <TableRow key={item.variant_id}>
                        <TableCell>
                          <span>{item.product_id}</span>
                        </TableCell>

                        <TableCell>
                          <span>{item.variant_id}</span>
                        </TableCell>

                        <TableCell>
                          <span>{item.quantity}</span>
                        </TableCell>

                        <TableCell>
                          <span>{item.price_amount}</span>
                        </TableCell>

                        <TableCell>
                          <span>{item.interval}</span>
                        </TableCell>

                        <TableCell>
                          <span>{item.type}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          );
        }}
      </If>
    </div>
  );
}

async function getMemberships(userId: string) {
  const client = getSupabaseServerComponentClient({
    admin: true,
  });

  const memberships = await client
    .from('accounts_memberships')
    .select<
      string,
      Membership & {
        account: {
          id: string;
          name: string;
        };
      }
    >('*, account: account_id !inner (id, name)')
    .eq('user_id', userId);

  if (memberships.error) {
    throw memberships.error;
  }

  return memberships.data;
}

async function getMembers(accountSlug: string) {
  const client = getSupabaseServerComponentClient({
    admin: true,
  });

  const members = await client.rpc('get_account_members', {
    account_slug: accountSlug,
  });

  if (members.error) {
    throw members.error;
  }

  return members.data;
}