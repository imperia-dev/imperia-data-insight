import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StorageImage } from "@/components/common/StorageImage";
import { SafeHTML } from "@/components/security/SafeHTML";

interface ChecklistItem {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  option_1_label: string;
  option_1_description: string | null;
  option_2_label: string;
  option_2_description: string | null;
  display_order: number;
  is_required: boolean;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  items?: ChecklistItem[];
}

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ChecklistTemplate;
}

export function TemplatePreviewDialog({
  open,
  onOpenChange,
  template,
}: TemplatePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Pré-visualização: {template.name}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-100px)] p-6 pt-4">
          <div className="space-y-4">
            {/* Template Header */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle>{template.name}</CardTitle>
                  <Badge variant="outline">
                    {template.items?.length || 0} itens
                  </Badge>
                </div>
                {template.description && (
                  <CardDescription>{template.description}</CardDescription>
                )}
              </CardHeader>
            </Card>

            {/* Items Preview */}
            {template.items?.map((item, index) => (
              <Card key={item.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <SafeHTML
                          html={item.title}
                          className="inline-block [&_*]:inline"
                          allowedTags={["strong", "em", "u", "br", "span"]}
                        />
                        {item.is_required && (
                          <span className="text-destructive">*</span>
                        )}
                      </CardTitle>
                      {item.description && (
                        <CardDescription className="mt-1">
                          {item.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                {item.image_url && (
                  <div className="px-6 pb-4">
                    <StorageImage
                      bucket="documents"
                      pathOrUrl={item.image_url}
                      alt={item.title.replace(/<[^>]*>/g, "").trim() || "Imagem do item"}
                      className="rounded-lg max-h-48 object-contain"
                    />
                  </div>
                )}
                
                <CardContent>
                  <RadioGroup disabled>
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 p-3 rounded-lg border border-border">
                        <RadioGroupItem value="option_1" disabled className="mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">{item.option_1_label}</p>
                          {item.option_1_description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.option_1_description}
                            </p>
                          )}
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 rounded-lg border border-border">
                        <RadioGroupItem value="option_2" disabled className="mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">{item.option_2_label}</p>
                          {item.option_2_description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.option_2_description}
                            </p>
                          )}
                        </div>
                      </label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            ))}

            {(!template.items || template.items.length === 0) && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Nenhum item adicionado a este template
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
