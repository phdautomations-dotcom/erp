import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  NavigationLayout,
  NotificationList,
  NotificationListItem,
  Popover,
  SearchItem,
  ShellBar,
  ShellBarBranding,
  ShellBarSearch,
  SideNavigation,
  SideNavigationItem,
  ThemeProvider,
  UserMenu,
  UserMenuAccount,
  UserMenuItem,
} from "@ui5/webcomponents-react";
import { NAV } from "@/components/admin/nav";
import { fetchNotifications, searchEverything, type Notif, type SearchResult } from "@/components/admin/adminQueries";
import { AvatarCropDialog } from "@/components/AvatarCropDialog";
import { useAuth } from "@/hooks/useAuth";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { useIsMobile } from "@/hooks/use-mobile";
import type { NavStyle } from "@/hooks/useNavStyle";
import { SAP_NAV_ICON, sapIconForHref } from "./sapNav";

// The SAP design's app shell, built from real SAP UI5 Web Components the way a Fiori app is:
// a ShellBar on top (branding, search, notifications, user menu) and a SideNavigation on the
// left inside a NavigationLayout, with the page in the content area. Loaded lazily (see
// AdminLayout) so the other designs never download any of it.

type Mode = "Collapsed" | "Expanded";

export default function SapShell({ title, navStyle, children }: { title?: string; navStyle: NavStyle; children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, roles, hasRole, signOut } = useAuth();
  const isMobile = useIsMobile();
  const avatar = useAvatarUpload();
  const fileRef = useRef<HTMLInputElement>(null);

  // Wide screens start with the navigation open, phones with it tucked away
  const [mode, setMode] = useState<Mode>(() => (window.innerWidth >= 1024 ? "Expanded" : "Collapsed"));
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifOpener, setNotifOpener] = useState<HTMLElement | null>(null);
  const [userOpen, setUserOpen] = useState(false);
  const [userOpener, setUserOpener] = useState<HTMLElement | null>(null);

  const email = user?.email ?? "";
  const initials = (email[0] ?? "A").toUpperCase();
  const roleLabel = hasRole("admin") ? "Administrator" : (roles as string[]).includes("engineer") ? "Service engineer" : "User";
  const sidebar = navStyle === "sidebar";

  // Global search (debounced) and notifications — the same data the other designs' bars use
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    let stale = false;
    const t = setTimeout(async () => {
      const r = await searchEverything(q);
      if (!stale) setResults(r);
    }, 250);
    return () => { stale = true; clearTimeout(t); };
  }, [q]);

  const loadNotifs = useCallback(() => { fetchNotifications().then(setNotifs).catch(() => setNotifs([])); }, []);
  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  const items = NAV.filter((n) => !n.adminOnly || hasRole("admin"));
  const main = items.filter((n) => n.to !== "/admin/settings");
  const isActive = (to: string) => pathname === to || (to !== "/admin/dashboard" && pathname.startsWith(to + "/"));
  const goHome = () => navigate(navStyle === "sidebar" ? "/admin/dashboard" : "/admin");

  const toggleSide = () => setMode((m) => (m === "Expanded" ? "Collapsed" : "Expanded"));

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) avatar.selectFile(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <ThemeProvider>
      <div className="sap-app">
        <NavigationLayout
          mode={sidebar ? mode : "Collapsed"}
          header={
            <ShellBar
              branding={
                <ShellBarBranding onClick={goHome} logo={<span className="sap-logo">A</span>}>
                  ASTA One
                </ShellBarBranding>
              }
              startButton={sidebar ? <Button icon="menu2" design="Transparent" tooltip="Navigation" onClick={toggleSide} /> : undefined}
              searchField={
                <ShellBarSearch placeholder="Search everything" value={q} onInput={(e) => setQ((e.target as unknown as { value: string }).value)}>
                  {results.map((r) => (
                    <SearchItem
                      key={r.href + r.id}
                      text={r.label}
                      description={r.sub}
                      icon={sapIconForHref(r.href)}
                      onClick={() => { navigate(r.href); setQ(""); }}
                    />
                  ))}
                </ShellBarSearch>
              }
              showNotifications
              notificationsCount={notifs.length ? String(Math.min(notifs.length, 99)) : undefined}
              onNotificationsClick={(e) => {
                setNotifOpener(e.detail.targetRef as HTMLElement);
                setNotifOpen(true);
                loadNotifs();
              }}
              profile={
                avatar.avatarUrl ? (
                  <Avatar size="XS"><img src={avatar.avatarUrl} alt="Profile" /></Avatar>
                ) : (
                  <Avatar size="XS" initials={initials} colorScheme="Accent6" />
                )
              }
              onProfileClick={(e) => {
                setUserOpener(e.detail.targetRef as HTMLElement);
                setUserOpen(true);
              }}
            >
              {title ? <span className="sap-page-title" slot="content">{title}</span> : null}
            </ShellBar>
          }
          sideContent={
            sidebar ? (
              <SideNavigation
                onSelectionChange={(e) => {
                  const to = (e.detail.item as HTMLElement).dataset.to;
                  if (to) navigate(to);
                  if (isMobile) setMode("Collapsed");
                }}
                fixedItems={
                  <SideNavigationItem
                    text="Settings"
                    icon={SAP_NAV_ICON["/admin/settings"]}
                    selected={isActive("/admin/settings")}
                    data-to="/admin/settings"
                  />
                }
              >
                {main.map((n) => (
                  <SideNavigationItem key={n.to} text={n.label} icon={SAP_NAV_ICON[n.to]} selected={isActive(n.to)} data-to={n.to} />
                ))}
              </SideNavigation>
            ) : undefined
          }
        >
          <div className="sap-page">{children}</div>
        </NavigationLayout>

        <Popover
          open={notifOpen}
          opener={notifOpener ?? undefined}
          headerText="Notifications"
          placement="Bottom"
          horizontalAlign="End"
          onClose={() => setNotifOpen(false)}
          className="sap-notifs"
        >
          <NotificationList noDataText="You're all caught up">
            {notifs.map((n) => (
              <NotificationListItem
                key={n.id}
                titleText={n.title}
                footnotes={<span>{n.time}</span>}
                onClick={() => { setNotifOpen(false); navigate(n.href); }}
              >
                {n.sub}
              </NotificationListItem>
            ))}
          </NotificationList>
        </Popover>

        <UserMenu
          open={userOpen}
          opener={userOpener ?? undefined}
          showManageAccount={false}
          showOtherAccounts={false}
          showEditAccounts={false}
          showEditButton={false}
          onClose={() => setUserOpen(false)}
          onItemClick={(e) => {
            if ((e.detail.item as HTMLElement).dataset.action === "avatar") fileRef.current?.click();
          }}
          onSignOutClick={async () => { setUserOpen(false); await signOut(); navigate("/auth"); }}
          accounts={
            <UserMenuAccount
              selected
              titleText={email}
              subtitleText={roleLabel}
              avatarInitials={initials}
              avatarSrc={avatar.avatarUrl ?? undefined}
            />
          }
        >
          <UserMenuItem icon="camera" text="Change profile picture" data-action="avatar" />
        </UserMenu>

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        <AvatarCropDialog
          imageSrc={avatar.pendingImage}
          open={avatar.cropOpen}
          onCancel={avatar.cancelCrop}
          onConfirm={async (blob: Blob) => { await avatar.confirmCrop(blob); setUserOpen(false); }}
          busy={avatar.uploading}
        />
      </div>
    </ThemeProvider>
  );
}
