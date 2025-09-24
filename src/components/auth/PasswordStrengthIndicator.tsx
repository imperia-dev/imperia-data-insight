import { Check, X, AlertTriangle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
  className?: string;
}

export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
  className,
}: PasswordStrengthIndicatorProps) {
  const { strength, requirements, isPwnedChecking } = usePasswordStrength(password);

  if (!password) return null;

  const levelText: Record<typeof strength.level, string> = {
    'very-weak': 'Muito Fraca',
    'weak': 'Fraca',
    'fair': 'Razoável',
    'good': 'Boa',
    'strong': 'Forte',
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Força da Senha</span>
          <span style={{ color: strength.color }} className="font-medium">
            {levelText[strength.level]}
          </span>
        </div>
        <Progress
          value={strength.percentage}
          className="h-2"
        />
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-1.5">
          <RequirementItem
            met={requirements.minLength}
            text="Mínimo de 8 caracteres"
          />
          <RequirementItem
            met={requirements.hasUpperCase}
            text="Letra maiúscula (A-Z)"
          />
          <RequirementItem
            met={requirements.hasLowerCase}
            text="Letra minúscula (a-z)"
          />
          <RequirementItem
            met={requirements.hasNumber}
            text="Número (0-9)"
          />
          <RequirementItem
            met={requirements.hasSpecialChar}
            text="Caractere especial (!@#$%...)"
          />
          <RequirementItem
            met={requirements.notCommon}
            text="Não é uma senha comum"
          />
          {requirements.notPwned !== undefined && (
            <RequirementItem
              met={requirements.notPwned}
              text={
                isPwnedChecking ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Verificando vazamentos...
                  </span>
                ) : requirements.notPwned ? (
                  'Não encontrada em vazamentos'
                ) : (
                  <span className="text-destructive">
                    Senha encontrada em vazamentos de dados!
                  </span>
                )
              }
              icon={
                isPwnedChecking ? null : requirements.notPwned ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )
              }
            />
          )}
        </div>
      )}

      {/* Feedback Alert */}
      {strength.feedback.length > 0 && (
        <Alert
          variant={strength.level === 'very-weak' || strength.level === 'weak' ? 'destructive' : 'default'}
          className="py-2"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {strength.feedback[0]}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

interface RequirementItemProps {
  met: boolean;
  text: React.ReactNode;
  icon?: React.ReactNode;
}

function RequirementItem({ met, text, icon }: RequirementItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs transition-colors',
        met ? 'text-success' : 'text-muted-foreground'
      )}
    >
      {icon !== null ? (
        icon || (met ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <X className="h-3.5 w-3.5" />
        ))
      ) : null}
      {text}
    </div>
  );
}