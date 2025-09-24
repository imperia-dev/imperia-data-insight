import { useState, useEffect } from 'react';

interface PasswordStrength {
  score: number; // 0-4
  level: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
  color: string;
  percentage: number;
}

interface PasswordRequirements {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  notCommon: boolean;
  notPwned?: boolean;
}

const COMMON_PASSWORDS = [
  'password', '123456', '123456789', 'qwerty', 'abc123', '111111',
  'password123', 'senha123', 'admin', 'letmein', 'welcome', 'monkey',
  '1234567890', 'password1', 'qwertyuiop', 'superman', 'iloveyou'
];

export function usePasswordStrength(password: string) {
  const [strength, setStrength] = useState<PasswordStrength>({
    score: 0,
    level: 'very-weak',
    feedback: [],
    color: 'hsl(var(--destructive))',
    percentage: 0,
  });

  const [requirements, setRequirements] = useState<PasswordRequirements>({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    notCommon: true,
    notPwned: undefined,
  });

  const [isPwnedChecking, setIsPwnedChecking] = useState(false);

  // Check password against Have I Been Pwned API
  const checkPwnedPassword = async (pwd: string) => {
    if (!pwd || pwd.length < 8) return;
    
    setIsPwnedChecking(true);
    try {
      const response = await fetch(
        `https://agttqqaampznczkyfvkf.supabase.co/functions/v1/check-pwned-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: pwd }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRequirements((prev) => ({
          ...prev,
          notPwned: !data.isPwned,
        }));
        
        if (data.isPwned) {
          setStrength((prev) => ({
            ...prev,
            feedback: [
              ...prev.feedback.filter(f => !f.includes('vazamento')),
              data.message || 'Esta senha foi encontrada em vazamentos de dados',
            ],
          }));
        }
      }
    } catch (error) {
      console.error('Error checking pwned password:', error);
    } finally {
      setIsPwnedChecking(false);
    }
  };

  useEffect(() => {
    if (!password) {
      setStrength({
        score: 0,
        level: 'very-weak',
        feedback: [],
        color: 'hsl(var(--muted))',
        percentage: 0,
      });
      setRequirements({
        minLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false,
        notCommon: true,
        notPwned: undefined,
      });
      return;
    }

    const feedback: string[] = [];
    let score = 0;

    // Check requirements
    const reqs: PasswordRequirements = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      notCommon: !COMMON_PASSWORDS.some(common => 
        password.toLowerCase().includes(common.toLowerCase())
      ),
      notPwned: requirements.notPwned, // Keep previous value until async check completes
    };

    // Calculate score
    if (reqs.minLength) score++;
    if (reqs.hasUpperCase) score++;
    if (reqs.hasLowerCase) score++;
    if (reqs.hasNumber) score++;
    if (reqs.hasSpecialChar) score++;
    
    // Bonus points for length
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    
    // Penalty for common passwords
    if (!reqs.notCommon) {
      score = Math.max(0, score - 2);
      feedback.push('Evite senhas comuns ou previsíveis');
    }
    
    // Penalty for pwned passwords
    if (reqs.notPwned === false) {
      score = Math.max(0, score - 2);
    }

    // Generate feedback
    if (!reqs.minLength) feedback.push('Use pelo menos 8 caracteres');
    if (!reqs.hasUpperCase) feedback.push('Adicione letras maiúsculas');
    if (!reqs.hasLowerCase) feedback.push('Adicione letras minúsculas');
    if (!reqs.hasNumber) feedback.push('Adicione números');
    if (!reqs.hasSpecialChar) feedback.push('Adicione caracteres especiais (!@#$%...)');

    // Determine level and color
    let level: PasswordStrength['level'];
    let color: string;
    let percentage: number;

    if (score <= 2) {
      level = 'very-weak';
      color = 'hsl(var(--destructive))';
      percentage = 20;
    } else if (score <= 3) {
      level = 'weak';
      color = 'hsl(var(--warning))';
      percentage = 40;
    } else if (score <= 4) {
      level = 'fair';
      color = 'hsl(var(--warning))';
      percentage = 60;
    } else if (score <= 5) {
      level = 'good';
      color = 'hsl(var(--success))';
      percentage = 80;
    } else {
      level = 'strong';
      color = 'hsl(var(--success))';
      percentage = 100;
    }

    setStrength({
      score: Math.min(score, 5),
      level,
      feedback,
      color,
      percentage,
    });
    
    setRequirements(reqs);
    
    // Check against Have I Been Pwned (debounced)
    const timeoutId = setTimeout(() => {
      checkPwnedPassword(password);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [password]);

  return {
    strength,
    requirements,
    isPwnedChecking,
  };
}