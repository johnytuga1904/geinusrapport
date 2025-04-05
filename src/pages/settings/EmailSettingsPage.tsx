import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BackToDashboardButton } from "@/components/BackToDashboardButton";

interface SMTPConfig {
  host: string;
  port: number | string;
  username: string;
  password: string;
  secure: boolean;
  useTLS?: boolean; // Kompatibilität mit älteren Datensätzen
  from_email: string;
  fromEmail?: string; // Kompatibilität mit älteren Datensätzen
}

export function EmailSettingsPage() {
  const navigate = useNavigate();
  const [smtpConfig, setSmtpConfig] = useState<SMTPConfig>({
    host: '',
    port: '587', // Als String initialisieren, um Typ-Konsistenz zu gewährleisten
    username: '',
    password: '',
    secure: true,
    useTLS: true,
    from_email: '',
    fromEmail: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Hole zuerst den aktuellen Benutzer
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('Fehler beim Laden des Benutzers:', userError);
          throw new Error('Fehler beim Laden des Benutzers');
        }
        if (!user) throw new Error('Kein Benutzer gefunden');

        console.log('Benutzer geladen:', user.id);

        // Lade die SMTP-Konfiguration
        const { data: smtpData, error: smtpError } = await supabase
          .from('user_settings')
          .select('smtp_config')
          .eq('user_id', user.id)
          .single();

        if (smtpError) {
          if (smtpError.code === 'PGRST116') {
            console.log('Keine Einstellungen gefunden, erstelle neue Einstellungen');
            return;
          }
          console.error('Fehler beim Laden der SMTP-Konfiguration:', smtpError);
          throw new Error(`Fehler beim Laden der E-Mail-Einstellungen: ${smtpError.message}`);
        }

        if (smtpData?.smtp_config) {
          console.log('SMTP-Konfiguration geladen:', smtpData.smtp_config);
          // Stelle sicher, dass alle Felder definiert sind, um kontrollierte Eingabefelder zu gewährleisten
          const config = smtpData.smtp_config;
          
          // Normalisiere die Daten, um Kompatibilität mit verschiedenen Feldnamen zu gewährleisten
          const normalizedConfig = {
            host: config.host || '',
            port: config.port ? String(config.port) : '587', // Als String speichern für Konsistenz
            username: config.username || '',
            password: config.password || '',
            secure: typeof config.secure === 'boolean' ? config.secure : 
                   typeof config.useTLS === 'boolean' ? config.useTLS : true,
            useTLS: typeof config.useTLS === 'boolean' ? config.useTLS : 
                    typeof config.secure === 'boolean' ? config.secure : true,
            from_email: config.from_email || config.fromEmail || '',
            fromEmail: config.fromEmail || config.from_email || ''
          };
          
          setSmtpConfig(normalizedConfig);
        }
      } catch (error) {
        console.error('Fehler beim Laden der E-Mail-Einstellungen:', error);
        setError(error instanceof Error ? error.message : 'Ein Fehler ist beim Laden der Einstellungen aufgetreten');
      }
    };
    loadSettings();
  }, []);

  const handleSmtpUpdate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Hole zuerst den aktuellen Benutzer
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Fehler beim Laden des Benutzers:', userError);
        throw new Error('Fehler beim Laden des Benutzers');
      }
      if (!user) throw new Error('Kein Benutzer gefunden');

      console.log('Benutzer geladen für Update:', user.id);

      // Validiere die Eingaben
      if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.username || 
          (!smtpConfig.from_email && !smtpConfig.fromEmail)) {
        throw new Error('Bitte füllen Sie alle erforderlichen Felder aus');
      }
      
      // Stelle sicher, dass wir ein einheitliches Format für die Datenbank haben
      const normalizedConfig = {
        host: smtpConfig.host,
        port: typeof smtpConfig.port === 'string' ? parseInt(smtpConfig.port) || 587 : smtpConfig.port,
        username: smtpConfig.username,
        password: smtpConfig.password,
        useTLS: smtpConfig.secure,
        fromEmail: smtpConfig.from_email || smtpConfig.fromEmail
      };

      // Prüfe zuerst, ob bereits Einstellungen existieren
      const { data: existingData, error: checkError } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Fehler beim Prüfen der existierenden Einstellungen:', checkError);
        throw new Error('Fehler beim Prüfen der Einstellungen');
      }

      let result;
      if (existingData) {
        // Update existierender Einstellungen
        result = await supabase
          .from('user_settings')
          .update({
            smtp_config: normalizedConfig,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select();
      } else {
        // Erstelle neue Einstellungen
        result = await supabase
          .from('user_settings')
          .insert({
            user_id: user.id,
            smtp_config: normalizedConfig,
            updated_at: new Date().toISOString()
          })
          .select();
      }

      if (result.error) {
        console.error('Fehler beim Speichern der SMTP-Konfiguration:', result.error);
        throw new Error(`Fehler beim Speichern der E-Mail-Einstellungen: ${result.error.message}`);
      }

      console.log('SMTP-Konfiguration erfolgreich gespeichert:', result.data);
      setSuccess(true);
    } catch (error) {
      console.error('Fehler beim Speichern der E-Mail-Einstellungen:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Ein unerwarteter Fehler ist aufgetreten');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <BackToDashboardButton />

      <Card>
        <CardHeader>
          <CardTitle>E-Mail-Einstellungen</CardTitle>
          <CardDescription>Konfigurieren Sie Ihre E-Mail-Einstellungen für das Senden von Rapporten</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">SMTP-Konfiguration</h3>
              <p className="text-sm text-muted-foreground">
                Konfigurieren Sie Ihren SMTP-Server für das Senden von Rapporten
              </p>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="from-email">Absender-E-Mail *</Label>
                <Input
                  id="from-email"
                  type="email"
                  value={smtpConfig.from_email || smtpConfig.fromEmail || ''}
                  onChange={(e) => setSmtpConfig({ 
                    ...smtpConfig, 
                    from_email: e.target.value,
                    fromEmail: e.target.value 
                  })}
                  placeholder="ihre@email.de"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP-Server *</Label>
                  <Input
                    id="smtp-host"
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                    placeholder="smtp.example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Port *</Label>
                  <Input
                    id="smtp-port"
                    type="text" // Ändern zu text, um Konsistenz zu gewährleisten
                    value={smtpConfig.port || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSmtpConfig({ ...smtpConfig, port: value })
                    }}
                    placeholder="587"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-username">Benutzername *</Label>
                <Input
                  id="smtp-username"
                  value={smtpConfig.username}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                  placeholder="ihr@email.de"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtp-password">Passwort *</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  value={smtpConfig.password}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                  placeholder="Ihr SMTP-Passwort"
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="smtp-tls"
                  checked={smtpConfig.secure || smtpConfig.useTLS || false}
                  onCheckedChange={(checked) => setSmtpConfig({ 
                    ...smtpConfig, 
                    secure: checked,
                    useTLS: checked 
                  })}
                />
                <Label htmlFor="smtp-tls">TLS verwenden</Label>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleSmtpUpdate}
                disabled={loading}
                size="sm"
              >
                {loading ? 'Wird gespeichert...' : 'E-Mail-Konfiguration speichern'}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>
                  Ihre E-Mail-Konfiguration wurde erfolgreich gespeichert.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Diese E-Mail-Konfiguration wird für das Senden von Rapporten verwendet.</p>
            <p>Stellen Sie sicher, dass die SMTP-Einstellungen korrekt sind, damit die Rapporte erfolgreich versendet werden können.</p>
            <p className="mt-2">* Pflichtfelder</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 