import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

export default function Documents() {
  const { user } = useAuth();
  const { userRole, loading: roleLoading } = useUserRole();
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (data && !error) {
          setUserName(data.full_name);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className="md:pl-64">
        <Header userName={userName} userRole={userRole} />
        
        <main className="container mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6 text-foreground">Documentos</h1>
          
          <Card className="max-w-2xl mx-auto mt-12">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Construction className="h-6 w-6 text-primary" />
                Página em Construção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">
                Esta página está sendo desenvolvida e estará disponível em breve.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}