import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/lib/supabase";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, subYears } from "date-fns";
import { de } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChartData {
  name: string;
  hours: number;
  absences: number;
  overtime: number;
}

interface PieChartData {
  name: string;
  value: number;
}

interface ChartsProps {
  savedReports: Array<{
    id: string;
    name: string;
    period: string;
    date: string;
    content: string;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function Charts({ savedReports }: ChartsProps) {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year" | "custom">("month");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [pieData, setPieData] = useState<PieChartData[]>([]);
  const [selectedObject, setSelectedObject] = useState<string>("");
  const [availableObjects, setAvailableObjects] = useState<string[]>([]);
  const [viewType, setViewType] = useState<"all" | "single">("all");
  const [isLoading, setIsLoading] = useState(true);

  const processData = (entries: any[], startDate: Date, endDate: Date) => {
    // Filtere zuerst die Einträge nach dem ausgewählten Zeitraum
    const filteredEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= startDate && entryDate <= endDate;
    });

    console.log(`Gefilterte Einträge im Zeitraum: ${filteredEntries.length}`);

    // Sammle alle verfügbaren Objekte
    const objects = new Set<string>();
    filteredEntries.forEach(entry => {
      if (entry.object) {
        objects.add(entry.object);
      }
    });
    setAvailableObjects(Array.from(objects));

    if (viewType === "all") {
      // Gruppiere Stunden nach Objekten für das Kreisdiagramm
      const objectHours: Record<string, number> = {};
      filteredEntries.forEach(entry => {
        if (entry.object && entry.hours) {
          objectHours[entry.object] = (objectHours[entry.object] || 0) + entry.hours;
        }
      });

      const pieChartData = Object.entries(objectHours)
        .map(([name, value]) => ({
          name,
          value
        }))
        .sort((a, b) => b.value - a.value); // Sortiere nach Stunden absteigend

      console.log('Pie Chart Daten:', pieChartData);
      setPieData(pieChartData);
    } else if (viewType === "single" && selectedObject) {
      // Gruppiere Daten nach Zeitraum für das ausgewählte Objekt
      const filteredObjectEntries = filteredEntries.filter(entry => entry.object === selectedObject);
      let groupedData: ChartData[];

      switch (timeRange) {
        case "week":
          groupedData = groupByWeek(filteredObjectEntries, startDate, endDate);
          break;
        case "month":
          groupedData = groupByMonth(filteredObjectEntries, startDate, endDate);
          break;
        case "year":
          groupedData = groupByYear(filteredObjectEntries, startDate, endDate);
          break;
        default:
          groupedData = groupByMonth(filteredObjectEntries, startDate, endDate);
      }

      console.log('Bar Chart Daten:', groupedData);
      setChartData(groupedData);
    }
  };

  const fetchData = async (startDate: Date, endDate: Date) => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Erweitere den Zeitraum um einen Tag in beide Richtungen für inklusivere Suche
      const queryStartDate = new Date(startDate);
      queryStartDate.setDate(queryStartDate.getDate() - 1);
      const queryEndDate = new Date(endDate);
      queryEndDate.setDate(queryEndDate.getDate() + 1);

      console.log('Suche Berichte von:', format(queryStartDate, 'dd.MM.yyyy'), 'bis:', format(queryEndDate, 'dd.MM.yyyy'));

      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", queryStartDate.toISOString())
        .lte("date", queryEndDate.toISOString());

      if (error) throw error;

      console.log(`${data.length} Berichte gefunden`);

      // Verarbeite die Daten aus den Berichten
      const entries = data.flatMap(report => {
        const content = typeof report.content === 'string' ? JSON.parse(report.content) : report.content;
        return content.entries || [];
      });

