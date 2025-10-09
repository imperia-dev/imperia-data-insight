import { z } from 'zod';

export const customerPendencyRequestSchema = z.object({
  order_id: z.string()
    .min(1, 'ID do pedido é obrigatório')
    .max(100, 'ID do pedido muito longo'),
  
  description: z.string()
    .min(20, 'Descrição deve ter no mínimo 20 caracteres')
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres'),
  
  priority: z.enum(['baixa', 'normal', 'alta', 'urgente'])
    .default('normal'),
  
  attachments: z.array(z.object({
    url: z.string().url(),
    name: z.string(),
    size: z.number(),
    type: z.string()
  })).optional().default([])
});

export type CustomerPendencyRequestInput = z.infer<typeof customerPendencyRequestSchema>;
