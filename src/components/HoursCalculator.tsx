import React, { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Clock, Plus, Minus } from "lucide-react";

interface TimeEntry {
  day: string;
  regularHours: number;
  overtimeHours: number;
  absenceHours: number;
}

interface HoursCalculatorProps {
  onCalculate?: (
    totalRegular: number,
    totalOvertime: number,
    totalAbsence: number,
  ) => void;
  initialEntries?: TimeEntry[];
  initialValues?: {
    regularHours: number;
    overtimeHours: number;
    absenceHours: number;
  };
  hasError?: boolean;
}

const defaultEntries: TimeEntry[] = [
  { day: "Monday", regularHours: 8, overtimeHours: 0, absenceHours: 0 },
  { day: "Tuesday", regularHours: 8, overtimeHours: 0, absenceHours: 0 },
  { day: "Wednesday", regularHours: 8, overtimeHours: 0, absenceHours: 0 },
  { day: "Thursday", regularHours: 8, overtimeHours: 0, absenceHours: 0 },
  { day: "Friday", regularHours: 8, overtimeHours: 0, absenceHours: 0 },
];

const HoursCalculator = ({
  onCalculate,
  initialEntries = defaultEntries,
  initialValues,
  hasError = false,
}: HoursCalculatorProps) => {
  const [entries, setEntries] = useState<TimeEntry[]>(initialEntries);
  const [totals, setTotals] = useState({
    regularHours: initialValues?.regularHours || 0,
    overtimeHours: initialValues?.overtimeHours || 0,
    absenceHours: initialValues?.absenceHours || 0,
  });

  useEffect(() => {
    const regularSum = entries.reduce(
      (sum, entry) => sum + entry.regularHours,
      0,
    );
    const overtimeSum = entries.reduce(
      (sum, entry) => sum + entry.overtimeHours,
      0,
    );
    const absenceSum = entries.reduce(
      (sum, entry) => sum + entry.absenceHours,
      0,
    );

    setTotals({
      regularHours: regularSum,
      overtimeHours: overtimeSum,
      absenceHours: absenceSum,
    });

    if (onCalculate) {
      onCalculate(regularSum, overtimeSum, absenceSum);
    }
  }, [entries, onCalculate]);

  const handleInputChange = (
    index: number,
    field: keyof Omit<TimeEntry, "day">,
    value: string,
  ) => {
    const numValue = parseFloat(value) || 0;
    const newEntries = [...entries];
    newEntries[index] = {
      ...newEntries[index],
      [field]: numValue,
    };
    setEntries(newEntries);
  };

  const incrementValue = (
    index: number,
    field: keyof Omit<TimeEntry, "day">,
  ) => {
    const newEntries = [...entries];
    newEntries[index] = {
      ...newEntries[index],
      [field]: newEntries[index][field] + 0.5,
    };
    setEntries(newEntries);
  };

  const decrementValue = (
    index: number,
    field: keyof Omit<TimeEntry, "day">,
  ) => {
    const newEntries = [...entries];
    const currentValue = newEntries[index][field];
    newEntries[index] = {
      ...newEntries[index],
      [field]: Math.max(0, currentValue - 0.5),
    };
    setEntries(newEntries);
  };

  return (
    <Card className={`w-full bg-white dark:bg-gray-800 ${hasError ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Hours Calculator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Regular Hours</TableHead>
              <TableHead>Overtime</TableHead>
              <TableHead>Absence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry, index) => (
              <TableRow key={entry.day}>
                <TableCell className="font-medium">{entry.day}</TableCell>

                <TableCell>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => decrementValue(index, "regularHours")}
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <Input
                      type="number"
                      value={entry.regularHours}
                      onChange={(e) =>
                        handleInputChange(index, "regularHours", e.target.value)
                      }
                      className="w-16 text-center"
                      step="0.5"
                      min="0"
                    />
                    <button
                      type="button"
                      onClick={() => incrementValue(index, "regularHours")}
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => decrementValue(index, "overtimeHours")}
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <Input
                      type="number"
                      value={entry.overtimeHours}
                      onChange={(e) =>
                        handleInputChange(
                          index,
                          "overtimeHours",
                          e.target.value,
                        )
                      }
                      className="w-16 text-center"
                      step="0.5"
                      min="0"
                    />
                    <button
                      type="button"
                      onClick={() => incrementValue(index, "overtimeHours")}
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => decrementValue(index, "absenceHours")}
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <Input
                      type="number"
                      value={entry.absenceHours}
                      onChange={(e) =>
                        handleInputChange(index, "absenceHours", e.target.value)
                      }
                      className="w-16 text-center"
                      step="0.5"
                      min="0"
                    />
                    <button
                      type="button"
                      onClick={() => incrementValue(index, "absenceHours")}
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            <TableRow className="font-bold bg-gray-50 dark:bg-gray-700">
              <TableCell>Total</TableCell>
              <TableCell>{totals.regularHours} hrs</TableCell>
              <TableCell>{totals.overtimeHours} hrs</TableCell>
              <TableCell>{totals.absenceHours} hrs</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default HoursCalculator;
