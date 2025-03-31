import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

interface EmailSettings {
  senderEmail: string;
  recipientEmail: string;
  smtpServer: string;
  smtpPort: string;
  username: string;
  password: string;
}

export default function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<EmailSettings>({
    senderEmail: "",
    recipientEmail: "",
    smtpServer: "",
    smtpPort: "587",
    username: "",
    password: "",
  });

  // Load settings from localStorage when component mounts
  useEffect(() => {
    const savedSettings = localStorage.getItem("emailSettings");
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSaveSettings = () => {
    // Save settings to localStorage
    localStorage.setItem("emailSettings", JSON.stringify(settings));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>E-Mail-Einstellungen</DialogTitle>
          <DialogDescription>
            Konfigurieren Sie die E-Mail-Einstellungen für den automatischen Versand von Berichten.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="senderEmail" className="text-right">
              Absender
            </Label>
            <Input
              id="senderEmail"
              value={settings.senderEmail}
              onChange={(e) =>
                setSettings({ ...settings, senderEmail: e.target.value })
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="recipientEmail" className="text-right">
              Empfänger
            </Label>
            <Input
              id="recipientEmail"
              value={settings.recipientEmail}
              onChange={(e) =>
                setSettings({ ...settings, recipientEmail: e.target.value })
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="smtpServer" className="text-right">
              SMTP Server
            </Label>
            <Input
              id="smtpServer"
              value={settings.smtpServer}
              onChange={(e) =>
                setSettings({ ...settings, smtpServer: e.target.value })
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="smtpPort" className="text-right">
              SMTP Port
            </Label>
            <Input
              id="smtpPort"
              value={settings.smtpPort}
              onChange={(e) =>
                setSettings({ ...settings, smtpPort: e.target.value })
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              Benutzername
            </Label>
            <Input
              id="username"
              value={settings.username}
              onChange={(e) =>
                setSettings({ ...settings, username: e.target.value })
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Passwort
            </Label>
            <Input
              id="password"
              type="password"
              value={settings.password}
              onChange={(e) =>
                setSettings({ ...settings, password: e.target.value })
              }
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSaveSettings}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
