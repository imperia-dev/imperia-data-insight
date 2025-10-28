import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ProtocolFiltersProps {
  onFilterChange: (filters: any) => void;
  suppliers?: Array<{ id: string; name: string }>;
  defaultFilters?: any;
}

export function ProtocolFilters({ onFilterChange, suppliers = [], defaultFilters }: ProtocolFiltersProps) {
  const [competence, setCompetence] = useState(defaultFilters?.competence || "");
  const [supplierId, setSupplierId] = useState(defaultFilters?.supplierId || "");
  const [status, setStatus] = useState(() => {
    if (defaultFilters?.status) {
      if (Array.isArray(defaultFilters.status)) {
        return defaultFilters.status[0] || "";
      }
      return defaultFilters.status;
    }
    return "";
  });
  const [protocolNumber, setProtocolNumber] = useState(defaultFilters?.protocolNumber || "");

  const handleSearch = () => {
    onFilterChange({
      competence,
      supplierId,
      status,
      protocolNumber
    });
  };

  const handleClear = () => {
    setCompetence("");
    setSupplierId("");
    setStatus("");
    setProtocolNumber("");
    onFilterChange({});
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="competence">Competência</Label>
            <Input
              id="competence"
              type="month"
              value={competence}
              onChange={(e) => setCompetence(e.target.value)}
              placeholder="Selecione o mês"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Prestador</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger id="supplier">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="awaiting_provider">Aguard. Prestador</SelectItem>
                <SelectItem value="provider_approved">Aprovado Prestador</SelectItem>
                <SelectItem value="awaiting_final">Aguard. Final</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="delayed">Atrasado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="protocolNumber">Nº Protocolo</Label>
            <div className="flex gap-2">
              <Input
                id="protocolNumber"
                value={protocolNumber}
                onChange={(e) => setProtocolNumber(e.target.value)}
                placeholder="PREST-202501-001"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={handleSearch} className="flex-1">
            <Search className="h-4 w-4 mr-2" />
            Filtrar
          </Button>
          <Button onClick={handleClear} variant="outline">
            <X className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
