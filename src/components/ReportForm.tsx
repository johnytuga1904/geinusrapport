import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, ClipboardList, Save, Mic, AlertCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import LocationAutocomplete from "./LocationAutocomplete";
import ObjectAutocomplete from "./ObjectAutocomplete";
import HoursCalculator from "./HoursCalculator";
import VoiceInput from "./VoiceInput";
import { de } from "date-fns/locale";

export interface ReportFormProps {
  onSubmit?: (formData: ReportFormData) => void;
  initialData?: Partial<ReportFormData>;
  onReportGenerated: (report: any) => void;
}

export interface ReportFormData {
  name: string;
  date: Date;
  orderNumber: string;
  location: string;
  objects: string;
  notes: string;
  regularHours: number;
  overtimeHours: number;
  absenceHours: number;
  expenses?: string;
  expenseAmount?: number;
}

const defaultFormData: ReportFormData = {
  name: "",
  date: new Date(),
  orderNumber: "",
  location: "",
  objects: "",
  notes: "",
  regularHours: 0,
  overtimeHours: 0,
  absenceHours: 0,
  expenses: "",
  expenseAmount: 0,
};

const ReportForm: React.FC<ReportFormProps> = ({
  onSubmit,
  initialData = {},
  onReportGenerated,
}) => {
  const [formData, setFormData] = useState<ReportFormData>({
    ...defaultFormData,
    ...initialData,
  });

  const [voiceField, setVoiceField] = useState<keyof ReportFormData | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ReportFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Setze das aktuelle Datum als Standard, wenn kein Datum in initialData vorhanden ist
  useEffect(() => {
    if (!initialData.date) {
      setFormData(prev => ({
        ...prev,
        date: new Date()
      }));
    }
  }, [initialData]);

  const handleInputChange = (field: keyof ReportFormData, value: any) => {
    // Entferne den Fehler für dieses Feld, wenn ein Wert eingegeben wird
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[field];
        return newErrors;
      });
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleVoiceTranscript = (text: string) => {
    if (voiceField && typeof text === "string") {
      handleInputChange(voiceField, text);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ReportFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name ist erforderlich";
    }

    if (!formData.orderNumber.trim()) {
      newErrors.orderNumber = "Auftragsnummer ist erforderlich";
    }

    if (!formData.location.trim()) {
      newErrors.location = "Ort ist erforderlich";
    }

    if (!formData.objects.trim()) {
      newErrors.objects = "Objekt ist erforderlich";
    }

    if (formData.regularHours <= 0 && formData.absenceHours <= 0) {
      newErrors.regularHours = "Stunden müssen größer als 0 sein";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Bitte füllen Sie alle erforderlichen Felder aus");
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
      toast.success("Eintrag erfolgreich gespeichert");
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      toast.error("Fehler beim Speichern des Eintrags");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHoursCalculation = (
    regularHours: number,
    overtimeHours: number,
    absenceHours: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      regularHours,
      overtimeHours,
      absenceHours,
    }));
    
    // Entferne Fehler für Stunden, wenn Werte gesetzt wurden
    if (regularHours > 0 || absenceHours > 0) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors.regularHours;
        return newErrors;
      });
    }
  };

  const activateVoiceFor = (field: keyof ReportFormData) => {
    setVoiceField(field);
  };

  return (
    <Card className="w-full bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" />
          Arbeitsrapport Eingabe
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center justify-between">
                Name {errors.name && <span className="text-red-500 text-xs flex items-center"><AlertCircle className="h-3 w-3 mr-1" />{errors.name}</span>}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Vollständiger Name"
                  className={cn("flex-1", errors.name && "border-red-500 focus-visible:ring-red-500")}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => activateVoiceFor("name")}
                  className={cn(voiceField === "name" ? "ring-2 ring-primary" : "")}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Date Field */}
            <div className="space-y-2">
              <Label htmlFor="date">Datum</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="flex">
                        <Input
                          id="date"
                          value={format(formData.date, "dd.MM.yyyy")}
                          readOnly
                          className="flex-1 cursor-pointer"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="absolute right-0 px-3"
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.date}
                        onSelect={(date) => handleInputChange("date", date || new Date())}
                        initialFocus
                        locale={de}
                        weekStartsOn={1}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Order Number Field */}
            <div className="space-y-2">
              <Label htmlFor="orderNumber" className="flex items-center justify-between">
                Auftragsnummer {errors.orderNumber && <span className="text-red-500 text-xs flex items-center"><AlertCircle className="h-3 w-3 mr-1" />{errors.orderNumber}</span>}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={formData.orderNumber}
                  onChange={(e) => handleInputChange("orderNumber", e.target.value)}
                  placeholder="Auftrag Nr."
                  className={cn("flex-1", errors.orderNumber && "border-red-500 focus-visible:ring-red-500")}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => activateVoiceFor("orderNumber")}
                  className={cn(voiceField === "orderNumber" ? "ring-2 ring-primary" : "")}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Location Field with Autocomplete */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center justify-between">
                Ort {errors.location && <span className="text-red-500 text-xs flex items-center"><AlertCircle className="h-3 w-3 mr-1" />{errors.location}</span>}
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <LocationAutocomplete
                    value={formData.location}
                    onChange={(value) => handleInputChange("location", value)}
                    placeholder="Ort eingeben"
                    className={cn(errors.location && "border-red-500 focus-visible:ring-red-500")}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => activateVoiceFor("location")}
                  className={cn(voiceField === "location" ? "ring-2 ring-primary" : "")}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Objects Field with Autocomplete */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="objects" className="flex items-center justify-between">
                Objekte {errors.objects && <span className="text-red-500 text-xs flex items-center"><AlertCircle className="h-3 w-3 mr-1" />{errors.objects}</span>}
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <ObjectAutocomplete
                    value={formData.objects}
                    onChange={(value) => handleInputChange("objects", value)}
                    placeholder="Objekte eingeben"
                    className={cn(errors.objects && "border-red-500 focus-visible:ring-red-500")}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => activateVoiceFor("objects")}
                  className={cn(voiceField === "objects" ? "ring-2 ring-primary" : "")}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Expenses Fields */}
            <div className="space-y-2">
              <Label htmlFor="expenses">Auslagen Beschreibung</Label>
              <div className="flex gap-2">
                <Input
                  id="expenses"
                  value={formData.expenses || ""}
                  onChange={(e) => handleInputChange("expenses", e.target.value)}
                  placeholder="Art der Auslagen"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => activateVoiceFor("expenses")}
                  className={cn(voiceField === "expenses" ? "ring-2 ring-primary" : "")}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="expenseAmount">Auslagen Betrag (CHF)</Label>
              <Input
                id="expenseAmount"
                type="number"
                step="0.01"
                min="0"
                value={formData.expenseAmount || 0}
                onChange={(e) => handleInputChange("expenseAmount", parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="flex-1"
              />
            </div>

            {/* Notes Field */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notizen</Label>
              <div className="flex gap-2">
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Zusätzliche Informationen"
                  className="flex-1 min-h-[100px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => activateVoiceFor("notes")}
                  className={cn(voiceField === "notes" ? "ring-2 ring-primary" : "")}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Voice Input Component */}
          <div className="flex justify-center my-4 sm:my-6">
            <VoiceInput onTranscript={handleVoiceTranscript} />
          </div>

          {/* Hours Calculator Component */}
          <div className="mt-8">
            <Label className="flex items-center justify-between mb-2">
              Arbeitsstunden {errors.regularHours && <span className="text-red-500 text-xs flex items-center"><AlertCircle className="h-3 w-3 mr-1" />{errors.regularHours}</span>}
            </Label>
            <HoursCalculator 
              onCalculate={handleHoursCalculation} 
              initialValues={{
                regularHours: formData.regularHours,
                overtimeHours: formData.overtimeHours,
                absenceHours: formData.absenceHours
              }}
              hasError={!!errors.regularHours}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end mt-6">
            <Button 
              type="submit" 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Eintrag speichern
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReportForm;
