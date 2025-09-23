import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PendencyFiltersProps {
  onApplyFilters: (filters: any) => void;
  onClearFilters: () => void;
}

export function PendencyFilters({ onApplyFilters, onClearFilters }: PendencyFiltersProps) {
  const [status, setStatus] = useState("all");
  const [errorType, setErrorType] = useState("all");
  const [orderNumber, setOrderNumber] = useState("");
  const [c4uId, setC4uId] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const errorTypes = [
    { value: "nao_e_erro", label: "Não é erro" },
    { value: "falta_de_dados", label: "Falta de dados" },
    { value: "apostila", label: "Apostila" },
    { value: "erro_em_data", label: "Erro em data" },
    { value: "nome_separado", label: "Nome separado" },
    { value: "texto_sem_traduzir", label: "Texto sem traduzir" },
    { value: "nome_incorreto", label: "Nome incorreto" },
    { value: "texto_duplicado", label: "Texto duplicado" },
    { value: "erro_em_crc", label: "Erro em CRC" },
    { value: "nome_traduzido", label: "Nome traduzido" },
    { value: "falta_parte_documento", label: "Falta parte do documento" },
    { value: "erro_digitacao", label: "Erro de digitação" },
    { value: "sem_assinatura_tradutor", label: "Sem assinatura do tradutor" },
    { value: "nome_junto", label: "Nome junto" },
    { value: "traducao_incompleta", label: "Tradução incompleta" },
    { value: "titulo_incorreto", label: "Título incorreto" },
    { value: "trecho_sem_traduzir", label: "Trecho sem traduzir" },
    { value: "matricula_incorreta", label: "Matrícula incorreta" },
    { value: "espacamento", label: "Espaçamento" },
    { value: "sem_cabecalho", label: "Sem cabeçalho" },
  ];

  const handleApplyFilters = () => {
    const filters = {
      status,
      errorType,
      orderNumber,
      c4uId,
      startDate,
      endDate,
    };
    onApplyFilters(filters);
  };

  const handleClearFilters = () => {
    setStatus("all");
    setErrorType("all");
    setOrderNumber("");
    setC4uId("");
    setStartDate(undefined);
    setEndDate(undefined);
    onClearFilters();
  };

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Filtros</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="text-muted-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="resolved">Resolvido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="errorType">Tipo de Erro</Label>
          <Select value={errorType} onValueChange={setErrorType}>
            <SelectTrigger id="errorType">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {errorTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="orderNumber">Nº do Pedido</Label>
          <Input
            id="orderNumber"
            placeholder="Digite o número"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="c4uId">ID C4U</Label>
          <Input
            id="c4uId"
            placeholder="Digite o ID C4U"
            value={c4uId}
            onChange={(e) => setC4uId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Data Início</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "dd/MM/yyyy") : "Selecione"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Data Fim</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "dd/MM/yyyy") : "Selecione"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button onClick={handleApplyFilters}>
          <Search className="h-4 w-4 mr-2" />
          Aplicar Filtros
        </Button>
      </div>
    </Card>
  );
}