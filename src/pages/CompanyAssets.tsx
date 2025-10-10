import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CompanyLogoUpload } from "@/components/settings/CompanyLogoUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const CompanyAssets = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOwnerRole = async () => {
      if (!session?.user?.id) {
        navigate('/auth');
        return;
      }

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
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Assets da Empresa</h1>
        <p className="text-muted-foreground">
          Gerencie os recursos visuais da Impéria Traduções
        </p>
      </div>

      <Card>
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
    </div>
  );
};

export default CompanyAssets;
