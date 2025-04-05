import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { BackToDashboardButton } from "@/components/BackToDashboardButton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-8">
      <BackToDashboardButton />

      <h1 className="text-2xl font-bold mb-6">Einstellungen</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>E-Mail-Einstellungen</CardTitle>
            <CardDescription>
              Konfigurieren Sie Ihre E-Mail-Einstellungen für den Versand von Arbeitsberichten.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Hier können Sie Ihre SMTP-Konfiguration einrichten, um E-Mails direkt von Ihrem eigenen E-Mail-Konto zu versenden.</p>
            <Button 
              onClick={() => navigate('/settings/email')} 
              className="w-full md:w-auto"
            >
              E-Mail-Einstellungen verwalten
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}