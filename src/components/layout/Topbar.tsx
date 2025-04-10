import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { MenuIcon, UserCircle } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { supabase } from "@/lib/supabase";

const Topbar = () => {
  const { user } = useAuth();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error fetching user profile:', error);
            return;
          }

          if (data) {
            setUserName(data.name);
          }
        } catch (error) {
          console.error('Error in fetchUserProfile:', error);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  return (
    <div className="border-b bg-background flex items-center justify-between p-4">
      <div className="flex items-center">
        <SidebarTrigger className="mr-2" />
        <h2 className="text-xl font-medium">Dashboard</h2>
      </div>
      
      <div className="flex items-center gap-2">
        <UserCircle className="h-6 w-6" />
        <span>
          {userName || user?.email || 'User'}
        </span>
      </div>
    </div>
  );
};

export default Topbar;
