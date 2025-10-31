import { format, parse } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Formata uma data UTC para o horário de São Paulo
 * @param date - Data em UTC (string ou Date)
 * @param formatString - Formato desejado (padrão: "dd/MM/yyyy HH:mm")
 * @returns Data formatada no timezone de São Paulo
 */
export function formatDateBR(
  date: string | Date | null | undefined, 
  formatString: string = "dd/MM/yyyy HH:mm"
): string {
  if (!date) return "N/A";
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const zonedDate = toZonedTime(dateObj, BRAZIL_TIMEZONE);
    return format(zonedDate, formatString, { locale: ptBR });
  } catch {
    return "Data inválida";
  }
}

/**
 * Converte uma data UTC para o horário de São Paulo
 * @param date - Data em UTC (string ou Date)
 * @returns Date object no timezone de São Paulo
 */
export function toSaoPauloTime(date: string | Date): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(dateObj, BRAZIL_TIMEZONE);
}

/**
 * Formata apenas a data (sem hora) no formato brasileiro
 * @param date - Data em UTC
 * @returns Data formatada como "dd/MM/yyyy"
 */
export function formatDateOnlyBR(date: string | Date | null | undefined): string {
  return formatDateBR(date, "dd/MM/yyyy");
}

/**
 * Formata data e hora completos no formato brasileiro
 * @param date - Data em UTC
 * @returns Data formatada como "dd/MM/yyyy 'às' HH:mm"
 */
export function formatDateTimeBR(date: string | Date | null | undefined): string {
  return formatDateBR(date, "dd/MM/yyyy 'às' HH:mm");
}
