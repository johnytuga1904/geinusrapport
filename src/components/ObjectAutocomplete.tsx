import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { commonObjects } from "@/data/locations";
import { supabase } from "@/lib/supabase";

interface ObjectAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function ObjectAutocomplete({
  value,
  onChange,
  placeholder = "Objekt eingeben",
  className = "",
}: ObjectAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customObjects, setCustomObjects] = useState<string[]>([]);
  const [savedReportObjects, setSavedReportObjects] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Lade benutzerdefinierte Objekte aus dem localStorage
  useEffect(() => {
    const storedObjects = localStorage.getItem('customObjects');
    if (storedObjects) {
      try {
        const parsedObjects = JSON.parse(storedObjects);
        setCustomObjects(parsedObjects);
      } catch (error) {
        console.error('Fehler beim Laden der benutzerdefinierten Objekte:', error);
        setCustomObjects([]);
      }
    }
  }, []);

  // Lade Objekte aus gespeicherten Berichten
  useEffect(() => {
    const fetchSavedReportObjects = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('reports')
          .select('content')
          .eq('user_id', user.id);

        if (error) {
          console.error('Fehler beim Laden der Berichte:', error);
          return;
        }

        // Extrahiere Objekte aus den Berichten
        const objects = new Set<string>();
        data.forEach(report => {
          try {
            const content = JSON.parse(report.content);
            if (content.entries && Array.isArray(content.entries)) {
              content.entries.forEach((entry: any) => {
                if (entry.object && typeof entry.object === 'string' && entry.object.trim() !== '') {
                  objects.add(entry.object.trim());
                }
              });
            }
          } catch (e) {
            console.error('Fehler beim Parsen des Berichtsinhalts:', e);
          }
        });

        setSavedReportObjects(Array.from(objects));
      } catch (error) {
        console.error('Fehler beim Laden der Objekte aus gespeicherten Berichten:', error);
      }
    };

    fetchSavedReportObjects();
  }, []);

  // Speichere ein neues Objekt im localStorage
  const saveNewObject = (newObject: string) => {
    // Prüfe, ob das Objekt bereits in commonObjects oder customObjects existiert
    const allObjects = [...commonObjects, ...customObjects, ...savedReportObjects];
    if (!allObjects.includes(newObject) && newObject.trim() !== '') {
      const updatedCustomObjects = [...customObjects, newObject];
      setCustomObjects(updatedCustomObjects);
      localStorage.setItem('customObjects', JSON.stringify(updatedCustomObjects));
      console.log('Neues Objekt gespeichert:', newObject);
    }
  };

  useEffect(() => {
    // Filter objects based on input
    if (value.length > 0) {
      // Kombiniere vordefinierte, benutzerdefinierte und Objekte aus gespeicherten Berichten
      const allObjects = [...new Set([...commonObjects, ...customObjects, ...savedReportObjects])];
      const filteredObjects = allObjects.filter((object) =>
        object.toLowerCase().includes(value.toLowerCase()),
      );
      setSuggestions(filteredObjects.slice(0, 10)); // Limit auf 10 Vorschläge erhöht
    } else {
      // Zeige die häufigsten Objekte aus gespeicherten Berichten, wenn keine Eingabe vorhanden ist
      const topObjects = [...savedReportObjects, ...customObjects, ...commonObjects].slice(0, 10);
      setSuggestions(topObjects);
    }
  }, [value, customObjects, savedReportObjects]);

  useEffect(() => {
    // Close suggestions when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
  };

  const handleInputBlur = () => {
    // Wenn ein neuer Wert eingegeben wurde, speichere ihn
    if (value.trim() !== '') {
      saveNewObject(value);
    }
    // Verzögere das Ausblenden der Vorschläge, um Klicks zu ermöglichen
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className={className || "border-gray-300"}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-lg">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
