import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import changelog from "@/data/changelog.json";

const variantMap = {
  feature: "default",
  fix: "destructive",
  improvement: "secondary",
} as const;

export function WhatsNew() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>What's New</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[300px] overflow-y-auto space-y-4">
          {changelog.slice(0, 3).map((release) => (
            <div key={release.version}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-sm">v{release.version}</span>
                <span className="text-xs text-muted-foreground">
                  {release.date}
                </span>
              </div>
              <ul className="space-y-1.5">
                {release.entries.map((entry) => (
                  <li key={entry.text} className="flex items-center gap-2 text-sm">
                    <Badge variant={variantMap[entry.type as keyof typeof variantMap]}>
                      {entry.type}
                    </Badge>
                    <span>{entry.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
