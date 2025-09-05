import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface OrderFiltersProps {
  onFiltersChange: (filters: OrderFilters) => void;
  profiles?: Array<{ id: string; full_name: string }>;
  isOperation?: boolean;
}

export interface OrderFilters {
  orderNumber: string;
  status: string;
  assignedTo: string;
  deadlineFrom: string;
  deadlineTo: string;
  attributionFrom: string;
  attributionTo: string;
  documentCountMin: string;
  documentCountMax: string;
  isUrgent: string;
  deliveredFrom: string;
  deliveredTo: string;
}

export function OrderFilters({ onFiltersChange, profiles, isOperation }: OrderFiltersProps) {
  const [filters, setFilters] = useState<OrderFilters>({
    orderNumber: "",
    status: "all",
    assignedTo: "all",
    deadlineFrom: "",
    deadlineTo: "",
    attributionFrom: "",
    attributionTo: "",
    documentCountMin: "",
    documentCountMax: "",
    isUrgent: "all",
    deliveredFrom: "",
    deliveredTo: "",
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof OrderFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: OrderFilters = {
      orderNumber: "",
      status: "all",
      assignedTo: "all",
      deadlineFrom: "",
      deadlineTo: "",
      attributionFrom: "",
      attributionTo: "",
      documentCountMin: "",
      documentCountMax: "",
      isUrgent: "all",
      deliveredFrom: "",
      deliveredTo: "",
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = () => {
    return (
      filters.orderNumber !== "" ||
      filters.status !== "all" ||
      filters.assignedTo !== "all" ||
      filters.deadlineFrom !== "" ||
      filters.deadlineTo !== "" ||
      filters.attributionFrom !== "" ||
      filters.attributionTo !== "" ||
      filters.documentCountMin !== "" ||
      filters.documentCountMax !== "" ||
      filters.isUrgent !== "all" ||
      filters.deliveredFrom !== "" ||
      filters.deliveredTo !== ""
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <div className="flex gap-2">
            {hasActiveFilters() && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Limpar Filtros
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Ocultar" : "Mostrar"} Filtros
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* ID do Pedido */}
            <div>
              <Label htmlFor="orderNumber">ID do Pedido</Label>
              <Input
                id="orderNumber"
                placeholder="Buscar por ID..."
                value={filters.orderNumber}
                onChange={(e) => handleFilterChange("orderNumber", e.target.value)}
              />
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Urgente */}
            <div>
              <Label htmlFor="urgent">Urgência</Label>
              <Select
                value={filters.isUrgent}
                onValueChange={(value) => handleFilterChange("isUrgent", value)}
              >
                <SelectTrigger id="urgent">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Urgente</SelectItem>
                  <SelectItem value="false">Não Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Atribuído a */}
            {!isOperation && profiles && (
              <div>
                <Label htmlFor="assignedTo">Atribuído a</Label>
                <Select
                  value={filters.assignedTo}
                  onValueChange={(value) => handleFilterChange("assignedTo", value)}
                >
                  <SelectTrigger id="assignedTo">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="unassigned">Não Atribuído</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Quantidade de Documentos - Min */}
            <div>
              <Label htmlFor="docCountMin">Qtd. Documentos (Mín)</Label>
              <Input
                id="docCountMin"
                type="number"
                min="0"
                placeholder="Mínimo"
                value={filters.documentCountMin}
                onChange={(e) => handleFilterChange("documentCountMin", e.target.value)}
              />
            </div>

            {/* Quantidade de Documentos - Max */}
            <div>
              <Label htmlFor="docCountMax">Qtd. Documentos (Máx)</Label>
              <Input
                id="docCountMax"
                type="number"
                min="0"
                placeholder="Máximo"
                value={filters.documentCountMax}
                onChange={(e) => handleFilterChange("documentCountMax", e.target.value)}
              />
            </div>

            {/* Deadline - De */}
            <div>
              <Label htmlFor="deadlineFrom">Deadline (De)</Label>
              <Input
                id="deadlineFrom"
                type="datetime-local"
                value={filters.deadlineFrom}
                onChange={(e) => handleFilterChange("deadlineFrom", e.target.value)}
              />
            </div>

            {/* Deadline - Até */}
            <div>
              <Label htmlFor="deadlineTo">Deadline (Até)</Label>
              <Input
                id="deadlineTo"
                type="datetime-local"
                value={filters.deadlineTo}
                onChange={(e) => handleFilterChange("deadlineTo", e.target.value)}
              />
            </div>

            {/* Data de Atribuição - De */}
            {!isOperation && (
              <div>
                <Label htmlFor="attributionFrom">Atribuição (De)</Label>
                <Input
                  id="attributionFrom"
                  type="datetime-local"
                  value={filters.attributionFrom}
                  onChange={(e) => handleFilterChange("attributionFrom", e.target.value)}
                />
              </div>
            )}

            {/* Data de Atribuição - Até */}
            {!isOperation && (
              <div>
                <Label htmlFor="attributionTo">Atribuição (Até)</Label>
                <Input
                  id="attributionTo"
                  type="datetime-local"
                  value={filters.attributionTo}
                  onChange={(e) => handleFilterChange("attributionTo", e.target.value)}
                />
              </div>
            )}

            {/* Data de Entrega - De */}
            {!isOperation && (
              <div>
                <Label htmlFor="deliveredFrom">Entrega (De)</Label>
                <Input
                  id="deliveredFrom"
                  type="datetime-local"
                  value={filters.deliveredFrom}
                  onChange={(e) => handleFilterChange("deliveredFrom", e.target.value)}
                />
              </div>
            )}

            {/* Data de Entrega - Até */}
            {!isOperation && (
              <div>
                <Label htmlFor="deliveredTo">Entrega (Até)</Label>
                <Input
                  id="deliveredTo"
                  type="datetime-local"
                  value={filters.deliveredTo}
                  onChange={(e) => handleFilterChange("deliveredTo", e.target.value)}
                />
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}