import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CompanyLogoUpload } from "@/components/settings/CompanyLogoUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Loader2 } from "lucide-react";

const CompanyAssets = () => {
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOwnerRole = async () => {
      if (!session?.user?.id) {
        navigate('/auth');
        return;
      }

      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', session.user.id)
        .single();

      if (profileData) {
        setUserName(profileData.full_name);
        setUserRole(profileData.role);
      }

      // Check if user is owner
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'owner')
        .single();

      if (error || !data) {
        navigate('/unauthorized');
        return;
      }

      setIsOwner(true);
      setLoading(false);
    };

    checkOwnerRole();
  }, [session, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isOwner) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className="md:pl-64">
        <Header userName={userName} userRole={userRole} />
        
        <main className="container mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Assets da Empresa</h1>
            <p className="text-muted-foreground">
              Gerencie os recursos visuais da Impéria Traduções
            </p>
          </div>

          <Card className="max-w-4xl">
            <CardHeader>
              <CardTitle>Logo da Empresa</CardTitle>
              <CardDescription>
                Faça upload da logo para usar em emails e outros recursos do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompanyLogoUpload />
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default CompanyAssets;
