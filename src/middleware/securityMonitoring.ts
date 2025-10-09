import { supabase } from '@/integrations/supabase/client';

interface SecurityEvent {
  type: 'login_attempt' | 'failed_login' | 'suspicious_activity' | 'rate_limit' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, any>;
}

class SecurityMonitor {
  private failedLoginAttempts: Map<string, number> = new Map();
  private suspiciousIPs: Set<string> = new Set();
  private eventQueue: SecurityEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Flush events every 30 seconds
    this.startFlushInterval();
  }

  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 30000);
  }

  async logSecurityEvent(event: SecurityEvent) {
    this.eventQueue.push(event);

    // Immediate flush for critical events
    if (event.severity === 'critical') {
      await this.flushEvents();
    }
  }

  async trackFailedLogin(email: string, ip?: string) {
    const attempts = this.failedLoginAttempts.get(email) || 0;
    this.failedLoginAttempts.set(email, attempts + 1);

    // Alert on multiple failed attempts
    if (attempts + 1 >= 3) {
      await this.logSecurityEvent({
        type: 'suspicious_activity',
        severity: attempts + 1 >= 5 ? 'high' : 'medium',
        details: {
          email,
          attempts: attempts + 1,
          ip,
          reason: 'Multiple failed login attempts'
        }
      });

      // Add IP to suspicious list after 5 attempts
      if (attempts + 1 >= 5 && ip) {
        this.suspiciousIPs.add(ip);
      }

      // Trigger automatic alert after threshold
      if (attempts + 1 >= 5) {
        await this.triggerAutomaticAlert(
          'failed_login',
          attempts + 1 >= 10 ? 'critical' : 'high',
          'Múltiplas tentativas de login falhadas',
          `Detectadas ${attempts + 1} tentativas de login falhadas para ${email}`,
          { email, attempts: attempts + 1, ip }
        );
      }
    }

    // Clear attempts after 15 minutes
    setTimeout(() => {
      this.failedLoginAttempts.delete(email);
    }, 15 * 60 * 1000);
  }

  async triggerAutomaticAlert(
    alertType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    title: string,
    message: string,
    metadata?: Record<string, any>
  ) {
    try {
      // Create alert in database
      const { data: alert, error: alertError } = await supabase
        .from('security_alerts')
        .insert({
          alert_type: alertType,
          severity,
          title,
          message,
          metadata: metadata || {}
        })
        .select()
        .single();

      if (alertError) {
        console.error('Error creating security alert:', alertError);
        return;
      }

      // Get alert configuration
      const { data: config } = await supabase
        .from('security_alert_config')
        .select('notify_roles')
        .eq('alert_type', alertType)
        .eq('enabled', true)
        .single();

      if (!config) {
        console.log('No alert configuration found for:', alertType);
        return;
      }

      // Send alert via edge function
      await supabase.functions.invoke('send-security-alert', {
        body: {
          alert_id: alert.id,
          alert_type: alertType,
          severity,
          title,
          message,
          metadata,
          notify_roles: config.notify_roles
        }
      });

      console.log('Automatic security alert triggered:', alert.id);
    } catch (error) {
      console.error('Error triggering automatic alert:', error);
    }
  }

  async trackSuccessfulLogin(email: string) {
    // Clear failed attempts on successful login
    this.failedLoginAttempts.delete(email);
  }

  checkSuspiciousIP(ip: string): boolean {
    return this.suspiciousIPs.has(ip);
  }

  private async flushEvents() {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Batch insert events
      const eventsToInsert = events.map(event => ({
        event_type: event.type,
        severity: event.severity,
        user_id: user?.id,
        details: event.details || {},
        user_agent: navigator.userAgent
      }));

      const { error } = await supabase
        .from('security_events')
        .insert(eventsToInsert);

      if (error) {
        console.error('Failed to log security events:', error);
        // Re-add events to queue on failure
        this.eventQueue.push(...events);
      }
    } catch (error) {
      console.error('Error flushing security events:', error);
      // Re-add events to queue on failure
      this.eventQueue.push(...events);
    }
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    // Flush remaining events
    this.flushEvents();
  }
}

// Singleton instance
export const securityMonitor = new SecurityMonitor();

// Helper functions for common security events
export async function logLoginAttempt(email: string, success: boolean, ip?: string) {
  if (success) {
    await securityMonitor.trackSuccessfulLogin(email);
    await securityMonitor.logSecurityEvent({
      type: 'login_attempt',
      severity: 'low',
      details: { email, success: true, ip }
    });
  } else {
    await securityMonitor.trackFailedLogin(email, ip);
    await securityMonitor.logSecurityEvent({
      type: 'failed_login',
      severity: 'low',
      details: { email, success: false, ip }
    });
  }
}

export async function logUnauthorizedAccess(path: string, userId?: string) {
  await securityMonitor.logSecurityEvent({
    type: 'unauthorized_access',
    severity: 'medium',
    details: {
      path,
      userId,
      timestamp: new Date().toISOString()
    }
  });
}

export async function logRateLimitExceeded(endpoint: string, userId?: string) {
  await securityMonitor.logSecurityEvent({
    type: 'rate_limit',
    severity: 'medium',
    details: {
      endpoint,
      userId,
      timestamp: new Date().toISOString()
    }
  });
}

export async function logSuspiciousActivity(reason: string, details?: Record<string, any>) {
  await securityMonitor.logSecurityEvent({
    type: 'suspicious_activity',
    severity: 'high',
    details: {
      reason,
      ...details,
      timestamp: new Date().toISOString()
    }
  });
}