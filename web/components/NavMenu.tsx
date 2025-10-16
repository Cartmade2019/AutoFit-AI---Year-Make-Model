import { Link } from "@remix-run/react";
import { NavMenu as AppBridgeNavMenu } from "@shopify/app-bridge-react";

export function NavMenu() {
  return (
    <AppBridgeNavMenu>
      <Link to="/" rel="home">
        Shop Information
      </Link>
      <Link to='/database'>Database</Link>
      <Link to='/billing'>Plans</Link>
      <Link to='/settings'>Settings</Link>
      <Link to='/installation'>Installation</Link>
      <Link to='/help'>Help</Link>
    </AppBridgeNavMenu>
  );
}
