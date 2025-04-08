
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar as SidebarContainer,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Building2,
  Receipt,
  DollarSign,
  Settings,
  Home,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { 
    name: "Dashboard", 
    icon: <LayoutDashboard className="h-5 w-5" />, 
    path: "/" 
  },
  { 
    name: "Society", 
    icon: <Building2 className="h-5 w-5" />, 
    path: "/society" 
  },
  { 
    name: "Units", 
    icon: <Home className="h-5 w-5" />, 
    path: "/units" 
  },
  { 
    name: "Residents", 
    icon: <Users className="h-5 w-5" />, 
    path: "/residents" 
  },
  { 
    name: "Expenses", 
    icon: <DollarSign className="h-5 w-5" />, 
    path: "/expenses" 
  },
  { 
    name: "Billing", 
    icon: <Receipt className="h-5 w-5" />, 
    path: "/billing" 
  },
  { 
    name: "Settings", 
    icon: <Settings className="h-5 w-5" />, 
    path: "/settings" 
  },
];

const Sidebar = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <SidebarContainer>
      <SidebarHeader>
        <div className="flex items-center justify-center p-2">
          <h1 className="text-xl font-bold">FlatPay</h1>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === item.path}
                tooltip={item.name}
              >
                <Link to={item.path}>
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={() => signOut()}
        >
          Sign Out
        </Button>
      </SidebarFooter>
    </SidebarContainer>
  );
};

export default Sidebar;