      console.log(`Insgesamt ${entries.length} Einträge gefunden`);
      processData(entries, startDate, endDate);
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupByWeek = (entries: any[], startDate: Date, endDate: Date): ChartData[] => {
    const weeks: ChartData[] = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const weekStart = startOfWeek(currentDate, { locale: de });
      const weekEnd = endOfWeek(currentDate, { locale: de });
      
      const weekEntries = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= weekStart && entryDate <= weekEnd;
      });

      weeks.push({
        name: `KW ${format(weekStart, "w", { locale: de })}`,
        hours: weekEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0),
        absences: weekEntries.reduce((sum, entry) => sum + (entry.absences || 0), 0),
        overtime: weekEntries.reduce((sum, entry) => sum + (entry.overtime || 0), 0),
      });

      // Eine Woche hinzufügen
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return weeks;
  };

  const groupByMonth = (entries: any[], startDate: Date, endDate: Date): ChartData[] => {
    const months: ChartData[] = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      
      const monthEntries = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= monthStart && entryDate <= monthEnd;
      });

      months.push({
        name: format(currentDate, "MMM yyyy", { locale: de }),
        hours: monthEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0),
        absences: monthEntries.reduce((sum, entry) => sum + (entry.absences || 0), 0),
        overtime: monthEntries.reduce((sum, entry) => sum + (entry.overtime || 0), 0),
      });

      // Einen Monat hinzufügen
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return months;
  };

  const groupByYear = (entries: any[], startDate: Date, endDate: Date): ChartData[] => {
    const years: ChartData[] = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const yearStart = startOfYear(currentDate);
      const yearEnd = endOfYear(currentDate);
      
      const yearEntries = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= yearStart && entryDate <= yearEnd;
      });

      years.push({
        name: format(currentDate, "yyyy", { locale: de }),
        hours: yearEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0),
        absences: yearEntries.reduce((sum, entry) => sum + (entry.absences || 0), 0),
        overtime: yearEntries.reduce((sum, entry) => sum + (entry.overtime || 0), 0),
      });

      // Ein Jahr hinzufügen
      currentDate.setFullYear(currentDate.getFullYear() + 1);
    }

    return years;
  };

  useEffect(() => {
    let startDate: Date;
    let endDate: Date;

    if (timeRange === "custom" && customDateRange) {
      startDate = customDateRange.from;
      endDate = customDateRange.to;
    } else {
      const now = new Date();
      switch (timeRange) {
        case "week":
          // Letzte 4 Wochen
          startDate = subWeeks(now, 4);
          endDate = now;
          break;
        case "month":
          // Letzte 12 Monate
          startDate = subMonths(now, 11);
          startDate = startOfMonth(startDate);
          endDate = endOfMonth(now);
          break;
        case "year":
          // Letzte 3 Jahre
          startDate = subYears(now, 2);
          startDate = startOfYear(startDate);
          endDate = endOfYear(now);
          break;
        default:
          startDate = subWeeks(now, 4);
          endDate = now;
      }
    }

    console.log('Zeitraum:', {
      start: format(startDate, 'dd.MM.yyyy'),
      end: format(endDate, 'dd.MM.yyyy'),
      range: timeRange
    });

    fetchData(startDate, endDate);
  }, [timeRange, customDateRange, viewType, selectedObject, savedReports]);

  const handleDateRangeChange = (range: { from: Date; to: Date } | null) => {
    setCustomDateRange(range);
    if (range) {
      setTimeRange("custom");
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={viewType} onValueChange={(value: "all" | "single") => setViewType(value)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">Alle Objekte</TabsTrigger>
          <TabsTrigger value="single">Einzelnes Objekt</TabsTrigger>
        </TabsList>

        <div className="mt-4 flex items-center gap-4">
          {viewType === "single" && (
            <Select value={selectedObject} onValueChange={setSelectedObject}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Objekt auswählen" />
              </SelectTrigger>
              <SelectContent>
                {availableObjects.map((object) => (
                  <SelectItem key={object} value={object}>
                    {object}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={timeRange} onValueChange={(value: "week" | "month" | "year" | "custom") => setTimeRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Zeitraum auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Wöchentlich</SelectItem>
              <SelectItem value="month">Monatlich</SelectItem>
              <SelectItem value="year">Jährlich</SelectItem>
              <SelectItem value="custom">Benutzerdefiniert</SelectItem>
            </SelectContent>
          </Select>

          {timeRange === "custom" && (
            <DateRangePicker
              value={customDateRange}
              onChange={handleDateRangeChange}
              placeholder="Zeitraum auswählen"
            />
          )}
        </div>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gesamtübersicht Arbeitsstunden pro Objekt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      label={({name, value}) => `${name}: ${value.toFixed(1)}h`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}h`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="single" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedObject ? `Detailübersicht für ${selectedObject}` : 'Bitte wählen Sie ein Objekt'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {selectedObject ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="hours" name="Arbeitsstunden" fill="#3b82f6" />
                      <Bar dataKey="absences" name="Absenzen" fill="#ef4444" />
                      <Bar dataKey="overtime" name="Überstunden" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Bitte wählen Sie ein Objekt aus der Liste
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 